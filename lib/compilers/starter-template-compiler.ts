import Course from "../models/course";

export default class StarterTemplateCompiler {
  course: Course;

  constructor(course: Course) {
    this.course = course;
  }

  compileAll() {
    console.log("Compiling starter templates...");
  }

  get #definitions() {

  }
}
