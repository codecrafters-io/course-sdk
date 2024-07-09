import Course from "./models/course";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import child_process from "child_process";
import ShellCommandExecutor from "./shell-command-executor";

export default class TesterDownloader {
  course: Course;
  testersRootDir: string;

  constructor(course: Course, testersRootDir: string) {
    this.course = course;
    this.testersRootDir = testersRootDir;
  }

  async downloadIfNeeded(): Promise<string> {
    if (await fs.promises.exists(this.testerDir)) {
      return this.testerDir;
    }

    const compressedFilePath = path.join(this.testersRootDir, `${this.course.slug}.tar.gz`);

    fs.mkdirSync(this.testersRootDir, { recursive: true });

    const fileStream = fs.createWriteStream(compressedFilePath);
    const latestVersion = await this.latestTesterVersion();
    const artifactUrl = `https://github.com/${this.testerRepositoryName}/releases/download/${latestVersion}/${latestVersion}_linux_amd64.tar.gz`;
    console.log(`Downloading ${artifactUrl}`);

    const response = await fetch(artifactUrl);
    response.body.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    try {
      const tempExtractDir = fs.mkdtempSync("/tmp/extract");
      await ShellCommandExecutor.execute(`tar xf ${compressedFilePath} -C ${tempExtractDir}`);
      fs.renameSync(tempExtractDir, this.testerDir);
    } catch (error) {
      console.error("Error extracting tester", error);
    }

    fs.unlinkSync(compressedFilePath);

    return this.testerDir;
  }

  async latestTesterVersion() {
    const response = await fetch(`https://api.github.com/repos/${this.testerRepositoryName}/releases/latest`, {
      headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {},
    });

    return (await response.json()).tag_name;
  }

  get testerDir() {
    return path.join(this.testersRootDir, this.course.slug);
  }

  get testerRepositoryName() {
    return `codecrafters-io/${this.course.slug}-tester`;
  }
}
