import Course from "./models/course";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import child_process from "child_process";
import ShellCommandExecutor from "./shell-command-executor";

export default class TesterDownloader {
  static DEFAULT_TESTERS_ROOT_DIR = "/tmp/testers";

  course: Course;
  testersRootDir: string;

  constructor(course: Course, testersRootDir?: string) {
    this.course = course;
    this.testersRootDir = testersRootDir || TesterDownloader.DEFAULT_TESTERS_ROOT_DIR;
  }

  static clearCache() {
    fs.rmSync(TesterDownloader.DEFAULT_TESTERS_ROOT_DIR, { recursive: true, force: true });
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
    console.log("Response headers:", response.headers.raw());
    console.log("");
    console.log(`Response status code: ${response.status}`);
    console.log("");

    console.log("before pipe");
    response.body.pipe(fileStream);
    console.log("after pipe");

    console.log("before await");

    await new Promise((resolve, reject) => {
      console.log("inside callback");

      function logEvent(event: string) {
        return () => {
          console.log(`event: ${event}`);
        };
      }

      // fileStream.on("finish", resolve);
      // fileStream.on("error", reject);

      fileStream.on("close", logEvent("close"));
      fileStream.on("drain", logEvent("drain"));
      fileStream.on("error", logEvent("error"));
      fileStream.on("finish", logEvent("finish"));
      fileStream.on("open", logEvent("open"));
      fileStream.on("pipe", logEvent("pipe"));
      fileStream.on("ready", logEvent("ready"));
      fileStream.on("unpipe", logEvent("unpipe"));

      console.log("callback listeners added");
    });

    console.log("after await");

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

  async latestTesterVersion() {
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
    return path.join(this.testersRootDir, this.course.slug);
  }

  get testerRepositoryName() {
    return `codecrafters-io/${this.course.slug}-tester`;
  }
}
