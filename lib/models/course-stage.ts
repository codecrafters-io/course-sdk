export default class CourseStage {
  name: string;
  number: number;
  slug: string;

  constructor(name: string, number: number, slug: string) {
    this.name = name;
    this.number = number;
    this.slug = slug;
  }
}
