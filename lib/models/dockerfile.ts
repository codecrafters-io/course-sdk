import Language from "./language";
import semver from "semver";
import path from "path";

export default class Dockerfile {
  path: string;

  constructor(path: string) {
    this.path = path;
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

  semver(): semver.SemVer {
    const versionString = this.languagePackWithVersion.replace(`${this.language.slug}-`, "");

    if (semver.coerce(versionString) === null) {
      throw new Error(`Dockerfile path ${this.path} does not match expected format`);
    }

    return semver.coerce(versionString) as semver.SemVer;
  }
}
