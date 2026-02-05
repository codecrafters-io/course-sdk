import Course from "./models/course";
import ShellCommandExecutor from "./shell-command-executor";
import fs from "fs";
import path from "path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

export default class TesterDownloader {
  static DEFAULT_TESTERS_ROOT_DIR = "/tmp/testers";
  
  course: Course;
  testersRootDir: string;
  // Cache latest tester version
  private latestTesterVersion?: string;

  constructor(course: Course, testersRootDir?: string) {
    this.course = course;
    this.testersRootDir = testersRootDir || TesterDownloader.DEFAULT_TESTERS_ROOT_DIR;
  }

  static clearCache() {
    fs.rmSync(TesterDownloader.DEFAULT_TESTERS_ROOT_DIR, { recursive: true, force: true });
  }

  async downloadIfNeeded(): Promise<string> {
    this.latestTesterVersion = await this.fetchLatestTesterVersion();

    if (await fs.promises.exists(this.testerDir)) {
      return this.testerDir;
    }

    const compressedFilePath = path.join(this.testersRootDir, `${this.course.slug}-${this.latestTesterVersion}.tar.gz`);
    fs.mkdirSync(this.testersRootDir, { recursive: true });
    const artifactUrl = `https://github.com/${this.testerRepositoryName}/releases/download/${latestVersion}/${latestVersion}_linux_amd64.tar.gz`;
    console.log(`Downloading ${artifactUrl}`);

    const response = await fetch(artifactUrl);
    if (!response.ok) {
      throw new Error(`Failed to download tester. Status: ${response.status}. Response: ${await response.text()}`);
    }

    const streamPipeline = promisify(pipeline);
    await streamPipeline(response.body as any, fs.createWriteStream(compressedFilePath));

    try {
      const tempExtractDir = fs.mkdtempSync("/tmp/extract");
      await ShellCommandExecutor.execute(`tar xf ${compressedFilePath} -C ${tempExtractDir}`);
      fs.unlinkSync(compressedFilePath);
      fs.renameSync(tempExtractDir, this.testerDir);
    } catch (error) {
      console.error("Error extracting tester", error);
      process.exit(1);
    }

    return this.testerDir;
  }

  async fetchLatestTesterVersion() {
    const response = await fetch(`https://api.github.com/repos/${this.testerRepositoryName}/releases/latest`, {
      headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {},
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch latest tester version. Status: ${response.status}. Response: ${await response.text()}`);
    }

    const tagName = (await response.json()).tag_name;

    if (!tagName) {
      throw new Error(`Failed to fetch latest tester version. No tag name found in response: ${await response.text()}`);
    }

    return tagName;
  }

  get testerDir() {
    if (!this.latestTesterVersion) {
      throw new Error("Must call downloadIfNeeded() before accessing testerDir");
    }
    return this.getTesterDirFromVersion(this.latestTesterVersion)
  }

  private getTesterDirFromVersion(version: string) {
    return path.join(this.testersRootDir, `${this.course.slug}-${version}`);
  }

  get testerRepositoryName() {
    return `codecrafters-io/${this.course.slug}-tester`;
  }
}
