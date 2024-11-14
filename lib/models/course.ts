import CourseStage from "./course-stage";
import child_process from "child_process";
import Dockerfile from "./dockerfile";
import YAML from "js-yaml";
import fs from "fs";
import { glob } from "glob";
import path from "path";
import {
  CourseDefinitionFileNotFoundError,
  InvalidCourseDefinitionFileError,
  StarterTemplateConfigFileDoesNotContainAttributesError,
  StarterTemplateConfigFileNotFoundError,
} from "../errors";
import Language from "./language";
import tmp from "tmp";
import util from "util";
const exec = util.promisify(child_process.exec);

export default class Course {
  slug: string;
  name: string;
  shortName: string;
  stages: CourseStage[];
  directory: string;

  constructor(slug: string, name: string, shortName: string, stages: CourseStage[], directory: string) {
    this.slug = slug;
    this.name = name;
    this.shortName = shortName;
    this.stages = stages;
    this.directory = directory;
  }

  static loadFromDirectory(directory: string): Course {
    const definitionYamlPath = path.join(directory, "course-definition.yml");

    if (!fs.existsSync(definitionYamlPath)) {
      throw new CourseDefinitionFileNotFoundError(directory);
    }

    const definitionYamlRaw = fs.readFileSync(definitionYamlPath, "utf8");

    type DefinitionYaml = {
      slug: string;
      name: string;
      short_name: string;
      stages: {
        slug: string;
        name: string;
      }[];
    };

    let definitionYaml: DefinitionYaml;

    try {
      definitionYaml = YAML.load(definitionYamlRaw) as unknown as DefinitionYaml;
    } catch (e) {
      throw new InvalidCourseDefinitionFileError(e as Error);
    }

    // TODO: Validate course definition YAML?

    return new Course(
      definitionYaml["slug"] as string,
      definitionYaml["name"] as string,
      definitionYaml["short_name"] as string,
      definitionYaml["stages"].map(
        (stageYaml, stageIndex) => new CourseStage(stageYaml["name"] as string, stageIndex + 1, stageYaml["slug"] as string)
      ),
      directory
    );
  }

  get compiledStarterRepositoriesDir(): string {
    return path.join(this.directory, "compiled_starters");
  }

  get dockerfilesDir(): string {
    return path.join(this.directory, "dockerfiles");
  }

  get firstStage(): CourseStage {
    return this.stages[0];
  }

  get globalStarterTemplatesDir(): string {
    return path.join(this.directory, "starter_templates", "all", "code");
  }

  get languages(): Language[] {
    return glob
      .sync(path.join(this.directory, "starter_templates", "*"))
      .map((languageDir) => {
        if (path.basename(languageDir) == "all") {
          return null;
        }

        return Language.findBySlug(path.basename(languageDir));
      })
      .filter(Boolean) as Language[];
  }

  get solutionsDir(): string {
    return path.join(this.directory, "solutions");
  }

  get sourceRepoUrl(): string {
    return `https://github.com/codecrafters-io/build-your-own-${this.slug}`;
  }

  get dockerfiles() {
    return glob.sync(path.join(this.dockerfilesDir, "*.Dockerfile")).map((dockerfilePath) => new Dockerfile(dockerfilePath));
  }

  get latestDockerfiles() {
    const dockerfilesGroupedByLanguageSlug: { [key: string]: Dockerfile[] } = {};

    for (const dockerfile of this.dockerfiles) {
      const languageSlug = dockerfile.language.slug;

      if (!dockerfilesGroupedByLanguageSlug[languageSlug]) {
        dockerfilesGroupedByLanguageSlug[languageSlug] = [];
      }

      dockerfilesGroupedByLanguageSlug[languageSlug].push(dockerfile);
    }

    const latestDockerfiles = [];

    for (const languageSlug in dockerfilesGroupedByLanguageSlug) {
      const dockerfiles = dockerfilesGroupedByLanguageSlug[languageSlug];
      const latestDockerfile = dockerfiles.sort((a, b) => b.semver.compare(a.semver))[0];
      latestDockerfiles.push(latestDockerfile);
    }

    return latestDockerfiles;
  }

  compiledStarterRepositoryDirForLanguage(language: Language): string {
    return path.join(this.compiledStarterRepositoriesDir, language.slug);
  }

  // Prepares repository dir for language
  async prepareRepositoryDirForLanguage(language: Language, testerDir?: string, sourceRepositoryDir?: string): Promise<string> {
    const repositoryDir = tmp.dirSync().name;
    await exec(`rm -rf ${repositoryDir}`);
    await exec(`cp -r ${sourceRepositoryDir || this.compiledStarterRepositoryDirForLanguage(language)} ${repositoryDir}`);

    await exec(`git -C ${repositoryDir} init`);
    await exec(`git -C ${repositoryDir} add .`);
    await exec(`git -C ${repositoryDir} commit -m "Initial commit"`);

    // Test runner binary
    await exec(`mkdir -p ${repositoryDir}/test-runner`);
    await exec(`touch ${repositoryDir}/test-runner/test-runner`);

    // Tester directory
    if (testerDir) {
      await exec(`rm -rf ${repositoryDir}/tester`);
      await exec(`cp -r ${testerDir} ${repositoryDir}/tester`);

      // Set permissions for tester directory (ensure the new "owner" will be able to read and execute)
      await exec(`chmod -R o+rwX ${repositoryDir}/tester`);
    } else {
      await exec(`mkdir -p ${repositoryDir}/tester`); // Create dummy dir
    }

    // On macOS, using mount seems to automatically mark files as root:root. This doesn't happen on GitHub Actions.
    if (process.env.CI) {
      await exec(`sudo chown -R 0:0 ${repositoryDir}`);
    }

    return repositoryDir;
  }

  latestDockerfileForLanguage(language: Language): Dockerfile | undefined {
    return this.latestDockerfiles.find((dockerfile) => dockerfile.language.slug === language.slug);
  }

  stagesAfter(courseStage: CourseStage): CourseStage[] {
    const index = this.stages.findIndex((stage) => stage.slug === courseStage.slug);

    return this.stages.slice(index + 1);
  }

  starterTemplateAttributesForLanguage(language: Language): Record<string, string> {
    const configYamlPath = path.join(this.directory, "starter_templates", language.slug, "config.yml");

    if (!fs.existsSync(configYamlPath)) {
      throw new StarterTemplateConfigFileNotFoundError(configYamlPath);
    }

    const config = YAML.load(fs.readFileSync(configYamlPath, "utf8")) as Record<string, string>;

    if (!config.attributes) {
      throw new StarterTemplateConfigFileDoesNotContainAttributesError(configYamlPath);
    }

    return config.attributes as unknown as Record<string, string>;
  }

  starterTemplatesDirForLanguage(language: Language): string {
    return path.join(this.directory, "starter_templates", language.slug, "code");
  }
}
