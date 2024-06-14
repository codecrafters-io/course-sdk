import child_process from "child_process";
import MemoryWritableStream from "./memory-writable-stream";
import PrefixedWritableStream from "./prefixed-writable-stream";
import ansiColors from "ansi-colors";

export default class ShellCommandExecutor {
  static execute(
    command: string,
    options: { expectedExitCodes?: number[]; prefix?: string; shouldLogCommand?: boolean } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const prefix = options.prefix || "";
    const expectedExitCodes = options.expectedExitCodes || [0];

    const childProcess = child_process.spawn(command, [], { shell: true });
    const stdoutCaptured = new MemoryWritableStream();
    const stderrCaptured = new MemoryWritableStream();
    const stdoutLogStream = new PrefixedWritableStream(prefix, process.stdout);
    const stderrLogStream = new PrefixedWritableStream(prefix, process.stderr);

    if (options.shouldLogCommand) {
      stdoutLogStream.write(`${command}\n`);
    }

    childProcess.stderr.pipe(stderrCaptured);
    childProcess.stdout.pipe(stdoutCaptured);

    childProcess.stderr.pipe(stderrLogStream);
    childProcess.stdout.pipe(stdoutLogStream);


    return new Promise((resolve, reject) => {
      childProcess.on("close", (exitCode) => {
        if (!expectedExitCodes.includes(exitCode!)) {
          console.log("");
          console.log(`Process exited with code ${exitCode} (expected: ${expectedExitCodes.join(",")})`);
          console.log("");
          reject(new Error(`Process exited with code ${exitCode} (expected: ${expectedExitCodes.join(",")})`));
        } else {
          resolve({
            stdout: stdoutCaptured.getBuffer().toString(),
            stderr: stderrCaptured.getBuffer().toString(),
            exitCode: exitCode || -1,
          });
        }
      });
    });
  }
}
