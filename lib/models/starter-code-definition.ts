import Mustache from "mustache";
import fs from "fs";
import YAML from "js-yaml";
import Course from "./course";
import Language from "./language";
import { glob } from "glob";
import path from "path";
import { DuplicateFileMappingError } from "../errors";

export class FileMapping {
  destinationPath: string;
  templatePath: string;

  constructor(destinationPath: string, templatePath: string) {
    this.destinationPath = destinationPath;
    this.templatePath = templatePath;
  }
}

export default class StarterCodeDefinition {
  course: Course;
  language: Language;
  fileMappings: FileMapping[];
  templateAttrs: any;

  constructor(course: Course, language: Language, fileMappings: FileMapping[], templateAttrs: any) {
    this.course = course;
    this.language = language;
    this.fileMappings = fileMappings;
    this.templateAttrs = templateAttrs;
  }

  static loadForCourse(course: Course): StarterCodeDefinition[] {
    type StarterDefinitionYAML = {
      language: string;
      file_mappings: {
        source: string;
        target: string;
      }[];
      template_attributes: {
        required_executable: string;
        user_editable_file: string;
      };
    };

    const starterDefinitionsYaml = YAML.load(
      fs.readFileSync(course.starterRepositoryDefinitionsFilePath, "utf8")
    ) as StarterDefinitionYAML[];

    return starterDefinitionsYaml.map((starterDefinitionYaml) => {
      const language = Language.findBySlug(starterDefinitionYaml.language);

      const fileMappingsFromYAML = starterDefinitionYaml.file_mappings.map((fm) => {
        return new FileMapping(fm.target, fm.source);
      });

      const starterTemplatesDir = course.starterTemplatesDirForLanguage(language);

      const fileMappingsFromStarterTemplatesDir = glob
        .sync(`${starterTemplatesDir}/**/*`, { dot: true })
        .filter((starterTemplateFilePath) => fs.statSync(starterTemplateFilePath).isFile())
        .map((starterTemplateFilePath) => {
          const relativePath = path.relative(starterTemplatesDir, starterTemplateFilePath);
          return new FileMapping(relativePath, `starter_templates/${language.slug}/${relativePath}`);
        });

      for (const fmFromYaml of fileMappingsFromYAML) {
        const fmFromStarterTemplatesDir = fileMappingsFromStarterTemplatesDir.find(
          (fm) => fm.destinationPath === fmFromYaml.destinationPath
        );

        if (fmFromStarterTemplatesDir) {
          throw new DuplicateFileMappingError(fmFromYaml, fmFromStarterTemplatesDir);
        }
      }

      return new StarterCodeDefinition(
        course,
        language,
        [...fileMappingsFromYAML, ...fileMappingsFromStarterTemplatesDir],
        starterDefinitionYaml.template_attributes
      );
    });
  }

  compiledStarterDirectory(): string {
    return `${this.course.compiledStarterRepositoriesDir}/${this.language.slug}`;
  }

  files(templateDir: string): any[] {
    return this.fileMappings.map((mapping: FileMapping) => {
      const fpath = `${templateDir}/${mapping.templatePath}`;
      const templateContents = fs.readFileSync(fpath);
      const templateFileExtension = mapping.templatePath.split(".").pop() as string;
      const shouldSkipTemplateInterpolation = !["md", "yml", "yaml"].includes(templateFileExtension);

      Mustache.escape = (text) => text;

      return {
        skippedTemplateInterpolation: shouldSkipTemplateInterpolation,
        path: mapping.destinationPath,
        contents: shouldSkipTemplateInterpolation
          ? templateContents
          : Mustache.render(templateContents.toString("utf-8"), this.templateContext()),
        mode: fs.statSync(fpath).mode,
      };
    });
  }

  private templateContext(): any {
    return {
      language_pack_with_version: this.course.latestDockerfileForLanguage(this.language)!.languagePackWithVersion,
      language_name: this.language.name,
      language_slug: this.language.slug,
      [`language_is_${this.language.slug}`]: true,
      course_name: this.course.name,
      course_slug: this.course.slug,
      ...this.templateAttrs,
    };
  }
}
