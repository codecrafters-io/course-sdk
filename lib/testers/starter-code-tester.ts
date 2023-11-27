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
import testScriptFile from "../scripts/test.sh";

const writeFile = util.promisify(fs.writeFile);

const exec = util.promisify(child_process.exec);
const readFile = util.promisify(fs.readFile);

export default class StarterCodeTester extends BaseTester {
  course: Course;
  language: Language;
  testerDir: string;

  copiedStarterDir: string | undefined;

  constructor(course: Course, testerDir: string, language: Language) {
    super();
    this.course = course;
    this.testerDir = testerDir;
    this.language = language;
  }

  async doTest() {
    this.copiedStarterDir = tmp.dirSync().name;
    await exec(`rm -rf ${this.copiedStarterDir}`);
    await exec(`cp -r ${this.starterDir} ${this.copiedStarterDir}`);

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
    await this.assertTimeUnder(60, this.assertScriptOutput.bind(this, "Logs from your program will appear here", 1));

    Logger.logSuccess("Script output verified");

    Logger.logInfo("Checking if there are no uncommitted changes to compiled templates");

    // Not sure if this is required
    // const ensureSafeDirectoryCommand = "git config --global --add safe.directory /course-sdk/" + this.course.dir;
    // await exec(ensureSafeDirectoryCommand);

    const diff = await exec(`git -C ${this.starterDir} diff --exit-code`);

    if (diff.stdout.trim() === "") {
      Logger.logSuccess("No uncommitted changes to compiled templates found.");
    } else {
      Logger.logInfo(`There are uncommitted changes to compiled templates in ${this.starterDir}:`);
      Logger.logInfo(diff.stdout);
      Logger.logError("Please commit these changes and try again.");

      throw new Error("TestFailedError");
    }

    Logger.logInfo("Checking if there are no untracked changes to compiled templates");

    const listUntrackedFilesCommand = "git -C " + this.starterDir + " ls-files --others --exclude-standard";
    const untrackedFiles = await exec(listUntrackedFilesCommand);

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

    Logger.logInfo("Executing starter repo script with first stage uncommented");

    // Precompilation can take a while on GitHub runners, so let's give this 60s
    const timeTaken = await this.assertTimeUnder(60, this.assertScriptOutput.bind(this, "Test passed."));

    Logger.logSuccess(`Took ${timeTaken} secs`);
  }

  get dockerfile() {
    return this.course.latestDockerfiles.find((dockerfile) => dockerfile.languagePack === this.languagePack);
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
    const command = `docker build -t ${this.slug} -f ${this.dockerfile!.path} ${this.copiedStarterDir}`;
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
      `-v '${this.copiedStarterDir}:/app'`,
      `-v '${path.resolve(this.testerDir)}:/tester:ro'`,
      `-v '${testScriptPath}:/init.sh:ro'`,
      "-e CODECRAFTERS_SUBMISSION_DIR=/app",
      `-e CODECRAFTERS_TEST_CASES_JSON='[${this.course.firstStage.testerTestCaseJson}]'`,
      `-e CODECRAFTERS_CURRENT_STAGE_SLUG=${this.course.firstStage.slug}`, // TODO: Remove this
      "-e TESTER_DIR=/tester",
      "-w /app",
      "--memory=2g",
      "--cpus=0.5",
      `${this.slug} /init.sh`,
    ].join(" ");

    await this.assertStdoutContains(command, expectedOutput, expectedExitCode);
  }
}
