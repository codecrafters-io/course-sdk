import Logger from "../logger";
import BaseTester from "./base-tester";
import child_process from "child_process";
import Course from "../models/course";
import Language from "../models/language";
import util from "util";
import tmp from "tmp";
import Dockerfile from "../models/dockerfile";

const exec = util.promisify(child_process.exec);
// const writeFile = util.promisify(fs.writeFile);

export default class DockerfileTester extends BaseTester {
  course: Course;
  dockerfile: Dockerfile;
  copiedStarterDir: string | undefined;

  constructor(course: Course, dockerfile: Dockerfile) {
    super();
    this.course = course;
    this.dockerfile = dockerfile;
  }

  get language() {
    return Language.findByBuildpack(this.dockerfile.buildpackWithVersion);
  }

  async doTest() {
    Logger.logHeader(`Testing Dockerfile: ${this.slug}`);

    await this.dockerfile.processContents();
    this.copiedStarterDir = await this.course.prepareRepositoryDirForLanguage(this.language);

    Logger.logInfo(`Building ${this.dockerfile.buildpackWithVersion} image without cache`);
    const timeTaken = await this.assertTimeUnder(400, this.buildImage.bind(this));

    Logger.logInfo(`Took ${timeTaken} secs`);
    Logger.logInfo("");

    Logger.logInfo(`Building ${this.dockerfile.buildpackWithVersion} image with cache`);
    const timeTakenWithCache = await this.assertTimeUnder(5, this.buildImage.bind(this));

    Logger.logSuccess(`Took ${timeTakenWithCache} secs`);
  }

  async buildImage() {
    const command = `docker build -t ${this.slug} -f ${this.dockerfile.processedPath} ${this.copiedStarterDir}`;
    const expectedOutput = `naming to docker.io/library/${this.slug}`;
    await this.assertStderrContains(command, expectedOutput);
  }

  get slug() {
    return `${this.course.slug}-${this.dockerfile.buildpackWithVersion}`;
  }

  get starterDir() {
    return `${this.course.compiledStarterRepositoryDirForLanguage(this.language)}`;
  }
}
