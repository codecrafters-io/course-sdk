import Mustache from "mustache";
import fs from "fs";
import Course from "./course";
import Language from "./language";
import { glob } from "glob";
import path from "path";
import { ConflictingFileMappingError } from "../errors";

interface StarterFileDefinition {
  destinationPath: string;
  destinationFileContents: Buffer;
  destinationFileMode: number;
}

function combineWithNewlines(...templateContents: Buffer[]): Buffer {
  return Buffer.concat([templateContents[0], ...templateContents.slice(1).map((contents) => Buffer.concat([Buffer.from("\n"), contents]))]);
}

export class SingleTemplateFileDefinition implements StarterFileDefinition {
  destinationPath: string;
  templatePath: string;

  constructor(destinationPath: string, templatePath: string) {
    this.destinationPath = destinationPath;
    this.templatePath = templatePath;
  }

  get destinationFileContents(): Buffer {
    return fs.readFileSync(this.templatePath);
  }

  get destinationFileMode(): number {
    return fs.statSync(this.templatePath).mode;
  }
}

export class MultiTemplateFileDefinition implements StarterFileDefinition {
  destinationPath: string;
  templatePaths: string[];
  reducer: (...templateContents: Buffer[]) => Buffer;

  constructor(destinationPath: string, templatePaths: string[], reducer: (...args: any[]) => Buffer) {
    this.destinationPath = destinationPath;
    this.templatePaths = templatePaths;
    this.reducer = reducer;
  }

  get destinationFileContents(): Buffer {
    return this.reducer(...this.templatePaths.map((templatePath) => fs.readFileSync(templatePath)));
  }

  get destinationFileMode(): number {
    const modes = this.templatePaths.map((templatePath) => fs.statSync(templatePath).mode);

    if (modes.some((mode) => mode !== modes[0])) {
      throw new Error(`All template paths must have the same file mode. Found: ${modes.join(", ")}`);
    }

    return modes[0];
  }
}

export default class StarterCodeDefinition {
  course: Course;
  language: Language;
  fileDefinitions: StarterFileDefinition[];
  templateAttrs: any;

  constructor(course: Course, language: Language, fileDefinitions: StarterFileDefinition[], templateAttrs: any) {
    this.course = course;
    this.language = language;
    this.fileDefinitions = fileDefinitions;
    this.templateAttrs = templateAttrs;
  }

  static loadForCourse(course: Course): StarterCodeDefinition[] {
    return course.languages.map((language) => {
      const globalFileDefinitions = glob
        .sync(`${course.globalStarterTemplatesDir}/**/*`, { dot: true })
        .filter((starterTemplateFilePath) => fs.statSync(starterTemplateFilePath).isFile())
        .map((starterTemplateFilePath) => {
          const destinationPath = path.relative(course.globalStarterTemplatesDir, starterTemplateFilePath);
          return new SingleTemplateFileDefinition(destinationPath, path.relative(course.directory, starterTemplateFilePath));
        });

      const starterTemplatesDir = course.starterTemplatesDirForLanguage(language);

      const languageFileDefinitions = glob
        .sync(`${starterTemplatesDir}/**/*`, { dot: true })
        .filter((starterTemplateFilePath) => {
          try {
            return fs.statSync(starterTemplateFilePath).isFile();
          } catch (e) {
            if (fs.lstatSync(starterTemplateFilePath).isSymbolicLink() && !fs.existsSync(starterTemplateFilePath)) {
              return false;
            } else {
              console.log(`Failed to run stat on ${starterTemplateFilePath}, error: ${e}`);
              process.exit(1);
            }
          }
        })
        .map((starterTemplateFilePath) => {
          const destinationPath = path.relative(starterTemplatesDir, starterTemplateFilePath);
          return new SingleTemplateFileDefinition(destinationPath, path.relative(course.directory, starterTemplateFilePath));
        });

      const combinedFileDefinitions = [];

      // Iterate over a copy since we're modifying the original array in the loop
      for (const globalFileDefinition of [...globalFileDefinitions]) {
        const languageFileDefinition = languageFileDefinitions.find((fm) => fm.destinationPath === globalFileDefinition.destinationPath);

        if (languageFileDefinition) {
          if (globalFileDefinition.destinationPath == ".gitignore") {
            globalFileDefinitions.splice(globalFileDefinitions.indexOf(globalFileDefinition), 1);
            languageFileDefinitions.splice(languageFileDefinitions.indexOf(languageFileDefinition), 1);

            combinedFileDefinitions.push(
              new MultiTemplateFileDefinition(
                globalFileDefinition.destinationPath,
                [globalFileDefinition.templatePath, languageFileDefinition.templatePath],
                combineWithNewlines
              )
            );
          } else {
            throw new ConflictingFileMappingError(globalFileDefinition, languageFileDefinition);
          }
        }
      }

      return new StarterCodeDefinition(
        course,
        language,
        [...globalFileDefinitions, ...languageFileDefinitions, ...combinedFileDefinitions],
        course.starterTemplateAttributesForLanguage(language)
      );
    });
  }

  compiledStarterDirectory(): string {
    return `${this.course.compiledStarterRepositoriesDir}/${this.language.slug}`;
  }

  files(templateDir: string): any[] {
    return this.fileDefinitions.map((fileDefinition: StarterFileDefinition) => {
      const templateContents = fileDefinition.destinationFileContents;
      const shouldSkipTemplateInterpolation = !["md", "yml", "yaml"].includes(fileDefinition.destinationPath.split(".").pop() as string);

      Mustache.escape = (text) => text;

      return {
        skippedTemplateInterpolation: shouldSkipTemplateInterpolation,
        path: fileDefinition.destinationPath,
        contents: shouldSkipTemplateInterpolation
          ? templateContents
          : Mustache.render(templateContents.toString("utf-8"), this.templateContext()),
        mode: fileDefinition.destinationFileMode,
      };
    });
  }

  private templateContext(): any {
    return {
      buildpack_with_version: this.course.latestDockerfileForLanguage(this.language)!.buildpackWithVersion,
      language_name: this.language.name,
      language_slug: this.language.slug,
      [`language_is_${this.language.slug}`]: true,
      course_name: this.course.name,
      course_slug: this.course.slug,
      ...this.templateAttrs,
    };
  }
}
