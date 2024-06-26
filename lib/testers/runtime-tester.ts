import Logger from "../logger";
import BaseTester from "./base-tester";
import child_process from "child_process";
import Course from "../models/course";
import Language from "../models/language";
import util from "util";
import tmp from "tmp";
import Dockerfile from "../models/dockerfile";

const exec = util.promisify(child_process.exec);

export default class RuntimeTester extends BaseTester {
  course: Course;
  dockerfile: Dockerfile;
  copiedStarterDir: string | undefined;
  commandToExecute: string;
  outputStreamType: string;
  expectedOutput: string;

  constructor(course: Course, dockerfile: Dockerfile, commandToExecute: string, outputStreamType: string, expectedOutput: string) {
    super();
    this.course = course;
    this.dockerfile = dockerfile;
    this.commandToExecute = commandToExecute;
    this.outputStreamType = outputStreamType;
    this.expectedOutput = expectedOutput;
  }

  get language() {
    return Language.findByLanguagePack(this.dockerfile.languagePackWithVersion);
  }

  async doTest() {
    this.copiedStarterDir = tmp.dirSync().name;
    await exec(`rm -rf ${this.copiedStarterDir}`);
    await exec(`cp -r ${this.starterDir} ${this.copiedStarterDir}`);

    Logger.logHeader(`Testing Runtime for Dockerfile: ${this.slug}`);

    this.buildImageAndRunInside(this.commandToExecute, this.outputStreamType, this.expectedOutput);

    Logger.logInfo("");
  }

  async buildImageAndRunInside(commandToExecute: string, outputStreamType: string, expectedOutput: string) {
    Logger.logInfo(`Building ${this.dockerfile.languagePackWithVersion} image`);
    const command = `docker build -t ${this.slug} -f ${this.dockerfile.path} ${this.copiedStarterDir}`;    
    await this.assertStdoutContains(command, "");

    Logger.logInfo(`Executing command: \`${commandToExecute}\` inside the container`)
    const testCommand = `docker run --rm ${this.slug} ${commandToExecute}`;

    // outputStreamType is either "stdout" or "stderr"
    if (outputStreamType === "stdout") {
      await this.assertStdoutContains(testCommand, expectedOutput);
    } else if (outputStreamType === "stderr") {
      await this.assertStderrContains(testCommand, expectedOutput);
    } else {
      throw new Error(`Invalid outputStreamType: ${outputStreamType}`);
    }

    Logger.logSuccess(`Found Expected output: \`${expectedOutput}\``);
  }

  get slug() {
    return `${this.course.slug}-${this.dockerfile.languagePackWithVersion}`;
  }

  get starterDir() {
    return `${this.course.compiledStarterRepositoriesDir}/${this.language.slug}`;
  }
}
