import child_process from "child_process";
import Logger from "../logger";
import MemoryWritableStream from "../memory-writable-stream";
import PrefixedWritableStream from "../prefixed-writable-stream";

class TestFailedError extends Error {
  constructor() {
    super("Test failed");
  }
}
export default class BaseTester {
  // Returns true if the test passed, false if it failed
  async test(): Promise<boolean> {
    try {
      await this.doTest();
      return true;
    } catch (e) {
      if (e instanceof TestFailedError) {
        return false;
      }

      throw e;
    }
  }

  async doTest(): Promise<void> {
    throw new Error("Not implemented");
  }

  async assertStderrContains(command: string, expectedStderr: string, expectedExitCode = 0): Promise<void> {
    console.log("");

    const childProcess = child_process.spawn(command, [], { shell: true });
    const stdoutCaptured = new MemoryWritableStream();
    const stderrCaptured = new MemoryWritableStream();

    childProcess.stderr.pipe(stderrCaptured);
    childProcess.stdout.pipe(stdoutCaptured);

    childProcess.stderr.pipe(new PrefixedWritableStream("     ", process.stderr));
    childProcess.stdout.pipe(new PrefixedWritableStream("     ", process.stdout));

    return new Promise((resolve, reject) => {
      childProcess.on("close", (exitCode) => {
        console.log("");
        if (exitCode !== expectedExitCode) {
          Logger.logError(`Process exited with code ${exitCode} (expected: ${expectedExitCode})`);
          reject(new TestFailedError());
        } else if (!stderrCaptured.getBuffer().toString().includes(expectedStderr)) {
          Logger.logError(`Expected '${expectedStderr}' to be present.`);
          reject(new TestFailedError());
        } else {
          resolve();
        }
      });
    });
  }

  async assertStdoutContains(command: string, expectedStdout: string, expectedExitCode = 0): Promise<void> {
    console.log("");

    const childProcess = child_process.spawn(command, [], { shell: true });
    const stdoutCaptured = new MemoryWritableStream();
    const stderrCaptured = new MemoryWritableStream();

    childProcess.stderr.pipe(stderrCaptured);
    childProcess.stdout.pipe(stdoutCaptured);

    childProcess.stderr.pipe(new PrefixedWritableStream("     ", process.stderr));
    childProcess.stdout.pipe(new PrefixedWritableStream("     ", process.stdout));

    return new Promise((resolve, reject) => {
      childProcess.on("close", (exitCode) => {
        console.log("");
        if (exitCode !== expectedExitCode) {
          Logger.logError(`Process exited with code ${exitCode} (expected: ${expectedExitCode})`);
          reject(new TestFailedError());
        } else if (!stdoutCaptured.getBuffer().toString().includes(expectedStdout)) {
          Logger.logError(`Expected '${expectedStdout}' to be present.`);
          reject(new TestFailedError());
        } else {
          resolve();
        }
      });
    });
  }

  assert(condition: boolean, message: string): void {
    if (!condition) {
      Logger.logError(message);
      throw new TestFailedError();
    }
  }

  async assertTimeUnder(thresholdSeconds: number, fn: () => unknown): Promise<number> {
    const before = Date.now();
    await fn();
    const after = Date.now();
    const timeTaken = Math.round((after - before) / 1000);

    if (timeTaken > thresholdSeconds) {
      Logger.logError(`Measured time (${timeTaken}s) was above ${thresholdSeconds} seconds`);
      throw new TestFailedError();
    }

    return timeTaken;
  }

  /**
   * Collects all environment variables that start with CODECRAFTERS_SECRET_
   * and returns them as Docker -e flag arguments
   */
  protected getCodecraftersSecretEnvFlags(): string[] {
    const flags: string[] = [];
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("CODECRAFTERS_SECRET_") && value !== undefined) {
        // Escape single quotes in the value by replacing ' with '\''
        const escapedValue = value.replace(/'/g, "'\\''");
        flags.push(`-e ${key}='${escapedValue}'`);
      }
    }
    return flags;
  }
}
