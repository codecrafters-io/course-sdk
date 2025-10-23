import Uncommenter from "./uncommenter";
import * as fs from "fs";
import * as path from "path";
import Language from "./models/language";
import { glob } from "glob";
import Diff from "./diff";

class UncommentMarkerNotFound extends Error {
  constructor(markerPattern: string, files: string[]) {
    super(`Didn't find a line that matches ${markerPattern} in any of these files: ${files}`);
  }
}

export default class StarterCodeUncommenter {
  private dir: string;
  private language: Language;

  private static UNCOMMENT_MARKER_PATTERN = /Uncomment this/;

  constructor(dir: string, language: Language) {
    this.dir = dir;
    this.language = language;
  }

  async uncomment(): Promise<Diff[]> {
    const codeFiles = this.codeFiles();

    if (codeFiles.length === 0) {
      throw new Error("No code files found");
    }

    const diffs = (
      await Promise.all(
        codeFiles.map(async (filePath) => {
          const oldContents = await fs.promises.readFile(filePath, "utf8");

          const newContents = new Uncommenter(this.language.slug, oldContents, StarterCodeUncommenter.UNCOMMENT_MARKER_PATTERN).uncommented;

          if (oldContents === newContents) {
            return null;
          }

          fs.writeFileSync(filePath, newContents);
          // TODO: Implement postProcessors

          const newContentsAgain = fs.readFileSync(filePath, "utf8");
          return Diff.fromContents(oldContents, newContentsAgain);
        })
      )
    ).filter((diff) => diff !== null) as Diff[];

    if (diffs.length === 0) {
      throw new UncommentMarkerNotFound(StarterCodeUncommenter.UNCOMMENT_MARKER_PATTERN.source, codeFiles);
    }

    return diffs;
  }

  uncommentedBlocksWithMarkers(): { filePath: string; code: string }[] {
    return this.codeFiles().flatMap((filePath) => {
      return new Uncommenter(
        this.language.slug,
        fs.readFileSync(filePath, "utf8"),
        StarterCodeUncommenter.UNCOMMENT_MARKER_PATTERN
      ).uncommentedBlocksWithMarker.map((block) => {
        return {
          filePath: path.relative(this.dir, filePath),
          code: block,
        };
      });
    });
  }

  // TODO: Implement postProcessors

  private codeFiles() {
    // TODO: Ignore .gitignore files?
    return glob.sync(`${this.dir}/**/*.${this.language.codeFileExtension}`);
  }
}
