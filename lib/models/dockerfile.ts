import Language from "./language";
import semver from "semver";
import path from "path";
import fs from "fs";
import tmp from "tmp";
import { InvalidDockerfileContentsError } from "../errors";

export default class Dockerfile {
  path: string;
  _processedContentsCache?: string;

  constructor(path: string) {
    this.path = path;
  }

  get contents(): string {
    return fs.readFileSync(this.path, "utf8");
  }

  get dependencyFilePaths(): string[] {
    const matchResult = this.contents.match(/^ENV CODECRAFTERS_DEPENDENCY_FILE_PATHS="([^"]+)"$/m);
    if (!matchResult) {
      return []; // As of 2025-06-18, Odin and PHP don't have dependency files
    }

    return matchResult[1]
      .split(/[,\s]+/)
      .map((path) => path.trim())
      .filter((path) => path.length > 0);
  }

  get filename() {
    return path.basename(this.path);
  }

  get languagePackWithVersion() {
    return this.filename.replace(/\.Dockerfile$/, "");
  }

  get languagePack() {
    return this.languagePackWithVersion.split("-")[0];
  }

  get language() {
    if (this.languagePack === null) {
      throw new Error(`Dockerfile path ${this.path} does not match expected format`);
    }

    return Language.findByLanguagePack(this.languagePack);
  }

  get processedContents(): string {
    if (!this._processedContentsCache) {
      throw new Error("processContents was not called!");
    }

    return this._processedContentsCache;
  }

  get processedPath(): string {
    const tmpFile = tmp.fileSync({ postfix: ".Dockerfile" });
    fs.writeFileSync(tmpFile.name, this.processedContents);

    return tmpFile.name;
  }

  get semver(): semver.SemVer {
    const versionString = this.languagePackWithVersion.replace(`${this.language.slug}-`, "");

    if (semver.coerce(versionString) === null) {
      throw new Error(`Dockerfile path ${this.path} does not match expected format`);
    }

    return semver.coerce(versionString) as semver.SemVer;
  }

  async processContents() {
    const response = await fetch("https://backend.codecrafters.io/services/course_sdk/process_dockerfile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dockerfile_contents: this.contents,
      }),
    });

    if (response.status == 422) {
      throw new InvalidDockerfileContentsError(await response.text());
    }

    if (response.status !== 200) {
      throw new Error(`Failed to process Dockerfile. Status: ${response.status}, Response: ${await response.text()}`);
    }

    const responseBody = (await response.json()) as { dockerfile_contents: string };
    this._processedContentsCache = responseBody.dockerfile_contents;
  }
}
