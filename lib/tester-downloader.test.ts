import { expect, test } from "bun:test";
import TesterDownloader from "./tester-downloader";
import Course from "./models/course";
import fs from "fs";

test("downloadIfNeeded", async () => {
  const course = new Course("redis", "dummy", "dummy", [], "dummy");
  const testerDir = await new TesterDownloader(course).downloadIfNeeded();
  
  // TODO: I'll remove this comment after PR review
  // The testerDir is dependent on the latest available tester version,
  // Right now we're just testing against the result from the function itself
  // We cannot hardcode testerDir as before, what would be a good way to test this? 
  // Or should I leave this as it is?
  expect(fs.existsSync(testerDir)).toBe(true);
  expect(fs.existsSync(`${testerDir}/test.sh`)).toBe(true);
});