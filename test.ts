import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import ShellCommandExecutor from "./lib/shell-command-executor";

const compressedFilePath = path.join("/tmp/testers", `test.tar.gz`);

if (fs.existsSync(compressedFilePath)) {
  fs.unlinkSync(compressedFilePath);
  console.log(`Removed existing file: ${compressedFilePath}`);
}

if (fs.existsSync("/tmp/testers/test")) {
  fs.rmSync("/tmp/testers/test", { recursive: true, force: true });
  console.log(`Removed existing directory: /tmp/testers/test`);
}


fs.mkdirSync("/tmp/testers", { recursive: true });

const fileStream = fs.createWriteStream(compressedFilePath);
const latestVersion = "v54";
const artifactUrl = `https://github.com/codecrafters-io/sqlite-tester/releases/download/${latestVersion}/${latestVersion}_linux_amd64.tar.gz`;
console.log(`Downloading ${artifactUrl}`);

const response = await fetch(artifactUrl);
console.log('Response headers:', response.headers.raw());
console.log(`Response status code: ${response.status}`);

response.body.pipe(fileStream);

await new Promise((resolve, reject) => {
  fileStream.on("finish", resolve);
  fileStream.on("error", reject);
});

try {
  const tempExtractDir = fs.mkdtempSync("/tmp/extract");
  await ShellCommandExecutor.execute(`tar xf ${compressedFilePath} -C ${tempExtractDir}`);
  fs.unlinkSync(compressedFilePath);
  fs.renameSync(tempExtractDir, "/tmp/testers/test");
} catch (error) {
  console.error("Error extracting tester", error);
  process.exit(1);
}
