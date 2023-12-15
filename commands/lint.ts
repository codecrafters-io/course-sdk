import BaseCommand from "./base";
import DockerShellCommandExecutor from "../lib/docker-shell-command-executor";
import type { DockerfileType } from "../docker-shell-command-executor";

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
  }

  async lintGoFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor("go-tools");
    await dockerShellCommandExecutor.exec(`test -z $(gofmt -l ./) || (gofmt -l ./ && exit 1)`);
  }

  async lintJavaScriptFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor("js-tools");
    await dockerShellCommandExecutor.exec(`prettier --write --ignore-path ./.prettierignore --no-error-on-unmatched-pattern --check ./`);
  }

  async lintMarkdownFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor("js-tools");
    await dockerShellCommandExecutor.exec(`prettier --prose-wrap="always" --write --ignore-path ./.prettierignore --no-error-on-unmatched-pattern ./`);
  }

  async lintRustFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor("rust-tools");
    await dockerShellCommandExecutor.exec(`find . -name '*.rs' | xargs rustfmt --edition "2021" --check`);
  }
}

