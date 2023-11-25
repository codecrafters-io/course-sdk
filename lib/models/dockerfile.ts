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

  get languagePack() {
    return this.filename.replace(/\.Dockerfile$/, "");
  }

  get language() {
    const slug = this.filename.split("-")[0];

    if (slug === null) {
      throw new Error(`Dockerfile path ${this.path} does not match expected format`);
    }

    return Language.findByLanguagePack(slug);
  }

  semver(): semver.SemVer {
    const versionString = this.languagePack.replace(`${this.language.slug}-`, "");

    if (semver.coerce(versionString) === null) {
      throw new Error(`Dockerfile path ${this.path} does not match expected format`);
    }

    return semver.coerce(versionString) as semver.SemVer;
  }
}
