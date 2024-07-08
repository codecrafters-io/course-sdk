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

    const languageTemplatesDir = await new GlobalLanguageTemplatesDownloader(language, "/tmp/course-sdk-glt-cache").download();

    console.log("");
    console.log("Copying dockerfiles...");
    console.log("");
    await this.#copyDockerfiles(course, languageTemplatesDir);
  }

  async #copyDockerfiles(course: Course, languageTemplatesDir: string) {
    const dockerfilePaths = await glob(`${languageTemplatesDir}/dockerfiles/*.Dockerfile`);

    for (const dockerfilePath of dockerfilePaths) {
      await this.#copyFile(course, dockerfilePath, path.join("dockerfiles", path.basename(dockerfilePath)));
    }
  }

  async #copyFile(course: Course, sourcePath: string, relativeTargetPath: string) {
    const sourceFileContents = fs.readFileSync(sourcePath, "utf8");
    const targetPath = path.join(course.directory, relativeTargetPath);

    const renderedTemplateContents = Mustache.render(sourceFileContents, {
      course_slug: course.slug,
    });

    console.log(`${ansiColors.yellow("[copy]")} ${relativeTargetPath}`);
    await fs.writeFileSync(targetPath, renderedTemplateContents);
  }
}
