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

    const testers = [...this.dockerfileTestersForCourse(course)];

    // TODO: Implement filtering
    if (this.#languageSlugsToFilter.length !== 0) {
      console.warn("Filtering not supported yet");
      process.exit(1);
    }

    console.log("Testing all languages...");

    for (const tester of testers) {
      if (!(await tester.test())) {
        console.error(`Test failed: ${tester.constructor.name}`);
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
