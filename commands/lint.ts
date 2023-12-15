import BaseCommand from "./base";
import DockerShellCommandExecutor from "../lib/docker-shell-command-executor";

export default class LintCommand extends BaseCommand {
  constructor() {
    super();
  }

  async doRun() {
    console.log("Building js-tools Docker image...");
    console.log("");
    await DockerShellCommandExecutor.buildImage("js-tools");
    console.log("");
    console.log("js-tools Docker image built.");
    console.log("");
  }
}

