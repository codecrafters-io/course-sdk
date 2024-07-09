import { expect, test } from "bun:test";
import TesterDownloader from "./tester-downloader";
import Course from "./models/course";
import fs from "fs";

test("downloadIfNeeded", async () => {
  const course = new Course("redis", "dummy", "dummy", [], "dummy");
  await new TesterDownloader(course).downloadIfNeeded();

  expect(fs.existsSync("/tmp/testers/redis")).toBe(true);
  expect(fs.existsSync("/tmp/testers/redis/test.sh")).toBe(true);
});
