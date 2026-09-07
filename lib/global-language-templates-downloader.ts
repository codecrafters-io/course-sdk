import fs from "fs";
import path from "path";
import Language from "./models/language";
import ShellCommandExecutor from "./shell-command-executor";
import ansiColors from "ansi-colors";
import { LanguageTemplateNotAvailableError } from "./errors";

export default class GlobalLanguageTemplatesDownloader {
  static DEFAULT_CACHE_DIR = "/tmp/course-sdk-glt-cache";

  language: Language;
  cacheDir: string;

  constructor(language: Language, cacheDir?: string) {
    this.language = language;
    this.cacheDir = cacheDir || GlobalLanguageTemplatesDownloader.DEFAULT_CACHE_DIR;
  }

  static clearCache() {
    fs.rmSync(GlobalLanguageTemplatesDownloader.DEFAULT_CACHE_DIR, { recursive: true, force: true });
  }

  async download(): Promise<string> {
    // Escape hatch for working against a local checkout: useful when developing
    // templates, and required when a course needs to pick up a templates change
    // that hasn't been merged to main yet.
    if (process.env.COURSE_SDK_LANGUAGE_TEMPLATES_REPO) {
      return await this.useLocalRepository(process.env.COURSE_SDK_LANGUAGE_TEMPLATES_REPO);
    }

    const repositoryPath = path.join(this.cacheDir, "repo");
    const languageDir = path.join(repositoryPath, "languages", this.language.slug);

    if (await fs.promises.exists(repositoryPath)) {
      await this.executeGitCommand(`git -C ${repositoryPath} fetch origin`);
      await this.executeGitCommand(`git -C ${repositoryPath} reset --hard origin/main`);
    } else {
      await fs.promises.mkdir(path.dirname(repositoryPath), { recursive: true });
      await this.executeGitCommand(`git clone https://github.com/codecrafters-io/language-templates ${repositoryPath}`);
    }

    if (!(await fs.promises.exists(languageDir))) {
      throw new LanguageTemplateNotAvailableError(this.language);
    }

    return languageDir;
  }

  async useLocalRepository(repositoryPath: string): Promise<string> {
    const languageDir = path.join(repositoryPath, "languages", this.language.slug);

    if (!(await fs.promises.exists(languageDir))) {
      throw new LanguageTemplateNotAvailableError(this.language);
    }

    console.log(`${ansiColors.yellow("[local]")} Using language templates from ${repositoryPath}`);

    return languageDir;
  }

  async executeGitCommand(command: string) {
    await ShellCommandExecutor.execute(command, { prefix: ansiColors.yellow("[git] "), shouldLogCommand: true });
  }
}
