import { existsSync, mkdirSync, rmdirSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import LineWithCommentRemover from "../line-with-comment-remover";
import StarterCodeUncommenter from "../starter-code-uncommenter";
import Course from "../models/course";
import Language from "../models/language";
import { glob } from "glob";

export default class FirstStageSolutionsCompiler {
  private course: Course;

  constructor(course: Course) {
    this.course = course;
  }

  compileAll(): void {
    this.starterRepositoryDirectories().forEach(
      (starterRepositoryDirectory) => {
        this.compileForStarterRepositoryDirectory(starterRepositoryDirectory);
      }
    );
  }

  compileForLanguage(language: string): void {
    this.starterRepositoryDirectories()
      .filter(
        (starterRepositoryDirectory) =>
          starterRepositoryDirectory.split("-").pop() === language
      )
      .forEach((starterRepositoryDirectory) => {
        this.compileForStarterRepositoryDirectory(starterRepositoryDirectory);
      });
  }

  compileForStarterRepositoryDirectory(
    starterRepositoryDirectory: string
  ): void {
    const language = Language.findBySlug(
      path.basename(starterRepositoryDirectory)
    );

    const codeDirectory = path.join(
      this.course.solutionsDir,
      language.slug,
      this.course.firstStage.solutionDir,
      "code"
    );

    if (existsSync(codeDirectory)) {
      rmdirSync(codeDirectory, { recursive: true });
    }

    mkdirSync(codeDirectory, { recursive: true });

    // TODO: Bun's copyFileSync doesn't support recursive copying?
    execSync(`cp -R ${starterRepositoryDirectory} ${codeDirectory}`);

    let diffs = new LineWithCommentRemover(codeDirectory, language).process();
    this.ensureDiffsExist(diffs);

    diffs = new StarterCodeUncommenter(codeDirectory, language).uncomment();
    this.ensureDiffsExist(diffs);
  }

  protected ensureDiffsExist(diffs: any[]): void {
    diffs.forEach((diff) => {
      if (diff.toString() === "") {
        console.error("Expected uncommenting code to return a diff");
        console.error(
          "Are you sure there's a contiguous block of comments after the 'Uncomment this' marker?"
        );

        process.exit(1);
      }

      // console.log("");
      // console.log(diff.toString({ color: true }));
      // console.log("");
    });
  }

  private starterRepositoryDirectories(): string[] {
    return glob.sync(`${this.course.compiledStarterRepositoriesDir}/*`);
  }
}
