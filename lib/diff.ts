import fs from "fs";
import tmp from "tmp";
import DiffBuilder from "./diff-builder";
import ansiColors from "ansi-colors";

export default class Diff {
  raw: string;

  constructor(raw: string) {
    this.raw = raw;
  }

  static fromContents(oldContents: string, newContents: string): Diff {
    return new Diff(DiffBuilder.buildDiff(oldContents, newContents));
  }

  printToConsole() {
    this.raw.split("\n").forEach((line) => {
      if (line.startsWith("+")) {
        console.log(ansiColors.green(line));
      } else if (line.startsWith("-")) {
        console.log(ansiColors.red(line));
      } else {
        console.log(line);
      }
    });
  }
}
