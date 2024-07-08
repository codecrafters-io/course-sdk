import Language from "./models/language";

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

export class DuplicateFileMappingError extends FriendlyError {
  constructor(targetPath: string, templatePath: string) {
    super(`The mapping for ${templatePath}:${targetPath} is already inferred since it's present in starter_templates.`);
  }
}
