import * as fs from "fs";
import * as path from "path";
import tmp from "tmp";
import Course from "../models/course";
import Language from "../models/language";
import { glob } from "glob";

class ManualSolutionsCompiler {
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
    console.log(`- compiling manual solutions for ${this.course.slug}-${language.slug}`);

    const stages = this.course.stages;
    const firstStage = stages[0];
    const firstStageCodeDirectory = path.join(this.course.solutionsDir, language.slug, firstStage.solutionDir, "code");

    for (let i = 1; i < stages.length - 1; i++) {
      const currentStage = stages[i];
      const currentStageCodeDirectory = path.join(this.course.solutionsDir, language.slug, currentStage.solutionDir, "code");

      if (!fs.existsSync(currentStageCodeDirectory)) {
        continue;
      }

      const firstStageFiles = await glob("**/*", {
        cwd: firstStageCodeDirectory,
        dot: true, // Include hidden files
        nodir: true, // Only include files, not directories
      });

      for (const file of firstStageFiles) {
        if (!file.endsWith(language.codeFileExtension)) {
          const sourcePath = path.join(firstStageCodeDirectory, file);
          const targetPath = path.join(currentStageCodeDirectory, file);

          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
          }
        }
      }
    }
  }

  protected languages(): Language[] {
    const languageDirectories = fs
      .readdirSync(this.course.solutionsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    return languageDirectories.map((languageDirectory) => Language.findBySlug(languageDirectory));
  }
}

export default ManualSolutionsCompiler;
