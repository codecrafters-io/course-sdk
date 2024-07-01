import Course from "../lib/models/course";
import BaseCommand from "./base";
import CommandTester from "../lib/testers/command-tester";

export default class BuildAndRunCommand extends BaseCommand {
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

    let testers = [...(await this.commandTestersForCourse(course, this.commandToExecute, this.outputStreamType, this.expectedOutput))];

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

  commandTestersForCourse(course: Course, commandToExecute: string, outputStreamType: string, expectedOutput: string): Promise<CommandTester[]> {
    return Promise.all(course.latestDockerfiles.map((dockerfile) => new CommandTester(course, dockerfile, commandToExecute, outputStreamType, expectedOutput)));
  }
}
