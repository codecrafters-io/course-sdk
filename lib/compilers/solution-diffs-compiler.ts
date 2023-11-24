import * as fs from "fs";
import * as path from "path";
import tmp from "tmp";
import Course from "../models/course";
import Language from "../models/language";
import { glob } from "glob";

class ChangedFile {
  path: string;
  oldContents: string | null;
  newContents: string | null;

  constructor(
    path: string,
    oldContents: string | null,
    newContents: string | null
  ) {
    this.path = path;
    this.oldContents = oldContents;
    this.newContents = newContents;
  }

  diff(): string {
    const oldFileName = tmp.fileSync().name;
    const newFileName = tmp.fileSync().name;
    fs.writeFileSync(oldFileName, this.oldContents || "");
    fs.writeFileSync(newFileName, this.newContents || "");

    let diffOutput = "";
    try {
      const { execSync } = require("child_process");
      try {
        diffOutput = execSync(`diff -u ${oldFileName} ${newFileName}`, {
          encoding: "utf8",
        });
      } catch (error) {
        // @ts-ignore
        if (error.status === 1) {
          // @ts-ignore
          diffOutput = error.stdout;
        } else {
          throw error;
        }
      }
    } catch (error) {
      if ((error as { status: number }).status !== 1) {
        throw error;
      }
    }

    if (diffOutput.trim() === "") {
      throw new Error("No diff output");
    }

    fs.unlinkSync(oldFileName);
    fs.unlinkSync(newFileName);

    const diffOutputLines = diffOutput.split('\n');
    return diffOutputLines.slice(2).join('\n'); // Remove the first two lines of the diff output
  }
}

class SolutionDiffsCompiler {
  course: Course;

  constructor(course: Course) {
    this.course = course;
  }

  async compileAll() {
    const languages = this.languages();

    for (const language of languages) {
      await this.compileForLanguage(language);
    }
  }

  async compileForLanguage(language: Language) {
    console.log(
      `compiling solution diffs for ${this.course.slug}-${language.slug}`
    );

    const stages = this.course.stages;

    for (let i = 0; i < stages.length - 1; i++) {
      const previousStage = i == 0 ? null : stages[i - 1];
      const nextStage = stages[i];

      const previousStageCodeDirectory = previousStage
        ? path.join(
            this.course.solutionsDir,
            language.slug,
            previousStage.solutionDir,
            "code"
          )
        : this.starterDirectoryFor(language);

      const nextStageCodeDirectory = path.join(
        this.course.solutionsDir,
        language.slug,
        nextStage.solutionDir,
        "code"
      );

      if (!fs.existsSync(nextStageCodeDirectory)) {
        continue;
      }

      const nextStageDiffDirectory = path.join(
        this.course.solutionsDir,
        language.slug,
        nextStage.solutionDir,
        "diff"
      );

      if (fs.existsSync(nextStageDiffDirectory)) {
        fs.rmdirSync(nextStageDiffDirectory, { recursive: true });
      }

      fs.mkdirSync(nextStageDiffDirectory, { recursive: true });

      const changedFiles = this.computeChangedFiles(
        previousStageCodeDirectory,
        nextStageCodeDirectory
      );

      for (const changedFile of changedFiles) {
        const diffFilePath = `${path.join(
          nextStageDiffDirectory,
          changedFile.path
        )}.diff`;
        fs.mkdirSync(path.dirname(diffFilePath), { recursive: true });
        fs.writeFileSync(diffFilePath, changedFile.diff());
      }
    }
  }

  protected computeChangedFiles(
    sourceDirectory: string,
    targetDirectory: string
  ): ChangedFile[] {
    const sourceDirectoryPaths = glob.sync(`${sourceDirectory}/**/*`);
    const sourceDirectoryFiles = sourceDirectoryPaths.filter((filePath) => {
      return fs.lstatSync(filePath).isFile();
    });

    const targetDirectoryPaths = glob.sync(`${targetDirectory}/**/*`);
    const targetDirectoryFiles = targetDirectoryPaths.filter((filePath) => {
      return fs.lstatSync(filePath).isFile();
    });

    const changedFiles: ChangedFile[] = [];

    for (const targetDirectoryFile of targetDirectoryFiles) {
      const relativePath = path.relative(targetDirectory, targetDirectoryFile);

      const sourceDirectoryFile = sourceDirectoryFiles.find(
        (sourceDirectoryFile) =>
          path.relative(sourceDirectory, sourceDirectoryFile) === relativePath
      );

      const oldContents = sourceDirectoryFile
        ? fs.readFileSync(sourceDirectoryFile, "utf8")
        : null;
      const newContents = fs.readFileSync(targetDirectoryFile, "utf8");

      if (oldContents !== newContents) {
        changedFiles.push(
          new ChangedFile(relativePath, oldContents, newContents)
        );
      }
    }

    for (const sourceDirectoryFile of sourceDirectoryFiles) {
      const relativePath = path.relative(sourceDirectory, sourceDirectoryFile);

      const targetDirectoryFile = targetDirectoryFiles.find(
        (targetDirectoryFile) =>
          path.relative(targetDirectory, targetDirectoryFile) === relativePath
      );

      if (!targetDirectoryFile) {
        changedFiles.push(
          new ChangedFile(
            relativePath,
            fs.readFileSync(sourceDirectoryFile, "utf8"),
            null
          )
        );
      }
    }

    return changedFiles;
  }

  protected languages(): Language[] {
    const languageDirectories = fs
      .readdirSync(this.course.solutionsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    return languageDirectories.map((languageDirectory) =>
      Language.findBySlug(languageDirectory)
    );
  }

  protected starterDirectoryFor(language: Language): string {
    return path.join(this.course.compiledStarterRepositoriesDir, language.slug);
  }
}

export default SolutionDiffsCompiler;
