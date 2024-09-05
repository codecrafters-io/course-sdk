import Course from "./lib/models/course";
import TesterDownloader from "./lib/tester-downloader";

import { pipeline } from "node:stream";
import { promisify } from "node:util";
import fs from "fs";
import os from "os";
import path from "path";

TesterDownloader.clearCache(); // Wip first

async function test1() {
  const course = Course.loadFromDirectory(process.cwd());
  const testerDownloader = new TesterDownloader(course);
  console.log("Before download");
  await testerDownloader.downloadIfNeeded();
  console.log("Download done");
}

async function test2() {
  const artifactUrl = `http://localhost:6661/`;
  console.log(`Downloading ${artifactUrl}`);

  const response = await fetch(artifactUrl);

  if (!response.ok) {
    throw new Error(`Failed to download tester. Status: ${response.status}. Response: ${await response.text()}`);
  }

  const streamPipeline = promisify(pipeline);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "download-"));
  const tempFilePath = path.join(tempDir, "downloaded-file");

  console.log("before await");
  await streamPipeline(response.body as any, fs.createWriteStream(tempFilePath));
  console.log("after await");
}

// await test1();
await test2();
