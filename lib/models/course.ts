import CourseStage from "./course-stage";
import fs from "fs";
import path from "path";
import YAML from "js-yaml";
import {
  CourseDefinitionFileNotFoundError,
  InvalidCourseDefinitionFileError,
} from "../errors";

export default class Course {
  slug: string;
  name: string;
  shortName: string;
  stages: CourseStage[];
  directory: string;

  constructor(
    slug: string,
    name: string,
    shortName: string,
    stages: CourseStage[],
    directory: string
  ) {
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
      definitionYaml = YAML.load(
        definitionYamlRaw
      ) as unknown as DefinitionYaml;
    } catch (e) {
      throw new InvalidCourseDefinitionFileError(e as Error);
    }

    // TODO: Validate course definition YAML?

    return new Course(
      definitionYaml["slug"] as string,
      definitionYaml["name"] as string,
      definitionYaml["short_name"] as string,
      definitionYaml["stages"].map(
        (stageYaml, stageIndex) =>
          new CourseStage(
            stageYaml["name"] as string,
            stageIndex + 1,
            stageYaml["slug"] as string
          )
      ),
      directory
    );
  }

  get compiledStarterRepositoriesDir(): string {
    return path.join(this.directory, "compiled_starters");
  }

  get firstStage(): CourseStage {
    return this.stages[0];
  }

  get solutionsDir(): string {
    return path.join(this.directory, "solutions");
  }

  get starterRepositoryDefinitionsFilePath(): string {
    return path.join(this.directory, "starter-repository-definitions.yml");
  }

  get sourceRepoUrl(): string {
    return `https://github.com/codecrafters-io/build-your-own-${this.slug}`;
  }

  stagesAfter(courseStage: CourseStage): CourseStage[] {
    const index = this.stages.findIndex(
      (stage) => stage.slug === courseStage.slug
    );

    return this.stages.slice(index + 1);
  }
}
