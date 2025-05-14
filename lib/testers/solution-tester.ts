import child_process from "child_process";
import fs from "fs";
import YAML from "js-yaml";
import path from "path";
import tmp from "tmp";
import util from "util";
import BaseTester from "./base-tester";
import Logger from "../logger";
import Course from "../models/course";
import Dockerfile from "../models/dockerfile";
import Language from "../models/language";
import CourseStage from "../models/course-stage";
// @ts-ignore
import testScriptFile from "../scripts/test.sh";

const exec = util.promisify(child_process.exec);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

export default class SolutionTester extends BaseTester {
  language: Language;

  private copiedCodeDir: string | undefined;
  private course: Course;
  private solutionsDir: string;
  private testerDir: string;
  private _dockerfile?: Dockerfile;

  constructor(course: Course, testerDir: string, language: Language) {
    super();
    this.course = course;
    this.testerDir = testerDir;
    this.language = language;
    this.solutionsDir = path.join(this.course.solutionsDir, this.language.slug);
  }

  async doTest() {
    Logger.logHeader(`Testing solutions: ${this.slug}`);

    if (!fs.existsSync(this.solutionsDir)) {
      throw new Error(`No solutions directory found at ${this.solutionsDir}.`);
    }

    if (!this.dockerfile) {
      throw new Error(`Expected a dockerfile to exist for ${this.slug}.`);
    }
    await this.dockerfile.processContents();

    const solutionDirs = fs.readdirSync(this.solutionsDir);
    for (const solutionDir of solutionDirs) {
      if (solutionDir === ".DS_Store") {
        continue;
      }

      const stage = this.findCourseStage(solutionDir);
      if (!stage) {
        throw new Error(`The solution directory "${solutionDir}" is not a valid stage.`);
      }

      await this.testStageSolution(stage);
    }
  }

  // Cache so that Dockerfile.processedContents is stored
  private get dockerfile() {
    if (!this._dockerfile) {
      this._dockerfile = this.course.latestDockerfiles.find((dockerfile) => dockerfile.languagePack === this.languagePack);
    }

    return this._dockerfile;
  }

  private get languagePack() {
    return this.language.languagePack;
  }

  private get slug() {
    return `${this.course.slug}-${this.language.slug}`;
  }

  private async assertScriptOutput(stage: CourseStage, expectedOutput: string, expectedExitCode = 0) {
    // TODO: Using tmp.fileSync() here causes "Text file busy" errors on GitHub runners
    const testScriptPath = tmp.tmpNameSync();

    await writeFile(testScriptPath, fs.readFileSync(testScriptFile).toString());
    await exec(`chmod +x ${testScriptPath}`);
    await exec(`sync`); // Avoid "Text file busy" errors

    const command = [
      "docker run",
      "--rm",
      `-v '${testScriptPath}:/init.sh:ro'`,
      `-v '${this.copiedCodeDir}:/app'`,
      "-e CODECRAFTERS_REPOSITORY_DIR=/app",
      `-e CODECRAFTERS_TEST_CASES_JSON='[${stage.testerTestCaseJson}]'`,
      "-e TESTER_DIR=/var/opt/tester",
      "-w /app",
      "--memory=2g",
      "--cpus=0.5",
      `${this.slug} /init.sh`,
    ].join(" ");

    await this.assertStdoutContains(command, expectedOutput, expectedExitCode);
  }

  private async buildImage(copiedCodeDir: string) {
    const command = `docker buildx -t ${this.slug} -f ${this.dockerfile!.processedPath} ${copiedCodeDir}`;
    const expectedOutput = `naming to docker.io/library/${this.slug}`;
    await this.assertStderrContains(command, expectedOutput);
  }

  private findCourseStage(solutionDir: string) {
    return this.course.stages.find((stage) => stage.solutionDir === solutionDir);
  }

  private async testStageSolution(stage: CourseStage) {
    const codeDir = path.join(this.solutionsDir, stage.solutionDir, "code");
    this.copiedCodeDir = await this.course.prepareRepositoryDirForLanguage(this.language, this.testerDir, codeDir);

    const codecraftersYml = YAML.load(await readFile(`${this.copiedCodeDir}/codecrafters.yml`, "utf8")) as { language_pack: string };
    const expectedYamlLanguagePack = this.dockerfile!.languagePackWithVersion;
    const actualYamlLanguagePack = codecraftersYml.language_pack;
    if (expectedYamlLanguagePack !== actualYamlLanguagePack) {
      throw new Error(
        `Expected .codecrafters.yml to have language_pack: ${expectedYamlLanguagePack}, but found ${actualYamlLanguagePack}.`
      );
    }

    Logger.logInfo(`Building image for stage ${stage.solutionDir}`);
    await this.buildImage(this.copiedCodeDir);

    Logger.logInfo(`Testing solution for stage ${stage.solutionDir}`);
    // Precompilation can take a while on GitHub runners, so let's give this 60s
    const timeTaken = await this.assertTimeUnder(60, this.assertScriptOutput.bind(this, stage, "Test passed."));
    Logger.logSuccess(`Took ${timeTaken} secs\n`);
  }
}
