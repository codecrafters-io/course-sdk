import FirstStageSolutionsCompiler from "../lib/compilers/first-stage-solutions-compiler";
import ManualSolutionsCompiler from "../lib/compilers/manual-solutions-compiler";
import SolutionDiffsCompiler from "../lib/compilers/solution-diffs-compiler";
import StarterTemplateCompiler from "../lib/compilers/starter-template-compiler";
import DockerShellCommandExecutor from "../lib/docker-shell-command-executor";
import Course from "../lib/models/course";
import Language from "../lib/models/language";
import BaseCommand from "./base";

export default class CompileCommand extends BaseCommand {
  languageFilter: string; // Can be empty string

  constructor(languageFilter: string) {
    super();
    this.languageFilter = languageFilter;
  }

  async doRun() {
    const course = Course.loadFromDirectory(process.cwd());

    console.log("Building js-tools Docker image...");
    console.log("");
    await DockerShellCommandExecutor.buildImage("js-tools");
    console.log("");
    console.log("js-tools Docker image built.");
    console.log("");

    const compilers = [
      new StarterTemplateCompiler(course),
      new FirstStageSolutionsCompiler(course),
      new ManualSolutionsCompiler(course),
      new SolutionDiffsCompiler(course),
    ];

    if (this.#languageSlugsToFilter.length === 0) {
      console.log("Compiling all languages...");

      for (const compiler of compilers) {
        console.log(`Compiling ${compiler.constructor.name}...`);
        await compiler.compileAll();
      }
    } else {
      if (this.#languageSlugsToFilter.length === 1) {
        console.log(`Compiling language: ${this.#languageSlugsToFilter[0]}...`);
      } else {
        console.log(`Compiling languages: ${this.#languageSlugsToFilter.join(", ")}...`);
      }

      for (const compiler of compilers) {
        for (const languageSlug of this.#languageSlugsToFilter) {
          const language = Language.findBySlug(languageSlug);
          await compiler.compileForLanguage(language);
        }
      }
    }
  }

  get #languageSlugsToFilter() {
    return this.languageFilter
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }
}
