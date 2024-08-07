import Mustache from "mustache";
import BaseCommand from "./base";
import Language from "../lib/models/language";
import GlobalLanguageTemplatesDownloader from "../lib/global-language-templates-downloader";
import Course from "../lib/models/course";
import { glob } from "glob";
import fs from "fs";
import path from "path";
import ansiColors from "ansi-colors";

export default class AddLanguageCommand extends BaseCommand {
  languageSlug: string;

  constructor(languageSlug: string) {
    super();
    this.languageSlug = languageSlug;
  }

  async doRun() {
    const course = Course.loadFromDirectory(process.cwd());
    const language = Language.findBySlug(this.languageSlug);

    const languageTemplatesDir = await new GlobalLanguageTemplatesDownloader(language).download();

    console.log("");
    console.log("Copying dockerfiles...");
    console.log("");
    await this.#copyDockerfiles(course, languageTemplatesDir);

    console.log("");
    console.log("Copying starter templates...");
    console.log("");
    await this.#copyStarterTemplates(course, languageTemplatesDir);

    console.log("");
    console.log("Copying config.yml...");
    console.log("");
    await this.#copyConfigYml(course, languageTemplatesDir);

    console.log("");
    console.log("Templates copied!");
    console.log("");
    console.log(`Now try running "course-sdk test ${language.slug}" and fix stage 1 errors!`);
  }

  #buildTemplateContext(course: Course) {
    return {
      course_slug: course.slug,
      course_slug_underscorized: course.slug.replace("-", "_"),
      course_name: course.name,
    };
  }

  async #copyConfigYml(course: Course, languageTemplatesDir: string) {
    const configYmlPath = path.join(languageTemplatesDir, "config.yml");

    await this.#copyFile(course, configYmlPath, path.join("starter_templates", this.languageSlug, "config.yml"));
  }

  async #copyDockerfiles(course: Course, languageTemplatesDir: string) {
    const dockerfilePaths = await glob(`${languageTemplatesDir}/dockerfiles/*.Dockerfile`);

    for (const dockerfilePath of dockerfilePaths) {
      await this.#copyFile(course, dockerfilePath, path.join("dockerfiles", path.basename(dockerfilePath)));
    }
  }

  async #copyStarterTemplates(course: Course, languageTemplatesDir: string) {
    const starterFilePaths = await glob(`${languageTemplatesDir}/code/**/*`, { dot: true });

    for (const starterFilePath of starterFilePaths) {
      if (fs.statSync(starterFilePath).isDirectory()) {
        continue;
      }

      const relativePathTemplate = path.relative(languageTemplatesDir, starterFilePath);
      const relativePath = Mustache.render(relativePathTemplate, this.#buildTemplateContext(course));
      await this.#copyFile(course, starterFilePath, path.join("starter_templates", this.languageSlug, relativePath));
    }
  }

  async #copyFile(course: Course, sourcePath: string, relativeTargetPath: string) {
    const sourceFileContents = fs.readFileSync(sourcePath, "utf8");
    const sourceFileMode = (await fs.promises.stat(sourcePath)).mode;
    const targetPath = path.join(course.directory, relativeTargetPath);

    const renderedTemplateContents = Mustache.render(sourceFileContents, this.#buildTemplateContext(course));

    console.log(`${ansiColors.yellow("[copy]")} ${relativeTargetPath}`);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true }); // Ensure the directory exists
    await fs.promises.writeFile(targetPath, renderedTemplateContents);
    await fs.promises.chmod(targetPath, sourceFileMode);
  }
}
