import BaseCommand from "./base";
import Language from "../lib/models/language";

export default class AddLanguageCommand extends BaseCommand {
  languageSlug: string;

  constructor(languageSlug: string) {
    super();
    this.languageSlug = languageSlug;
  }

  async doRun() {
    const language = Language.findBySlug(this.languageSlug);

    if (!language) {
      console.error(
        `Language with slug ${this.languageSlug} not found. Available slugs: ${Language.all()
          .map((l) => l.slug)
          .join(", ")}`
      );
      process.exit(1);
    }

    console.log(`Adding language ${language.name}`);
  }
}
