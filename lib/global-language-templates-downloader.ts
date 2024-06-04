import fs from "fs";
import path from "path";
import Language from "./models/language";
import ShellCommandExecutor from "./shell-command-executor";
import ansiColors from "ansi-colors";
import { LanguageTemplateNotAvailableError } from "./errors";

export default class GlobalLanguageTemplatesDownloader {
  language: Language;
  cacheDir: string;

  constructor(language: Language, cacheDir: string) {
    this.language = language;
    this.cacheDir = cacheDir;
  }

  async download(): Promise<string> {
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

  async executeGitCommand(command: string) {
    await ShellCommandExecutor.execute(command, { prefix: ansiColors.yellow("[git] "), shouldLogCommand: true });
  }
}
