import Language from "./models/language";

export class FriendlyError extends Error {}

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
