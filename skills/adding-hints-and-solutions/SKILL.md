---
name: Add Stage Hints and Solutions
description: Creates solutions and hints for specific base stages of a Codecrafters course in a given language. Use this skill when the user wants to implement solutions for stages beyond Stage 1 (e.g., 'Add solutions for stages 2-5 in Rust').
compatibility: Requires bun, docker, and `course-sdk` CLI (read installation instructions at https://github.com/codecrafters-io/course-sdk.git).
---

# Goal
Implement working solutions and hints for specified base stages of a programming language that already has Stage 1 support in the course.

# Procedure

## 1. Environment Setup
Ensure all necessary tools are installed before proceeding:
1. **Bun:** Check if Bun is installed. If not, run `curl -fsSL https://bun.sh/install | bash` and source the shell configuration (e.g., `source ~/.bashrc`).
2. **Docker:** Ensure Docker is installed. Start and verify the daemon:
   - `sudo service docker start`
   - `sudo docker info`
3. **course-sdk:** Check if `course-sdk` is installed. If not, run `bun install` and `make install` in the repository root to compile the SDK.

## 2. Gather Context
Before writing any code, understand what you're building:
1. **Identify the target language and stages** from the user's request (e.g., "Add solutions for base stages 2-5 in Rust").
2. **Read the stage descriptions** (`stage_descriptions/base-<stage-number>-<stage-slug>.md` or equivalent) to understand what each requested stage expects — inputs, expected outputs, and behavior.
3. **Read existing solutions in 2-3 reference languages** (e.g., `solutions/python/`, `solutions/go/`, `solutions/rust/`) for each requested stage. Pay close attention to:
   - The code diff or progression from one stage to the next.
   - The `/code/config.yml` structure — how `hints` are written for each stage.
   - Any stage-specific patterns (e.g., new files introduced, dependency changes).
4. **Read the compiled starter for the target language** at `compiled_starters/<LANGUAGE>/` — this is the baseline code that students begin with from Stage 1.

## 3. Set Up the Solutions Directory
1. **Check if `solutions/<LANGUAGE>/` already exists.** If not, create it.
2. **Copy the compiled starter** as the base:
   - Copy the contents of `compiled_starters/<LANGUAGE>/` into the first stage's `code/` directory (match the naming convention used by reference languages, e.g., `solutions/<LANGUAGE>/02-<stage-slug>/code/`).
   - *Constraint:* Always verify the exact directory naming convention by inspecting an existing language's `solutions/` folder. Stage directories typically follow a pattern like `01-<slug>/`, `02-<slug>/`, etc.
3. **Create `solutions/<LANGUAGE>/code/config.yml`**: Use an existing language's `config.yml` as a template for the structure.

## 4. Implement Solutions Stage-by-Stage
For each requested stage, in order:

1. **Create the stage directory** following the naming convention from reference languages (e.g., `solutions/<LANGUAGE>/<NN>-<stage-slug>/code/`).
2. **Copy the previous stage's code** as the starting point:
   - For the first stage being implemented: copy from `compiled_starters/<LANGUAGE>/`.
   - For subsequent stages: copy from the previous stage's `code/` directory in `solutions/<LANGUAGE>/`.
3. **Read the reference implementations** for this specific stage in other languages to understand the expected logic.
4. **Implement the solution** for this stage only — the minimal code change needed to pass this stage's tests.
   - *Constraint:* Each stage's solution should be an incremental diff from the previous stage. Do NOT include logic for future stages.
   - *Constraint:* Match the code style and complexity of reference implementations. Keep it minimal.
   - *Constraint:* Use the same SDKs/dependencies established in the language's Stage 1 implementation.
   - *Constraint:* Do NOT manually edit files in `compiled_starters/`. Only work in `solutions/<LANGUAGE>/`.

## 5. Write Hints
For each requested stage, add hints to `solutions/<LANGUAGE>/config.yml`:
1. **Study the hints** written for the same stages in reference languages' `config.yml` files.
2. **Write hints** that follow the same structure, tone, and level of detail as the reference hints.
   - Match the formatting convention (e.g., markdown in YAML strings, number of hints per stage).
   - Tailor hints to the target language's idioms, standard library, and SDK usage.
3. **Ensure the `config.yml` is valid YAML** — watch for indentation, multiline strings, and special characters.

## 6. The Iteration Loop (Compile & Test)
For each stage, repeat until tests pass:

1. **Compile**: Run `sudo -E course-sdk compile <LANGUAGE>`.
   - *If it fails:* Read the error output, fix the issue in the solution code, and retry.
2. **Test**: Run `sudo -E course-sdk test <LANGUAGE>`.
   - *If the current stage fails:* Compare expected vs. actual output. Cross-reference with how reference languages handle the test case. Adjust and retry.
   - **Contraint**: The previous stage solutions are guaranteed to not be the problem so do not change them.
3. **Move to the next stage** only after the current stage passes.

## 7. Final Verification
Once all requested stages pass:
1. Run a full `sudo -E course-sdk test <LANGUAGE>` to confirm all implemented stages pass together.
2. **Review each stage's solution** to ensure:
   - Each stage is an incremental, minimal change from the previous one.
   - No future-stage logic leaked into earlier stages.
   - Code style is clean and consistent with reference implementations.
   - No unnecessary files were created.
3. **Review `config.yml`** to ensure:
   - Hints exist for every requested stage.
   - YAML is valid and properly formatted.
   - Hint content is helpful, accurate, and matches the tone of reference languages.