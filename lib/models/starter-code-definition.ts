import Mustache from "mustache";
import fs from "fs";
import YAML from "js-yaml";
import Course from "./course";
import Language from "./language";

export class FileMapping {
  destinationPath: string;
  templatePath: string;
  shouldSkipTemplateInterpolation: boolean;

  constructor(destinationPath: string, templatePath: string, shouldSkipTemplateInterpolation: boolean) {
    this.destinationPath = destinationPath;
    this.templatePath = templatePath;
    this.shouldSkipTemplateInterpolation = shouldSkipTemplateInterpolation;
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
        should_skip_template_evaluation?: boolean;
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
      return new StarterCodeDefinition(
        course,
        Language.findBySlug(starterDefinitionYaml.language),
        starterDefinitionYaml.file_mappings.map((fm) => {
          fm.should_skip_template_evaluation = true;
          let sourceFileExtension = fm.source.split('.').pop();
          if (sourceFileExtension == "md" || sourceFileExtension == "yml" || sourceFileExtension=="yaml") {
            fm.should_skip_template_evaluation = false;
          }
          return new FileMapping(fm.target, fm.source, fm.should_skip_template_evaluation);
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
      const templateContents = fs.readFileSync(fpath);

      Mustache.escape = (text) => text;

      return {
        skippedTemplateInterpolation: mapping.shouldSkipTemplateInterpolation,
        path: mapping.destinationPath,
        contents: mapping.shouldSkipTemplateInterpolation
          ? templateContents
          : Mustache.render(templateContents.toString("utf-8"), this.templateContext()),
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
