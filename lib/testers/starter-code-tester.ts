import Logger from "../logger";
import BaseTester from "./base-tester";
import child_process from "child_process";
import Course from "../models/course";
import Language from "../models/language";
import util from "util";
import tmp from "tmp";
import fs from "fs";
import path from "path";
import YAML from "js-yaml";
import StarterCodeUncommenter from "../starter-code-uncommenter";
import LineWithCommentRemover from "../line-with-comment-remover";
import testScriptFile from "../scripts/test.sh" with { type: "file" };
import ShellCommandExecutor from "../shell-command-executor";
import Dockerfile from "../models/dockerfile";

const writeFile = util.promisify(fs.writeFile);

const exec = util.promisify(child_process.exec);
const readFile = util.promisify(fs.readFile);

export default class StarterCodeTester extends BaseTester {
  course: Course;
  language: Language;
  testerDir: string;
  _dockerfile?: Dockerfile;

  copiedStarterDir: string | undefined;

  constructor(course: Course, testerDir: string, language: Language) {
    super();
    this.course = course;
    this.testerDir = testerDir;
    this.language = language;
  }

  async doTest() {
    await this.dockerfile!.processContents();
    this.copiedStarterDir = await this.course.prepareRepositoryDirForLanguage(this.language, this.testerDir);

    Logger.logHeader(`Testing starter: ${this.course.slug}-${this.language.slug}`);

    if (!this.dockerfile) {
      throw new Error(`Expected a dockerfile to exist for ${this.slug}`);
    }

    const codecraftersYml = YAML.load(await readFile(`${this.copiedStarterDir}/codecrafters.yml`, "utf8")) as { language_pack: string };
    const expectedYamlLanguagePack = this.dockerfile.languagePackWithVersion;
    const actualYamlLanguagePack = codecraftersYml.language_pack;
    if (expectedYamlLanguagePack !== actualYamlLanguagePack) {
      throw new Error(`Expected .codecrafters.yml to have language_pack: ${expectedYamlLanguagePack}, but found ${actualYamlLanguagePack}`);
    }

    Logger.logInfo("Building image");
    await this.buildImage();

    Logger.logInfo("Executing starter repo script");

    // Precompilation can take a while on GitHub runners, so let's give this 60s
    if (this.course.slug === "shell") {
      await this.assertTimeUnder(60, this.assertScriptOutput.bind(this, "Test failed", 1));
    } else {
      await this.assertTimeUnder(60, this.assertScriptOutput.bind(this, "Logs from your program will appear here", 1));
    }

    Logger.logSuccess("Script output verified");

    // TODO: Is this still needed since we're doing restore after?
    // if (fs.existsSync(`${this.copiedStarterDir}/your_program.sh`)) {
    //   const diff = await ShellCommandExecutor.execute(`git -C ${this.copiedStarterDir} diff --exit-code your_program.sh`, {
    //     expectedExitCodes: [0, 1],
    //     shouldSuppressOutput: true,
    //   });

    //   if (diff.exitCode === 1) {
    //     await ShellCommandExecutor.execute(`git -C ${this.copiedStarterDir} add your_program.sh`);
    //     await ShellCommandExecutor.execute(`git -C ${this.copiedStarterDir} commit -m "Copy .codecrafters/run.sh -> your_program.sh"`);
    //   }
    // }

    Logger.logInfo("Checking if there are no uncommitted changes to compiled templates");

    if (process.env.CI === "true") {
      Logger.logInfo("Making starter repo directory owned by current user for checks");
      await ShellCommandExecutor.execute(`sudo chown -R $(id -u):$(id -g) ${this.copiedStarterDir}`); // Hack to fix GitHub actions permissions issue?
    }

    Logger.logInfo("Restoring changes to .sh files");
    await ShellCommandExecutor.execute(`git -C ${this.copiedStarterDir} restore *.sh`); // Hack to work around our precompilation step mangling .sh files

    Logger.logInfo("Removing test-runner & tester"); // We use this for the tester directories
    await ShellCommandExecutor.execute(`rm -rf ${this.copiedStarterDir}/test-runner`);
    await ShellCommandExecutor.execute(`rm -rf ${this.copiedStarterDir}/tester`);

    const diff = await ShellCommandExecutor.execute(`git -C ${this.copiedStarterDir} diff --exit-code`, {
      expectedExitCodes: [0, 1],
    });

    if (diff.exitCode === 0) {
      Logger.logSuccess("No uncommitted changes to compiled templates found.");
    } else {
      Logger.logInfo(`There are uncommitted changes to compiled templates in ${this.copiedStarterDir}:`);
      Logger.logInfo(diff.stdout);
      Logger.logError("Either commit these changes or add the files to .gitignore and try again.");
      process.exit(1);
    }

    Logger.logInfo("Checking if there are no untracked changes to compiled templates");

    const untrackedFiles = await ShellCommandExecutor.execute(`git -C ${this.copiedStarterDir} ls-files --others --exclude-standard`);

    if (untrackedFiles.stdout.trim() === "") {
      Logger.logSuccess("No untracked changes to compiled templates found.");
    } else {
      Logger.logInfo(`There are untracked changes to compiled templates in ${this.starterDir}:`);
      Logger.logInfo(untrackedFiles.stdout);
      Logger.logError("Please track these changes and try again.");

      throw new Error("TestFailedError");
    }

    Logger.logInfo("Uncommenting starter code...");

    const diffs = await new StarterCodeUncommenter(this.copiedStarterDir, this.language).uncomment();
    for (const diff of diffs) {
      if (diff.toString() === "") {
        Logger.logError("Expected uncommenting code to return a diff");
        Logger.logError("Are you sure there's a contiguous block of comments after the 'Uncomment this' marker?");
        return;
      }

      console.log("");
      diff.printToConsole();
      console.log("");
    }

    if (!(this.course.slug === "shell")) {
      const commentRemovalDiffs = await new LineWithCommentRemover(this.copiedStarterDir, this.language).process();
      for (const diff of commentRemovalDiffs) {
        if (diff.toString() === "") {
          Logger.logError("Expected removing logger line to return a diff");
          Logger.logError(
            `Are you sure there's a line that matches ${LineWithCommentRemover.LINE_MARKER_PATTERN} in any of these files: ${
              new LineWithCommentRemover(this.copiedStarterDir, this.language).codeFiles
            }?`
          );

          return;
        }
      }
    }

    if (process.env.CI === "true") {
      Logger.logInfo("Making starter repo directory owned by root for running tests again");
      await ShellCommandExecutor.execute(`sudo chown -R 0:0 ${this.copiedStarterDir}`); // Hack to fix GitHub actions permissions issue?
    }

    Logger.logInfo("Executing starter repo script with first stage uncommented");

    // Precompilation can take a while on GitHub runners, so let's give this 60s
    const timeTaken = await this.assertTimeUnder(60, this.assertScriptOutput.bind(this, "Test passed."));

    Logger.logSuccess(`Took ${timeTaken} secs`);
  }

  // Cache so that Dockerfile.processedContents is stored
  get dockerfile() {
    if (!this._dockerfile) {
      this._dockerfile = this.course.latestDockerfiles.find((dockerfile) => dockerfile.languagePack === this.languagePack);
    }

    return this._dockerfile;
  }

  get slug() {
    return `${this.course.slug}-${this.languagePack}`;
  }

  get languagePack() {
    return this.language.languagePack;
  }

  get starterDir() {
    return this.course.compiledStarterRepositoryDirForLanguage(this.language);
  }

  async buildImage() {
    const command = `docker build -t ${this.slug} -f ${this.dockerfile!.processedPath} ${this.copiedStarterDir}`;
    const expectedOutput = `naming to docker.io/library/${this.slug}`;
    await this.assertStderrContains(command, expectedOutput);
  }

  async assertScriptOutput(expectedOutput: string, expectedExitCode = 0) {
    // TODO: Using tmp.fileSync() here causes "Text file busy" errors on GitHub runners
    const testScriptPath = tmp.tmpNameSync();

    await writeFile(testScriptPath, fs.readFileSync(testScriptFile).toString());
    await exec(`chmod +x ${testScriptPath}`);
    await exec(`sync`); // Avoid "Text file busy" errors

    const command = [
      "docker run",
      "--rm",
      `-v '${testScriptPath}:/init.sh:ro'`,
      `-v '${this.copiedStarterDir}:/app'`,
      "-e CODECRAFTERS_REPOSITORY_DIR=/app",
      `-e CODECRAFTERS_TEST_CASES_JSON='[${this.course.firstStage.testerTestCaseJson}]'`,
      "-e TESTER_DIR=/var/opt/tester",
      "-w /app",
      "--memory=2g",
      "--cpus=0.5",
      `${this.slug} /init.sh`,
    ].join(" ");

    await this.assertStdoutContains(command, expectedOutput, expectedExitCode);
  }
}
