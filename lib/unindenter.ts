export default class Unindenter {
  static unindent(string: string): string {
    const smallestTabIndent = Math.min(
      ...(string.match(/^\t*(?=\S)/g)?.map((s) => s.length) || [])
    );
    const smallestSpaceIndent = Math.min(
      ...(string.match(/^ *(?=\S)/g)?.map((s) => s.length) || [])
    );

    return string
      .split("\n")
      .map((line) => {
        if (smallestTabIndent) {
          return line.replace(new RegExp(`^\\t{${smallestTabIndent}}`), "");
        } else if (smallestSpaceIndent) {
          return line.replace(new RegExp(`^ {${smallestSpaceIndent}}`), "");
        } else {
          return line;
        }
      })
      .map((s) => s.trimEnd())
      .join("\n");
  }
}
