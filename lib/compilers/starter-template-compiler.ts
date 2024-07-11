import Course from "../models/course";
import DockerShellCommandExecutor from "../docker-shell-command-executor";
import Language from "../models/language";
import StarterCodeDefinition from "../models/starter-code-definition";
import pMap from "p-map";
import { LanguageNotSupportedError } from "../errors";
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "fs";
import { join, dirname } from "path";
import YourProgramScriptCompiler from "./your-program-script-compiler";

export default class StarterTemplateCompiler {
  private course: Course;
  private _definitionsCache: StarterCodeDefinition[] | undefined;

  constructor(course: Course) {
    this.course = course;
  }

  async compileAll(): Promise<void> {
    await pMap(this.definitions, async (definition) => {
      await this.compileDefinition(definition);
    });
  }

  async compileForLanguage(language: Language): Promise<void> {
    const definition = this.definitions.find((definition) => definition.language.slug === language.slug);

    if (!definition) {
      throw new LanguageNotSupportedError(language);
    }

    console.log(`compiling ${definition.course.slug}-${definition.language.slug}`);
    await this.compileDefinition(definition);
  }

  private async compileDefinition(definition: StarterCodeDefinition): Promise<void> {
    console.log(`- compiling starter template for ${definition.course.slug}-${definition.language.slug}`);
    const directory = definition.compiledStarterDirectory();

    if (existsSync(directory)) {
      execSync(`rm -rf ${directory}`);
    }

    for (const file of definition.files(this.course.directory)) {
      if (file.skippedTemplateInterpolation) {
        console.log(`  - ignoring template interpolation for ${file.path}`);
      }

      const path = join(directory, file.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.contents);
      chmodSync(path, file.mode);
      await this.postprocess(path);
    }

    for (const [key, value] of Object.entries(definition.templateAttrs)) {
      if (key.endsWith("_file") && !definition.fileMappings.map((fm) => fm.destinationPath).includes(value as string)) {
        throw new Error(`Template attribute ${key} references ${value}, which doesn't exist in the starter repository`);
      }
    }

    await new YourProgramScriptCompiler(definition.language, directory).compile();
  }

  private async dockerShellCommandExecutor(): Promise<DockerShellCommandExecutor> {
    return new DockerShellCommandExecutor(this.course.directory, "js-tools");
  }

  private get definitions(): StarterCodeDefinition[] {
    if (!this._definitionsCache) {
      this._definitionsCache = StarterCodeDefinition.loadForCourse(this.course);
    }

    return this._definitionsCache;
  }

  private async postprocess(filepath: string): Promise<void> {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor();
    const relativePath = dockerShellCommandExecutor.containerPath(filepath);

    if (filepath.endsWith(".md")) {
      console.log(`  - postprocessing ${relativePath}`);
      await dockerShellCommandExecutor.exec(`prettier --prose-wrap="always" --write --ignore-path ./.prettierignore ${relativePath}`);
    } else if (filepath.endsWith(".js")) {
      console.log(`  - postprocessing ${relativePath}`);
      await dockerShellCommandExecutor.exec(
        `prettier --write --ignore-path ./.prettierignore --no-error-on-unmatched-pattern --check ${relativePath}`
      );
    }
  }
}
