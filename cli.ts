import { Command, Argument } from "@commander-js/extra-typings";
import CompileCommand from "./commands/compile";

const program = new Command();

program
  .name("course-sdk")
  .description("CLI to develop & test CodeCrafters challenges")
  .version("0.1.0");

program
  .command("compile")
  .description("Compile starter code & solutions")
  .addArgument(
    new Argument(
      "[language]",
      "language to compile for. Example: 'go'"
    ).default("", "All languages")
  )
  .action((languageFilter) => {
    new CompileCommand(languageFilter).run();
  });

program.parse();
