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

    // const fileStream = fs.createWriteStream(compressedFilePath);
    // const latestVersion = await this.latestTesterVersion();
    // const artifactUrl = `https://github.com/${this.testerRepositoryName}/releases/download/${latestVersion}/${latestVersion}_linux_amd64.tar.gz`;
    const artifactUrl = `http://localhost:6661/`;
    console.log(`Downloading ${artifactUrl}`);

    const response = await fetch(artifactUrl);
    // console.log("Response headers:", response.headers.raw());
    // console.log("");
    console.log(`Response status code: ${response.status}`);
    console.log("");

    console.log("before await");

    await new Promise((resolve, reject) => {
      console.log("inside callback");

      function logEventAndResolve(event: string) {
        return () => {
          console.log(`event: ${event} (will resolve)`);
          resolve(null);
        };
      }

      function logEventAndReject(event: string) {
        return () => {
          console.log(`event: ${event} (will reject)`);
          reject(new Error(`Error downloading tester: ${event}`));
        };
      }

      function logEvent(event: string) {
        return () => {
          console.log(`event: ${event}`);
        };
      }

      response.body.on("error", logEventAndReject("response_error"));
      response.body.on("finish", logEventAndResolve("response_finish"));
      response.body.on("close", logEvent("response_close"));
      response.body.on("drain", logEvent("response_drain"));
      response.body.on("open", logEvent("response_open"));
      response.body.on("pipe", logEvent("response_pipe"));
      response.body.on("ready", logEvent("response_ready"));
      response.body.on("unpipe", logEvent("response_unpipe"));
      response.body.on("end", logEvent("response_end"));

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
