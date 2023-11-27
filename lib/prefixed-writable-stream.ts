import { Writable, WritableOptions } from "stream";

export default class PrefixedWritableStream extends Writable {
  prefix: string;
  target: Writable;
  hasPrintedFirstPrefix: boolean;

  constructor(prefix: string, target: Writable) {
    super();
    this.hasPrintedFirstPrefix = false;
    this.prefix = prefix;
    this.target = target;
  }

  _write(chunk: Buffer, _encoding: unknown, callback: () => void) {
    if (!this.hasPrintedFirstPrefix) {
      this.target.write(this.prefix);
      this.hasPrintedFirstPrefix = true;
    }

    this.target.write(chunk.toString().replaceAll(/\n/g, "\n" + this.prefix));

    callback();
  }
}
