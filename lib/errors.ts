import Language from "./models/language";
import { FileMapping } from "./models/starter-code-definition";

export class FriendlyError extends Error {}

export class LanguageNotSupportedError extends FriendlyError {
  constructor(language: Language) {
    super(
      `Language '${language.slug}' is not supported by this course (i.e. the ./starter_templates/${language.slug} directory does not exist)`
    );
  }
}

export class StarterTemplateAttributesFileNotFoundError extends FriendlyError {
  constructor(attributesYamlPath: string) {
    super(`Starter template attributes file not found at ${attributesYamlPath}`);
  }
}

export class CourseDefinitionFileNotFoundError extends FriendlyError {
  constructor(directory: string) {
    super(
      `
Didn't find 'course-definition.yml' in the current directory (${directory}).
Are you sure you're in a CodeCrafters course directory?
`.trim()
    );
  }
}

export class InvalidCourseDefinitionFileError extends FriendlyError {
  constructor(originalError: Error) {
    super(`The 'course-definition.yml' file is invalid. Error: ${originalError.message}`);
  }
}

export class LanguageTemplateNotAvailableError extends FriendlyError {
  constructor(language: Language) {
    super(
      `This language isn't supported by add-language yet! Template for ${language.slug} not found in https://github.com/codecrafters-io/language-templates.`
    );
  }
}

export class ConflictingFileMappingError extends FriendlyError {
  constructor(fmFromYaml: FileMapping, fmFromStarterTemplatesDir: FileMapping) {
    super(
      `Conflicting file mappings found.

From starter_templates: ${fmFromStarterTemplatesDir.templatePath} -> ${fmFromStarterTemplatesDir.destinationPath}
In starter-repository-definitions.yml: ${fmFromYaml.templatePath} -> ${fmFromYaml.destinationPath}

Either delete the file from starter_templates or remove the file mapping from starter-repository-definitions.yml.`
    );
  }
}

export class CompileScriptFoundWithoutRunScriptError extends FriendlyError {
  constructor(language: Language) {
    super(
      `${language.slug}: Found .codecrafters/compile.sh without .codecrafters/run.sh. Please add .codecrafters/run.sh to your starter_template.`
    );
  }
}

export class YourProgramScriptFoundBeforeCompilationError extends FriendlyError {
  constructor(language: Language) {
    super(
      `${language.slug}: your_program.sh is created programmatically from .codecrafters/compile.sh and .codecrafters/run.sh. Please remove your_program.sh from starter_templates.`
    );
  }
}
