import Course from "../lib/models/course";
import BaseCommand from "./base";
import RuntimeTester from "../lib/testers/runtime-tester";

export default class ValidateCommand extends BaseCommand {
  languageFilter: string; // Can be empty string
  commandToExecute: string;
  outputStreamType: string;
  expectedOutput: string;

  constructor(languageFilter: string, commandToExecute: string, outputStreamType: string, expectedOutput: string) {
    super();
    this.languageFilter = languageFilter;
    this.commandToExecute = commandToExecute;
    this.outputStreamType = outputStreamType;
    this.expectedOutput = expectedOutput;

  }

  async doRun() {
    const course = Course.loadFromDirectory(process.cwd());

    let testers = [...this.runtimeTestersForCourse(course, this.commandToExecute, this.outputStreamType, this.expectedOutput)];

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

  runtimeTestersForCourse(course: Course, commandToExecute: string, outputStreamType: string, expectedOutput: string): RuntimeTester[] {
    return course.latestDockerfiles.map((dockerfile) => new RuntimeTester(course, dockerfile, commandToExecute, outputStreamType, expectedOutput));
  }
}
