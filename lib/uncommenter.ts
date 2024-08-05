export default class Uncommenter {
  private static POUND_SIGN = /(^\s*)#\s{0,1}(.*)$/;
  private static DOUBLE_SLASHES = /(^\s*)\/\/\s{0,1}(.*)$/;
  private static DOUBLE_HYPHENS = /(^\s*)--\s{0,1}(.*)$/;

  private static REGEX_PATTERNS: { [key: string]: RegExp } = {
    c: Uncommenter.DOUBLE_SLASHES,
    clojure: /(^\s*);;\s{0,1}(.*)$/,
    cpp: Uncommenter.DOUBLE_SLASHES,
    csharp: Uncommenter.DOUBLE_SLASHES,
    crystal: Uncommenter.POUND_SIGN,
    dart: Uncommenter.DOUBLE_SLASHES,
    elixir: Uncommenter.POUND_SIGN,
    gleam: Uncommenter.DOUBLE_SLASHES,
    go: Uncommenter.DOUBLE_SLASHES,
    haskell: Uncommenter.DOUBLE_HYPHENS,
    java: Uncommenter.DOUBLE_SLASHES,
    javascript: Uncommenter.DOUBLE_SLASHES,
    kotlin: Uncommenter.DOUBLE_SLASHES,
    nim: Uncommenter.POUND_SIGN,
    ocaml: /(^\s*)\(\*\s{0,1}(.*)\*\)$/,
    php: Uncommenter.DOUBLE_SLASHES,
    python: Uncommenter.POUND_SIGN,
    ruby: Uncommenter.POUND_SIGN,
    rust: Uncommenter.DOUBLE_SLASHES,
    scala: Uncommenter.DOUBLE_SLASHES,
    swift: Uncommenter.DOUBLE_SLASHES,
    typescript: Uncommenter.DOUBLE_SLASHES,
    zig: Uncommenter.DOUBLE_SLASHES,
  };

  private language_slug: string;
  private code: string;
  private uncomment_marker_pattern: RegExp;

  constructor(language_slug: string, code: string, uncomment_marker_pattern: RegExp) {
    this.language_slug = language_slug;
    this.code = code;
    this.uncomment_marker_pattern = uncomment_marker_pattern;
  }

  get uncommented(): string {
    const uncommentedLines = this.code.split("\n").map((line, index) => {
      return this.withinUncommentBounds(index) ? this.uncommentLine(line) : line;
    });

    const filteredLines = uncommentedLines.filter((line, index) => {
      const isUncommentMarker = this.uncommentLineIndices().includes(index);
      const previousLineIsUncommentMarker = this.uncommentLineIndices().includes(index - 1);
      const isLineEmpty = /^\s*$/.test(line);

      return !(isUncommentMarker || (previousLineIsUncommentMarker && isLineEmpty));
    });

    return filteredLines.join("\n");
  }

  get uncommentedBlocksWithMarker(): string[] {
    return this.uncommentBoundsPairs().map((uncommentBoundPair) => {
      const [startIndex, endIndex] = uncommentBoundPair;

      return this.code
        .split("\n")
        .slice(startIndex - 1, endIndex + 1) // Corrected off-by-one error here
        .map((line, index) => (index === 0 ? line : this.uncommentLine(line)))
        .join("\n");
    });
  }

  private uncommentLine(line: string): string {
    const matches = line.match(this.#lineRegex);
    const uncommented = matches!.slice(1).join("");

    return uncommented.trim() === "" ? "" : uncommented.trimEnd();
  }

  private withinUncommentBounds(index: number): boolean {
    return this.uncommentBoundsPairs().some((uncommentBounds) => {
      return index >= uncommentBounds[0] && index <= uncommentBounds[1];
    });
  }

  private uncommentBoundsPairs(): number[][] {
    return this.uncommentLineIndices().map((uncommentLineIndex) => {
      let startIndex = uncommentLineIndex + 1;
      let endIndex = startIndex;

      for (let index = startIndex; index < this.code.split("\n").length; index++) {
        const line = this.code.split("\n")[index];

        if (!this.#lineRegex.test(line)) {
          break;
        }

        endIndex = index;
      }

      return [startIndex, endIndex];
    });
  }

  private uncommentLineIndices(): number[] {
    return this.code
      .split("\n")
      .map((line, index) => (this.#lineRegex.test(line) && this.uncomment_marker_pattern.test(line) ? index : -1))
      .filter((index) => index !== -1);
  }

  get #lineRegex(): RegExp {
    return Uncommenter.REGEX_PATTERNS[this.language_slug];
  }
}
