import { expect, test } from "bun:test";
import TesterDownloader from "./tester-downloader";
import Course from "./models/course";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

// Release downloads select the Linux amd64 asset and request its binary API representation.
test("download the matching release asset through GitHub's API", async () => {
  // Arrange
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tester-api-"));
  const source = path.join(directory, "source");
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, "test.sh"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const archive = path.join(directory, "tester.tar.gz");
  execFileSync("tar", ["czf", archive, "-C", source, "test.sh"]);
  const originalFetch = globalThis.fetch;
  const calls: { url: string; accept: string | null }[] = [];
  globalThis.fetch = (async (url, options) => {
    calls.push({ url: String(url), accept: new Headers(options?.headers).get("Accept") });
    return calls.length === 1
      ? Response.json({
          tag_name: "v3",
          assets: [
            { name: "v3_linux_arm64.tar.gz", url: "https://api.github.com/assets/arm64" },
            { name: "v3_linux_amd64.tar.gz", url: "https://api.github.com/assets/amd64" },
          ],
        })
      : new Response(fs.readFileSync(archive));
  }) as typeof fetch;
  const downloader = new TesterDownloader(new Course("firewall", "dummy", "dummy", [], "dummy"), path.join(directory, "cache"));
  try {
    // Act
    const result = await downloader.downloadIfNeeded();
    // Assert
    expect(calls[1]).toEqual({ url: "https://api.github.com/assets/amd64", accept: "application/octet-stream" });
    expect(fs.readFileSync(path.join(result, "test.sh"), "utf8")).toBe("#!/bin/sh\nexit 0\n");
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

// Missing release artifacts fail explicitly rather than guessing a download URL.
test("report a missing Linux amd64 release asset", async () => {
  // Arrange
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tester-missing-"));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ tag_name: "v3", assets: [] })) as typeof fetch;
  const downloader = new TesterDownloader(new Course("firewall", "dummy", "dummy", [], "dummy"), directory);
  try {
    // Act
    const result = downloader.downloadIfNeeded();
    // Assert
    await expect(result).rejects.toThrow("Latest tester release is missing v3_linux_amd64.tar.gz");
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
