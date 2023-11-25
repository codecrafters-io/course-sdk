import { Writable, WritableOptions } from "stream";

export default class PrefixedWritableStream extends Writable {
  prefix: string;
  target: Writable;
  lastChar: string;

  constructor(prefix: string, target: Writable) {
    super();
    this.lastChar = "";
    this.prefix = prefix;
    this.target = target;
  }

  _write(chunk: Buffer, encoding: unknown, callback: () => void) {
    const lines = chunk.toString().split("\n");

    lines.forEach((line, index) => {
      if (index === lines.length - 1 && line !== "") {
        if (this.lastChar === "\n") {
          this.target.write(this.prefix);
          this.target.write(this.prefix + line);
        }

        this.lastChar = line[line.length - 1];
      } else {
        this.target.write(this.prefix + line + "\n");
      }
    });

    callback();
  }
}
