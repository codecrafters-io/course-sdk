import Mustache from "mustache";
import fs from "fs";
import YAML from "js-yaml";
import Course from "./course";
import Language from "./language";

export class FileMapping {
  destinationPath: string;
  templatePath: string;
  shouldSkipTemplateInterpolation: boolean;

  constructor(
    destinationPath: string,
    templatePath: string,
    shouldSkipTemplateInterpolation: boolean
  ) {
    this.destinationPath = destinationPath;
    this.templatePath = templatePath;
    this.shouldSkipTemplateInterpolation = shouldSkipTemplateInterpolation;
  }
}

export default class StarterRepoDefinition {
  course: Course;
  language: Language;
  fileMappings: FileMapping[];
  templateAttrs: any;

  constructor(
    course: Course,
    language: Language,
    fileMappings: FileMapping[],
    templateAttrs: any
  ) {
    this.course = course;
    this.language = language;
    this.fileMappings = fileMappings;
    this.templateAttrs = templateAttrs;
  }

  static loadForCourse(course: Course): StarterRepoDefinition[] {
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

    console.log(starterDefinitionsYaml);

    return starterDefinitionsYaml.map((starterDefinitionYaml) => {
      return new StarterRepoDefinition(
        course,
        Language.findBySlug(starterDefinitionYaml.language),
        starterDefinitionYaml.file_mappings.map((fm: any) => {
          return new FileMapping(
            fm.target,
            fm.source,
            fm.shouldSkipTemplateEvaluation || false
          );
        }),
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
      const templateContents = fs.readFileSync(fpath, "utf8");

      Mustache.escape = (text) => text;

      return {
        path: mapping.destinationPath,
        contents: mapping.shouldSkipTemplateInterpolation
          ? templateContents
          : Mustache.render(templateContents, this.templateContext()),
        mode: fs.statSync(fpath).mode,
      };
    });
  }

  private templateContext(): any {
    return {
      language_name: this.language.name,
      language_slug: this.language.slug,
      [`language_is_${this.language.slug}`]: true,
      course_name: this.course.name,
      course_slug: this.course.slug,
      ...this.templateAttrs,
    };
  }
}
