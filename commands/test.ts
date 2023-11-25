import Course from "../lib/models/course";
import BaseCommand from "./base";
import DockerfileTester from "../lib/testers/dockerfile-tester";

export default class TestCommand extends BaseCommand {
  languageFilter: string; // Can be empty string

  constructor(languageFilter: string) {
    super();
    this.languageFilter = languageFilter;
  }

  async doRun() {
    const course = Course.loadFromDirectory(process.cwd());

    let testers = [...this.dockerfileTestersForCourse(course)];

    // TODO: Implement filtering
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
}
