import Course from "../lib/models/course";
import BaseCommand from "./base";
import DockerfileTester from "../lib/testers/dockerfile-tester";
import SolutionTester from "../lib/testers/solution-tester";
import StarterCodeDefinition from "../lib/models/starter-code-definition";
import StarterCodeTester from "../lib/testers/starter-code-tester";
import TesterDownloader from "../lib/tester-downloader";

export default class TestCommand extends BaseCommand {
  languageFilter: string; // Can be empty string

  constructor(languageFilter: string) {
    super();
    this.languageFilter = languageFilter;
  }

  async doRun() {
    const course = Course.loadFromDirectory(process.cwd());

    let testers = [
      ...this.dockerfileTestersForCourse(course),
      ...(await this.starterCodeTestersForCourse(course)),
      ...(await this.solutionTestersForCourse(course)),
    ];

    if (this.#languageSlugsToFilter.length !== 0) {
      testers = testers.filter((tester) => this.#languageSlugsToFilter.includes(tester.language.slug));
      console.log("Testing languages:", this.#languageSlugsToFilter.join(", "));
    } else {
      console.log("Testing all languages...");
    }

    for (const tester of testers) {
      if (!(await tester.test())) {
        console.error("");
        console.error(`${tester.constructor.name} failed. Check the logs above for more details.`);
        console.error("");
        process.exit(1);
      }
    }
  }

  get #languageSlugsToFilter() {
    return this.languageFilter
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }

  dockerfileTestersForCourse(course: Course): DockerfileTester[] {
    return course.latestDockerfiles.map((dockerfile) => new DockerfileTester(course, dockerfile));
  }

  async solutionTestersForCourse(course: Course): Promise<SolutionTester[]> {
    const testerDownloader = new TesterDownloader(course);
    await testerDownloader.downloadIfNeeded();

    return course.languages.map((language) => new SolutionTester(course, testerDownloader.testerDir, language));
  }

  async starterCodeTestersForCourse(course: Course): Promise<StarterCodeTester[]> {
    const starterCodeDefinitions = StarterCodeDefinition.loadForCourse(course);
    const testerDownloader = new TesterDownloader(course);

    await testerDownloader.downloadIfNeeded();

    return Promise.all(
      starterCodeDefinitions.map(
        async (starterCodeDefinition) => new StarterCodeTester(course, testerDownloader.testerDir, starterCodeDefinition.language)
      )
    );
  }
}
