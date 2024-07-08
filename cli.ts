import AddLanguageCommand from "./commands/add-language";
import BuildAndRunCommand from "./commands/build-and-run";
import ClearCacheCommand from "./commands/clear-cache";
import CompileCommand from "./commands/compile";
import LintCommand from "./commands/lint";
import TestCommand from "./commands/test";
import { Argument, Command } from "@commander-js/extra-typings";

const program = new Command();

program.name("course-sdk").description("CLI to develop & test CodeCrafters challenges").version("0.1.4");

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
  .command("build-and-run", { hidden: true }) // Used for internal testing
  .description(
    'Build dockerfile for any language, then run a command and validate its output. Example: \'course-sdk build-and-run go "go version" stdout "go version"\'. This command will build the dockerfile for go, run "go version" and assert that the stdout stream contains "go version"'
  )
  .addArgument(new Argument("[language]", "language to test for. Example: 'go'. Use 'all' to test all languages").argRequired())
  .addArgument(new Argument("[commandToExecute]", "command to execute. Example: 'go version'").argRequired())
  .addArgument(new Argument("[outputStreamType]", "output stream type. Example: 'stdout', 'stderr'").argRequired())
  .addArgument(new Argument("[expectedOutput]", "expected output. Example: 'go version'").argRequired())
  .action(async (languageFilter, commandToExecute, outputStreamType, expectedOutput) => {
    if (languageFilter === "all") {
      languageFilter = "";
    }

    await new BuildAndRunCommand(languageFilter, commandToExecute, outputStreamType, expectedOutput).run();
  });

program
  .command("add-language")
  .description("Add a language to this course")
  .addArgument(new Argument("[language]", "language to add. Example: 'go'").argRequired())
  .action(async (languageSlug) => {
    await new AddLanguageCommand(languageSlug).run();
  });

program
  .command("clear-cache")
  .description("Clear caches used by other commands")
  .action(async () => {
    await new ClearCacheCommand().run();
  });

program.parse();
