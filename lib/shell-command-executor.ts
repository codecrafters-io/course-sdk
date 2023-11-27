import child_process from "child_process";
import MemoryWritableStream from "./memory-writable-stream";
import PrefixedWritableStream from "./prefixed-writable-stream";

export default class ShellCommandExecutor {
  static execute(command: string, options: { expectedExitCode?: boolean; prefix?: string } = {}) {
    const prefix = options.prefix || "";
    const expectedExitCode = options.expectedExitCode || 0;

    const childProcess = child_process.spawn(command, [], { shell: true });
    const stdoutCaptured = new MemoryWritableStream();
    const stderrCaptured = new MemoryWritableStream();

    childProcess.stderr.pipe(stderrCaptured);
    childProcess.stdout.pipe(stdoutCaptured);

    childProcess.stderr.pipe(new PrefixedWritableStream(prefix, process.stderr));
    childProcess.stdout.pipe(new PrefixedWritableStream(prefix, process.stdout));

    return new Promise((resolve, reject) => {
      childProcess.on("close", (exitCode) => {
        if (exitCode !== expectedExitCode) {
          console.log("");
          console.log(`Process exited with code ${exitCode} (expected: ${expectedExitCode})`);
          console.log("");
          reject(new Error(`Process exited with code ${exitCode} (expected: ${expectedExitCode})`));
        } else {
          resolve({
            stdout: stdoutCaptured.getBuffer().toString(),
            stderr: stderrCaptured.getBuffer().toString(),
            exitCode,
          });
        }
      });
    });
  }
}
