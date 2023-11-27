import fs from "fs";
import tmp from "tmp";

export default class DiffBuilder {
  static buildDiff(oldContents: string, newContents: string): string {
    const oldFileName = tmp.fileSync().name;
    const newFileName = tmp.fileSync().name;
    fs.writeFileSync(oldFileName, oldContents || "");
    fs.writeFileSync(newFileName, newContents || "");

    let diffOutput = "";
    try {
      const { execSync } = require("child_process");
      try {
        diffOutput = execSync(`diff -d -U 25 ${oldFileName} ${newFileName}`, {
          encoding: "utf8",
        });
      } catch (error) {
        // @ts-ignore
        if (error.status === 1) {
          // @ts-ignore
          diffOutput = error.stdout;
        } else {
          throw error;
        }
      }
    } catch (error) {
      if ((error as { status: number }).status !== 1) {
        throw error;
      }
    }

    if (diffOutput.trim() === "") {
      throw new Error("No diff output");
    }

    fs.unlinkSync(oldFileName);
    fs.unlinkSync(newFileName);

    const diffOutputLines = diffOutput.split("\n");

    return diffOutputLines
      .slice(2)
      .map((line) => (line == " " ? "" : line)) // Diff can output a space for unchanged lines
      .join("\n"); // Remove the first two lines of the diff output
  }
}
