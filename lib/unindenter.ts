export default class Unindenter {
  static unindent(string: string): string {
    const smallestIndent = Math.min(...(string.match(/^( |\t)*(?=\S)/gm)?.map((s) => s.length) || []));

    return string
      .split("\n")
      .map((line) => {
        return line.replace(new RegExp(`^( |\t){${smallestIndent}}`), "");
      })
      .map((s) => s.trimEnd())
      .join("\n");
  }
}
