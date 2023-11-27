import { Command, Argument } from "@commander-js/extra-typings";
import CompileCommand from "./commands/compile";
import TestCommand from "./commands/test";
import { Option } from "commander";

const program = new Command();

program.name("course-sdk").description("CLI to develop & test CodeCrafters challenges").version("0.1.0");

program
  .command("compile")
  .description("Compile starter code & solutions")
  .addArgument(new Argument("[language]", "language to compile for. Example: 'go'").default("", "All languages"))
  .action(async (languageFilter) => {
    await new CompileCommand(languageFilter).run();
  });

program
  .command("test")
  .description("Test starter code & solutions")
  .addArgument(new Argument("[language]", "language to test for. Example: 'go'").default("", "All languages"))
  .option("--no-compile", "Disable compiling starter code & solutions before testing")
  .action(async (languageFilter, options) => {
    if (options.compile) {
      console.log("Compiling... (use --no-compile to skip)");
      await new CompileCommand(languageFilter).run();
    } else {
      console.log("Skipping compilation");
    }

    await new TestCommand(languageFilter).run();
  });

program.parse();
