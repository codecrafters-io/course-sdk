import { expect, test } from "bun:test";
import TesterDownloader from "./tester-downloader";
import Course from "./models/course";
import fs from "fs";

test("downloadIfNeeded", async () => {
  const course = new Course("redis", "dummy", "dummy", [], "dummy");
  const downloader = new TesterDownloader(course);

  // Independently fetch the latest version to compute expected path
  const latestVersion = await downloader.fetchLatestTesterVersion();
  const expectedTesterDir = `/tmp/testers/${course.slug}-${latestVersion}`;

  const testerDir = await downloader.downloadIfNeeded();

  // Verify the returned path matches the independently computed expected path
  expect(testerDir).toBe(expectedTesterDir);
  expect(fs.existsSync(testerDir)).toBe(true);
  expect(fs.existsSync(`${testerDir}/test.sh`)).toBe(true);
});