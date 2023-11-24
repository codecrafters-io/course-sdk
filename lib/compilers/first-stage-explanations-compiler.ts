import Mustache from "mustache";
import Course from "../models/course";
import Language from "../models/language";
import StarterCodeUncommenter from "../starter-code-uncommenter";
import * as fs from "fs";
import * as path from "path";
import Unindenter from "../unindenter";
import { glob } from "glob";

const EXPLANATION_TEMPLATE = `The entry point for your {{course_short_name}} implementation is in \`{{{entry_point_file}}}\`.

Study and uncomment the relevant code:

{{#uncommented_code_blocks}}
\`\`\`{{language_syntax_highlighting_identifier}}
{{{code}}}
\`\`\`

{{/uncommented_code_blocks}}

Push your changes to pass the first stage:

\`\`\`
git add .
git commit -m "pass 1st stage" # any msg
git push origin master
\`\`\`
`;

export class FirstStageExplanationsCompiler {
  private course: Course;

  constructor(course: Course) {
    this.course = course;
  }

  async compileAll() {
    for (const dir of this.#starterRepositoryDirectories()) {
      console.log(
        `- compiling first stage explanations for ${path.basename(dir)}`
      );
      await this.compileForStarterRepositoryDirectory(dir);
    }
  }

  compileForLanguage(language: Language): void {
    this.#starterRepositoryDirectories()
      .filter(
        (starterRepositoryDirectory) =>
          path.basename(starterRepositoryDirectory).split("-").pop() ===
          language.slug
      )
      .forEach((starterRepositoryDirectory) =>
        this.compileForStarterRepositoryDirectory(starterRepositoryDirectory)
      );
  }

  async compileForStarterRepositoryDirectory(
    starterRepositoryDirectory: string
  ) {
    const language = Language.findBySlug(
      path.basename(starterRepositoryDirectory).split("-").pop() as string
    );

    const explanationFilePath = path.join(
      this.course.solutionsDir,
      language.slug,
      this.course.firstStage.solutionDir,
      "explanation.md"
    );

    if (fs.existsSync(explanationFilePath)) {
      fs.unlinkSync(explanationFilePath);
    }

    fs.mkdirSync(path.dirname(explanationFilePath), { recursive: true });

    const blocks = new StarterCodeUncommenter(
      starterRepositoryDirectory,
      language
    ).uncommentedBlocksWithMarkers();

    if (blocks.length === 0) {
      console.error(`
No uncommented blocks found in ${starterRepositoryDirectory}.
Are you sure there's a contiguous block of comments after the 'Uncomment this' marker?`);
      process.exit(1);
    }

    const processedBlocks = blocks.map((block) => {
      return {
        filePath: block.filePath,
        code: Unindenter.unindent(block.code),
      };
    });

    fs.writeFileSync(
      explanationFilePath,

      Mustache.render(EXPLANATION_TEMPLATE, {
        course_short_name: this.course.shortName,
        uncommented_code_blocks: processedBlocks,
        entry_point_file: processedBlocks[0].filePath,
        language_syntax_highlighting_identifier: language.slug,
      })
    );
  }

  #starterRepositoryDirectories(): string[] {
    return glob.sync(`${this.course.compiledStarterRepositoriesDir}/*`);
  }
}
