---
name: Add Language Support
description: Adds support for a new language to a Codecrafters course by generating starter code, compiling, and testing until successful. Use this skill when the user wants to add support for a new language (e.g., 'Add support for Rust').
compatibility: Requires bun, docker, and `course-sdk` CLI (read installation instructions at https://github.com/codecrafters-io/course-sdk.git).
---

# Goal
Add fully functioning support for a new programming language to the current course repository.

# Procedure

## 1. Environment Setup
Ensure all necessary tools are installed before proceeding:
1. **Bun:** Check if Bun is installed. If not, run `curl -fsSL https://bun.sh/install | bash` and source the shell configuration (e.g., `source ~/.bashrc`).
2. **Docker:** Ensure Docker is installed. Start and verify the daemon:
   - `sudo service docker start`
   - `sudo docker info`
3. **course-sdk:** Check if `course-sdk` is installed. If not, run `bun install` and `make install` in the repository root to compile the SDK.

## 2. Initialization
Execute this SDK command to scaffold the basic directory structure:
`course-sdk add-language <LANGUAGE>`

## 3. Pattern Analysis & Implementation
You must ensure the new language follows the exact implementation patterns of existing languages in this course.
1. **Read** the `starter_templates` directory of 2-3 existing working languages (e.g., `starter_templates/go`, `starter_templates/python`) to understand the challenge logic, SDKs, dependencies, and patterns.
2. **Resolve dependencies for the new language:** If existing starters use a vendor SDK (e.g. OpenAI), first check whether that vendor provides an official client for the target language. Use the vendor's official SDK for that language if it exists; only then fall back to a community or "most similar" SDK.
3. **Read** the newly generated starter file for the target language (in `starter_templates/<LANGUAGE>`).
4. **Edit** the target language's source code to implement the necessary boilerplate and "Stage 1" logic.
   - *Constraint:* STOP after Stage 1. Do not implement Stage 2, Stage 3, or any further logic.
   - *Constraint:* Prefer the same vendor's official SDK in the new language. If no official SDK exists for that language, use the most similar community SDK or dependency.
   - *Constraint:* Keep it minimal and matching the simplicity of other starter templates and don't complicate it with things not present in the other starter templates (e.g. extra functions when others have only one main function)
   - *Constraint:* Ignore any "DON'T EDIT THIS!" comments in the starter template.

## 4. The Iteration Loop (Compile & Test)
Repeat this process until tests pass:

1. **Compile**: Run `sudo -E course-sdk compile <LANGUAGE>`.
   - *If it fails:* Read the error output, analyze the source code, fix the syntax/build error, and retry.
2. **Test**: Run `sudo -E course-sdk test <LANGUAGE>`. Do not timeout.
   - *Constraint:* Verify ONLY the first stage. If Stage 1 passes, the task is complete. Do not attempt to fix or run tests for subsequent stages.
   - *If it fails:* Compare the expected output vs. actual output. Check how other languages handle this specific test case. Adjust the code and retry.

## 5. Final Verification
Once `sudo -E course-sdk test <LANGUAGE>` passes Stage 1, run a final comparison:
- Ensure no logic for Stage 2 or later is present in the solutions.
- Check if the code style is clean.
- Ensure no unnecessary files were created.
- Confirm the implementation matches the simplicity of other starter templates.