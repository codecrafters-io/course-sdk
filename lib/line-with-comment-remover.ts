import * as fs from "fs";
import * as diff from "diff";
import Language from "./models/language";
import { glob } from "glob";

class LineMarkerNotFound extends Error {
  constructor(markerPattern: RegExp, files: string[]) {
    super(`Didn't find a line that matches ${markerPattern} in any of these files: ${files}`);
  }
}

export default class LineWithCommentRemover {
  private dir: string;
  private language: Language;

  private static LINE_MARKER_PATTERN = /You can use print/;

  constructor(dir: string, language: Language) {
    this.dir = dir;
    this.language = language;
  }

  process() {
    const codeFiles = this.codeFiles();

    if (codeFiles.length === 0) {
      throw new Error("No code files found");
    }

    const diffs = codeFiles
      .map((filePath) => {
        const oldContents = fs.readFileSync(filePath, "utf8");
        const newContents = this.processFileContents(oldContents);

        if (oldContents === newContents) {
          return null;
        }

        fs.writeFileSync(filePath, newContents);

        const newContentsAgain = fs.readFileSync(filePath, "utf8");
        return diff.createTwoFilesPatch(filePath, filePath, oldContents, newContentsAgain);
      })
      .filter(Boolean);

    if (diffs.length === 0) {
      throw new LineMarkerNotFound(LineWithCommentRemover.LINE_MARKER_PATTERN, codeFiles);
    }

    return diffs;
  }

  private codeFiles() {
    return glob.sync(`${this.dir}/**/*.${this.language.codeFileExtension}`);
  }

  private processFileContents(oldContents: string) {
    const oldLines = oldContents.split("\n");

    let markerIndex = oldLines.findIndex((line) => LineWithCommentRemover.LINE_MARKER_PATTERN.test(line));

    if (markerIndex === -1) {
      return oldContents;
    }

    oldLines.splice(markerIndex, 1); // Delete marker line
    oldLines.splice(markerIndex, 1); // Delete line after

    if (/^\s*$/.test(oldLines[markerIndex])) {
      oldLines.splice(markerIndex, 1); // Delete blank line after
    }

    return oldLines.join("\n");
  }
}
