import StarterTemplateCompiler from "../lib/compilers/starter-template-compiler";
import Course from "../lib/models/course";
import BaseCommand from "./base";

export default class CompileCommand extends BaseCommand {
  languageFilter: string; // Can be empty string

  constructor(languageFilter: string) {
    super();
    this.languageFilter = languageFilter;
  }

  doRun() {
    const course = Course.loadFromDirectory(process.cwd());

    const compilers = [
      new StarterTemplateCompiler(course),
      // new FirstStageSolutionsCompiler(course),
      // new FirstStageExplanationsCompiler(course),
      // new SolutionDiffsCompiler(course),
    ];

    if (this.#languageSlugsToFilter.length === 0) {
      console.log("Compiling all languages...");

      for (const compiler of compilers) {
        compiler.compileAll();
      }
    } else {
      if (this.#languageSlugsToFilter.length === 1) {
        console.log(`Compiling language: ${this.#languageSlugsToFilter[0]}...`);
      } else {
        console.log(
          `Compiling languages: ${this.#languageSlugsToFilter.join(", ")}...`
        );
      }

      console.error("Filtering is not supported yet!");
      // const language = Language.find_by_slug!(language_filter)
      // compilers.each { |compiler| compiler.compile_for_language(language) }
    }
  }

  get #languageSlugsToFilter() {
    return this.languageFilter
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }
}
