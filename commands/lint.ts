import BaseCommand from "./base";
import DockerShellCommandExecutor from "../lib/docker-shell-command-executor";
import type { DockerfileType } from "../docker-shell-command-executor";

export default class LintCommand extends BaseCommand {
  constructor() {
    super();
  }

  private async buildToolsImage(DockerfileType: DockerfileType) {
    console.log(`Building ${DockerfileType} Docker image...`);
    console.log("");
    await DockerShellCommandExecutor.buildImage(DockerfileType);
    console.log("");
    console.log(`${DockerfileType} Docker image built.`);
    console.log("");
  }

  private async dockerShellCommandExecutor(): Promise<DockerShellCommandExecutor> {
    return new DockerShellCommandExecutor("./", "js-tools");
  }

  async doRun() {
    await this.buildToolsImage("js-tools");

    console.log("Linting JavaScript files...")
    await this.lintJavaScriptFiles();
    console.log("Linting of JavaScript files complete.");

    console.log("Linting Markdown files...")
    await this.lintMarkdownFiles();
    console.log("Linting of Markdown files complete.");

    await this.buildToolsImage("go-tools");

    console.log("Linting Go files...")
    await this.lintGoFiles();
    console.log("Linting of Go files complete.");
  }

  async lintGoFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor();
    await dockerShellCommandExecutor.exec(`test -z $(gofmt -l ./) || (gofmt -l ./ && exit 1)`);
  }

  async lintJavaScriptFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor();
    await dockerShellCommandExecutor.exec(`prettier --write --ignore-path ./.prettierignore --no-error-on-unmatched-pattern --check ./`);
  }

  async lintMarkdownFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor();
    await dockerShellCommandExecutor.exec(`prettier --prose-wrap="always" --write --ignore-path ./.prettierignore --no-error-on-unmatched-pattern ./`);
  }
}

