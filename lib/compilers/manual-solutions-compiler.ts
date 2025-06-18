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
    const languages = this.course.languages;

    for (const language of languages) {
      await this.compileForLanguage(language);
    }
  }

  async compileForLanguage(language: Language) {
    console.log(`- compiling manual solutions for ${this.course.slug}-${language.slug}`);

    const stages = this.course.stages;
    const firstStage = stages[0];
    const firstStageCodeDirectory = path.join(this.course.solutionsDir, language.slug, firstStage.solutionDir, "code");
    const firstStageFilePaths = await glob("**/*", {
      cwd: firstStageCodeDirectory,
      dot: true,
      nodir: true,
    });

    for (const stage of stages.slice(1)) {
      const currentStageCodeDirectory = path.join(this.course.solutionsDir, language.slug, stage.solutionDir, "code");

      if (!fs.existsSync(currentStageCodeDirectory)) {
        continue;
      }

      for (const filePath of firstStageFilePaths) {
        if (!filePath.endsWith(language.codeFileExtension)) {
          const sourcePath = path.join(firstStageCodeDirectory, filePath);
          const targetPath = path.join(currentStageCodeDirectory, filePath);
          fs.copyFileSync(sourcePath, targetPath);
        }
      }
    }
  }
}

export default ManualSolutionsCompiler;
