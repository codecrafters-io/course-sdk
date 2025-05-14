import goToolsDockerfile from "./dockerfiles/go-tools.Dockerfile";
import jsToolsDockerfile from "./dockerfiles/js-tools.Dockerfile";
import rustToolsDockerfile from "./dockerfiles/rust-tools.Dockerfile";
import dockerToolsDockerfile from "./dockerfiles/docker-tools.Dockerfile";
import fs from "fs";
import tmp from "tmp";
import util from "util";
import path from "path";
import ShellCommandExecutor from "./shell-command-executor";
import ansiColors from "ansi-colors";

const writeFile = util.promisify(fs.writeFile);

export type DockerfileType = "js-tools" | "go-tools" | "rust-tools" | "docker-tools";

export default class DockerShellCommandExecutor {
  dockerfileType: DockerfileType;
  workingDirectory: string;

  constructor(workingDirectory: string, dockerfileType: DockerfileType) {
    this.workingDirectory = workingDirectory;
    this.dockerfileType = dockerfileType;
  }

  static async buildImage(dockerfileType: DockerfileType) {
    const dockerfilePath = tmp.fileSync().name;
    await writeFile(dockerfilePath, this.dockerfileContents(dockerfileType));
    await ShellCommandExecutor.execute(`docker buildx -t course-sdk-${dockerfileType} -f ${dockerfilePath} .`, {
      prefix: ansiColors.yellow("[docker-build] "),
    });
  }

  async exec(command: string) {
    let quotedCommand = command.replace(/"/g, '\\"')
    await ShellCommandExecutor.execute(`docker run --rm -v ${this.workingDirectory}:/workdir -w /workdir course-sdk-${this.dockerfileType} sh -c "${quotedCommand}"`);
  }

  // Returns the path to a file inside the container
  containerPath(filePath: string): string {
    return path.relative(this.workingDirectory, filePath);
  }

  static dockerfileContents(dockerfileType: DockerfileType): string {
    return {
      "js-tools": fs.readFileSync(jsToolsDockerfile).toString(),
      "go-tools": fs.readFileSync(goToolsDockerfile).toString(),
      "rust-tools": fs.readFileSync(rustToolsDockerfile).toString(),
      "docker-tools": fs.readFileSync(dockerToolsDockerfile).toString(),
    }[dockerfileType];
  }
}
