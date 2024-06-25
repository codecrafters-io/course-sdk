import { Command, Argument } from "@commander-js/extra-typings";
import CompileCommand from "./commands/compile";
import LintCommand from "./commands/lint";
import TestCommand from "./commands/test";
import ValidateCommand from "./commands/validate";

const program = new Command();

program.name("course-sdk").description("CLI to develop & test CodeCrafters challenges").version("0.1.3");

program
  .command("compile")
  .description("Compile starter code & solutions")
  .addArgument(new Argument("[language]", "language to compile for. Example: 'go'").default("", "All languages"))
  .action(async (languageFilter) => {
    await new CompileCommand(languageFilter).run();
  });

program
  .command("lint")
  .description("Lint starter code & solutions")
  .action(async () => {
    await new LintCommand().run();
  });

program
  .command("test")
  .description("Test starter code & solutions")
  .addArgument(new Argument("[language]", "language to test for. Example: 'go'. Use 'all' to test all languages").argRequired())
  .option("--no-compile", "Disable compiling starter code & solutions before testing")
  .action(async (languageFilter, options) => {
    if (languageFilter === "all") {
      languageFilter = "";
    }

    if (options.compile) {
      console.log("Compiling... (use --no-compile to skip)");
      await new CompileCommand(languageFilter).run();
    } else {
      console.log("Skipping compilation");
    }

    await new TestCommand(languageFilter).run();
  });

program
  .command("check-go")
  .description("Check Go is present and configured correctly. This is required in the shell challenge, where we need go to build the custom executable.")
  .addArgument(new Argument("[language]", "language to test for. Example: 'go'. Use 'all' to test all languages").argRequired())
  .action(async (languageFilter) => {
    if (languageFilter === "all") {
      languageFilter = "";
    }
    
    let commandToExecute = "go version"
    let outputStreamType = "stdout"
    let expectedOutput = "go version"
    await new ValidateCommand(languageFilter, commandToExecute, outputStreamType, expectedOutput).run();
  });

program.parse();
