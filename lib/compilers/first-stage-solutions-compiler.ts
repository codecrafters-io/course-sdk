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

  async compileAll() {
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

    mkdirSync(path.dirname(codeDirectory), { recursive: true });

    // TODO: Bun's copyFileSync doesn't support recursive copying?
    execSync(`cp -R ${starterRepositoryDirectory} ${codeDirectory}`);

    const uncommentMarkerDiffs = new LineWithCommentRemover(
      codeDirectory,
      language
    ).process();

    this.ensureDiffsExist(uncommentMarkerDiffs);

    const passStageDiffs = new StarterCodeUncommenter(
      codeDirectory,
      language
    ).uncomment();

    this.ensureDiffsExist(passStageDiffs);
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
    });
  }

  private starterRepositoryDirectories(): string[] {
    return glob.sync(`${this.course.compiledStarterRepositoriesDir}/*`);
  }
}
