import Language from "./models/language";
import { FileMapping } from "./models/starter-code-definition";

export class FriendlyError extends Error {}

export class DefinitionNotFoundError extends FriendlyError {
  constructor(language: Language) {
    super(`No definition found for language '${language.slug}' in starter-repository-definitions.yml`);
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
