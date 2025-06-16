import Mustache from "mustache";
import BaseCommand from "./base";
import Language from "../lib/models/language";
import Course from "../lib/models/course";
import { glob } from "glob";
import fs from "fs";
import path from "path";
import ansiColors from "ansi-colors";
import AddLanguageCommand from "./add-language";
import { execSync } from "child_process";

export default class UpgradeLanguageCommand extends BaseCommand {
  languageSlug: string;

  constructor(languageSlug: string) {
    super();
    this.languageSlug = languageSlug;
  }

  async doRun() {
    const course = Course.loadFromDirectory(process.cwd());
    const language = Language.findBySlug(this.languageSlug);

    if (!course.languages.map((l) => l.slug).includes(language.slug)) {
      throw new Error(`${language.slug} not found in starter_templates. Try running "course-sdk add-language ${language.slug}" instead.`);
    }

    const attributes = course.starterTemplateAttributesForLanguage(language);

    if (!attributes.user_editable_file) {
      throw new Error(
        `${language.slug}'s config.yml file doesn't include the "user_editable_file" key. Run "course-sdk add-language ${language.slug}" first instead.`
      );
    }

    const userEditableFile = attributes.user_editable_file;

    console.log("");
    console.log(`Running add-language command... (will revert changes to ${userEditableFile} after)`);
    console.log("");

    await new AddLanguageCommand(this.languageSlug).doRun();

    const filesToRevert = [userEditableFile, ...language.dependencyFiles];

    console.log("");
    filesToRevert.forEach((file) => {
      console.log(`Reverting changes to ${file}...`);
      execSync(`git checkout ${path.join(course.starterTemplatesDirForLanguage(language), file)}`);
      console.log("");
    });

    console.log(`Upgrade done! Run 'course-sdk test ${language.slug}' to verify.`);
  }
}
