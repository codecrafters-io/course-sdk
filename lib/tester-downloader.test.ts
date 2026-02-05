import { expect, test } from "bun:test";
import TesterDownloader from "./tester-downloader";
import Course from "./models/course";
import fs from "fs";

test("downloadIfNeeded", async () => {
  const course = new Course("redis", "dummy", "dummy", [], "dummy");
  const testerDir = await new TesterDownloader(course).downloadIfNeeded();
  
  expect(fs.existsSync(testerDir)).toBe(true);
  expect(fs.existsSync(`${testerDir}/test.sh`)).toBe(true);
});