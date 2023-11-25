import { Writable, WritableOptions } from "stream";

export default class MemoryWritableStream extends Writable {
  chunks: Buffer[];

  constructor(options?: WritableOptions) {
    super(options);
    this.chunks = [];
  }

  _write(chunk: Buffer, encoding: unknown, callback: () => void) {
    this.chunks.push(chunk);
    callback();
  }

  getBuffer() {
    return Buffer.concat(this.chunks);
  }
}
