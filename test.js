import { pipeline } from "node:stream";
import { promisify } from "node:util";
import fs from "fs";
import os from "os";
import path from "path";

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
await streamPipeline(response.body, fs.createWriteStream(tempFilePath));
console.log("after await");


process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});
