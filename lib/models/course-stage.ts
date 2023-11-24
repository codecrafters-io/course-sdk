export default class CourseStage {
  name: string;
  number: number;
  slug: string;

  constructor(name: string, number: number, slug: string) {
    this.name = name;
    this.number = number;
    this.slug = slug;
  }

  get solutionDir(): string {
    return `${this.number.toString().padStart(2, "0")}-${this.slug}`;
  }

  get testerTestCaseJson(): string {
    return JSON.stringify({
      slug: this.slug,
      tester_log_prefix: `stage-${this.number}`,
      title: `Stage ${this.number}: ${this.name}`,
    });
  }
}
