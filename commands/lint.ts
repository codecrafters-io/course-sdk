import BaseCommand from "./base";
import DockerShellCommandExecutor from "../lib/docker-shell-command-executor";

export default class LintCommand extends BaseCommand {
  constructor() {
    super();
  }

  private async dockerShellCommandExecutor(): Promise<DockerShellCommandExecutor> {
    return new DockerShellCommandExecutor("./", "js-tools");
  }

  async doRun() {
    console.log("Building js-tools Docker image...");
    console.log("");
    await DockerShellCommandExecutor.buildImage("js-tools");
    console.log("");
    console.log("js-tools Docker image built.");
    console.log("");

    console.log("Linting JavaScript files...")
    await this.lintJavaScriptFiles();
    console.log("Linting of JavaScript files complete.");

    console.log("Linting Markdown files...")
    await this.lintMarkdownFiles();
    console.log("Linting of Markdown files complete.");
  }

  async lintJavaScriptFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor();
    await dockerShellCommandExecutor.exec(`prettier --write --ignore-path ./.prettierignore --no-error-on-unmatched-pattern --check ./`);
  }

  async lintMarkdownFiles() {
    const dockerShellCommandExecutor = await this.dockerShellCommandExecutor();
    await dockerShellCommandExecutor.exec(`prettier --prose-wrap="always" --write --ignore-path ./.prettierignore ./`);
  }
}

