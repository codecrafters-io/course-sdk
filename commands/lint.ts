import BaseCommand from "./base";
import DockerShellCommandExecutor from "../lib/docker-shell-command-executor";
import ShellCommandExecutor from "../lib/shell-command-executor";
import type { DockerfileType } from "../lib/docker-shell-command-executor";

export default class LintCommand extends BaseCommand {
  constructor() {
    super();
  }

  private async buildToolsImage(dockerfileType: DockerfileType) {
    console.log(`Building ${dockerfileType} Docker image...`);
    console.log("");
    await DockerShellCommandExecutor.buildImage(dockerfileType);
    console.log("");
    console.log(`${dockerfileType} Docker image built.`);
    console.log("");
  }

  private async dockerShellCommandExecutor(dockerfileType: DockerfileType): Promise<DockerShellCommandExecutor> {
    return new DockerShellCommandExecutor("./", dockerfileType);
  }

  async doRun() {
    await this.buildToolsImage("js-tools");

    console.log("");
    console.log("Linting JavaScript files...")
    console.log("");
    await this.lintJavaScriptFiles();
    console.log("Linting of JavaScript files complete.");
    console.log("");

    console.log("");
    console.log("Linting Markdown files...")
    console.log("");
    await this.lintMarkdownFiles();
    console.log("Linting of Markdown files complete.");
    console.log("");

    await this.buildToolsImage("go-tools");

    console.log("");
    console.log("Linting Go files...")
    console.log("");
    await this.lintGoFiles();
    console.log("Linting of Go files complete.");
    console.log("");

    await this.buildToolsImage("rust-tools");

    console.log("");
    console.log("Linting Rust files...")
    console.log("");
    await this.lintRustFiles();
    console.log("Linting of Rust files complete.");
    console.log("");

    await this.buildToolsImage("docker-tools");

    console.log("");
    console.log("Linting Docker files...")
    console.log("");
    await this.lintDockerFiles();
    console.log("Linting of Docker files complete.");
    console.log("");
  }

  async lintGoFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor("go-tools");
    await dockerShellCommandExecutor.exec(`test -z $(gofmt -l ./) || (gofmt -l ./ && exit 1)`);
  }

  async lintJavaScriptFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor("js-tools");
    await dockerShellCommandExecutor.exec(`prettier --write --ignore-path ./.prettierignore --no-error-on-unmatched-pattern --check "./**/*.js"`);
  }

  async lintMarkdownFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor("js-tools");
    await dockerShellCommandExecutor.exec(`prettier --prose-wrap="always" --write --ignore-path ./.prettierignore --no-error-on-unmatched-pattern "./**/*.md"`);
  }

  async lintRustFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor("rust-tools");
    await dockerShellCommandExecutor.exec(`find . -name '*.rs' -exec rustfmt --edition "2021" --check -- {} +`);
  }

  async lintDockerFilesHelper(tmpDirectory: string) {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor("docker-tools");
    await dockerShellCommandExecutor.exec(`cp -r dockerfiles/ ${tmpDirectory}/`);
    await dockerShellCommandExecutor.exec(`sed -i "/^COPY /s/--exclude=[^ ]*//g" ${tmpDirectory}/*.Dockerfile`);
    await dockerShellCommandExecutor.exec(`hadolint --ignore DL3059 ${tmpDirectory}/*.Dockerfile`);
  }

  async lintDockerFiles() {
    const tmpDirectory = "dockerfiles-tmp/";
    try {
      await this.lintDockerFilesHelper(tmpDirectory);
      await this.cleanupAfterLintDockerFiles(tmpDirectory);
    } catch (error) {
      await this.cleanupAfterLintDockerFiles(tmpDirectory);
      throw error;
    }
  }

  async cleanupAfterLintDockerFiles(tmpDirectory: string) {
    await ShellCommandExecutor.execute(`ls -all`);
    await ShellCommandExecutor.execute(`ls -all ${tmpDirectory}`);
    await ShellCommandExecutor.execute(`ls -all -R ${tmpDirectory}`);
    await ShellCommandExecutor.execute(`rm -rf ${tmpDirectory}`);
  }
}

