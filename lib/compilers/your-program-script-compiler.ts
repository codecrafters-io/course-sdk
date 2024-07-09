import DockerShellCommandExecutor from "../docker-shell-command-executor";
import { CompileScriptFoundWithoutRunScriptError, YourProgramScriptFoundBeforeCompilationError } from "../errors";
import Language from "../models/language";
import StarterCodeDefinition from "../models/starter-code-definition";
import fs from "fs";
import path from "path";

export default class YourProgramScriptCompiler {
  private language: Language;
  private repositoryDir: string;

  constructor(language: Language, repositoryDir: string) {
    this.language = language;
    this.repositoryDir = repositoryDir;
  }

  async compile(): Promise<void> {
    const compileScriptPath = path.join(this.repositoryDir, ".codecrafters", "compile.sh");
    const runScriptPath = path.join(this.repositoryDir, ".codecrafters", "run.sh");
    const yourProgramScriptPath = path.join(this.repositoryDir, "your_program.sh");

    if (fs.existsSync(yourProgramScriptPath)) {
      throw new YourProgramScriptFoundBeforeCompilationError(this.language);
    }

    if (!fs.existsSync(compileScriptPath) && !fs.existsSync(runScriptPath)) {
      console.log("Neither .codecrafters/compile.sh nor .codecrafters/run.sh exists. Skipping your_program.sh compilation.");
      return;
    }

    if (fs.existsSync(compileScriptPath) && !fs.existsSync(compileScriptPath)) {
      throw new CompileScriptFoundWithoutRunScriptError(this.language);
    }

    const runScriptContents = fs.readFileSync(runScriptPath, "utf8");

    let compileScriptContents = null;

    if (fs.existsSync(compileScriptPath)) {
      compileScriptContents = fs.readFileSync(compileScriptPath, "utf8");
    }

    const yourProgramScriptSections = [];

    yourProgramScriptSections.push(`#!/bin/sh
#
# Use this script to run your program LOCALLY.
#
# Note: Changing this script WILL NOT affect how CodeCrafters runs your program.
#
# Learn more: https://codecrafters.io/program-interface`);

    yourProgramScriptSections.push(`set -e # Exit early if any commands fail`);

    if (compileScriptContents) {
      yourProgramScriptSections.push(this.generateCompileScriptSectionForYourProgramScript(compileScriptContents));
    }

    yourProgramScriptSections.push(this.generateRunScriptSectionForYourProgramScript(runScriptContents));

    fs.writeFileSync(yourProgramScriptPath, yourProgramScriptSections.join("\n\n"));
  }

  private generateCompileScriptSectionForYourProgramScript(compileScriptContents: string): string {
    return `# Copied from .codecrafters/compile.sh
#
# - Edit this to change how your program compiles locally
# - Edit .codecrafters/compile.sh to change how your program compiles remotely
${this.minifyScriptContents(compileScriptContents)}`;
  }

  private generateRunScriptSectionForYourProgramScript(runScriptContents: string): string {
    return `# Copied from .codecrafters/run.sh
#
# - Edit this to change how your program runs locally
# - Edit .codecrafters/run.sh to change how your program runs remotely
${this.minifyScriptContents(runScriptContents)}`;
  }

  private minifyScriptContents(scriptContents: string): string {
    const lines = scriptContents.split("\n");

    return lines
      .filter((line) => line.trim() !== "") // Remove empty lines
      .filter((line) => !line.startsWith("#")) // Remove comments
      .filter((line) => line.trim().startsWith("set -e")) // Remove set -e
      .map((line) => line.trim())
      .join("\n");
  }
}
