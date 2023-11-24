import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "fs";
import { join, dirname } from "path";
import pMap from "p-map";
import Course from "../models/course";
import StarterRepoDefinition from "../models/starter-code-definition";

export default class StarterTemplateCompiler {
  private course: Course;
  private _definitionsCache: StarterRepoDefinition[] | undefined;

  constructor(course: Course) {
    this.course = course;
  }

  async compileAll(): Promise<void> {
    await pMap(this.definitions, async (definition) => {
      console.log(
        `- compiling starter repositories for ${definition.course.slug}-${definition.language.slug}`
      );

      await this.compileDefinition(definition);
    });
  }

  async compileForLanguage(language: string): Promise<void> {
    for (const definition of this.definitions) {
      if (definition.language.slug === language) {
        console.log(
          `compiling ${definition.course.slug}-${definition.language.slug}`
        );
        await this.compileDefinition(definition);
      }
    }
  }

  private async compileDefinition(
    definition: StarterRepoDefinition
  ): Promise<void> {
    const directory = definition.compiledStarterDirectory();

    if (existsSync(directory)) {
      execSync(`rm -rf ${directory}`);
    }

    for (const file of definition.files(this.course.directory)) {
      const path = join(directory, file.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.contents);
      chmodSync(path, file.mode);
      this.postprocess(path);
    }

    for (const [key, value] of Object.entries(definition.templateAttrs)) {
      if (
        key.endsWith("_file") &&
        !definition.fileMappings
          .map((fm) => fm.destinationPath)
          .includes(value as string)
      ) {
        throw new Error(
          `Template attribute ${key} references ${value}, which doesn't exist in the starter repository`
        );
      }
    }
  }

  private get definitions(): StarterRepoDefinition[] {
    if (!this._definitionsCache) {
      this._definitionsCache = StarterRepoDefinition.loadForCourse(this.course);
    }

    return this._definitionsCache;
  }

  private postprocess(filepath: string): void {
    if (filepath.endsWith(".md")) {
      execSync(
        `prettier --prose-wrap="always" --write --ignore-path ./.prettierignore ${filepath}`
      );
    } else if (filepath.endsWith(".js")) {
      execSync(
        `prettier --write --ignore-path ./.prettierignore --no-error-on-unmatched-pattern --check ${filepath}`
      );
    }
  }
}
