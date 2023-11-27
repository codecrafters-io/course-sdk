import child_process from "child_process";
import MemoryWritableStream from "./memory-writable-stream";
import PrefixedWritableStream from "./prefixed-writable-stream";

export default class ShellCommandExecutor {
  static execute(
    command: string,
    options: { expectedExitCodes?: number[]; prefix?: string } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const prefix = options.prefix || "";
    const expectedExitCodes = options.expectedExitCodes || [0];

    const childProcess = child_process.spawn(command, [], { shell: true });
    const stdoutCaptured = new MemoryWritableStream();
    const stderrCaptured = new MemoryWritableStream();

    childProcess.stderr.pipe(stderrCaptured);
    childProcess.stdout.pipe(stdoutCaptured);

    childProcess.stderr.pipe(new PrefixedWritableStream(prefix, process.stderr));
    childProcess.stdout.pipe(new PrefixedWritableStream(prefix, process.stdout));

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
            exitCode,
          });
        }
      });
    });
  }
}
