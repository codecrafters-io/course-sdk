# CodeCrafters Course Writing & Design Patterns Report

**Repos analyzed:**
- Git course: `/Users/yash/projects/codecrafters/_misc/build-your-own-git`
- Claude Code course: `/Users/yash/projects/codecrafters/_misc/build-your-own-claude-code`
- Git tester: `/Users/yash/projects/codecrafters/_misc/git-tester`
- Claude Code tester: `/Users/yash/projects/codecrafters/_misc/claude-code-tester`

---

## 1. STAGE DESCRIPTION ANATOMY

### Git (`build-your-own-git`) — recurring skeleton

**Early/middle stages (2–4)** follow this order:

1. **Opening objective** — one sentence, no heading: `In this stage, you'll …`
2. **`### [Concept block]`** — each wrapped in `<details><summary>Click to expand/collapse</summary>`
3. **`### Tests`** — bash command walkthrough
4. **`### Notes`** — bullet list of scope limits + optional `{{#lang_is_python}}` templating blocks

**Literal heading names (stages 2–4, in order):**
- `### Git objects` → `### Git Object Storage` → `### Blob Object Storage` → `### The cat-file command` → `### Tests` → `### Notes` (stage 2)
- `### The git hash-object command` → `### Blob Object Storage (Recap)` → `### Tests` → `### Notes` (stage 3)
- `### Tree objects` → `### The ls-tree command` → `### Tree Object Storage` → `### Tests` → `### Notes` (stage 4)

**Later git stages (5–7)** drop collapsibles; headings become flat:
- Stage 5: `### Tree Object Storage (recap)` → `### The \`<mode>\` Field` → `### The \`git write-tree\` Command` → `### Tests` → `### Notes`
- Stage 6: `### Commits` → `### The \`git commit-tree\` Command` → `### Tests` → `### Notes`
- Stage 7: no concept headings — only intro + `### Tests`

**Stage 1 anomaly:** Almost everything is inside an HTML comment block. The **only visible content** is the opening paragraph (~42 words). The full skeleton (Tests, Notes, collapsible sections) exists but is commented out:

```1:1:/Users/yash/projects/codecrafters/_misc/build-your-own-git/stage_descriptions/base-01-gg4.md
All the data for a Git repository — from its commit history to its configuration — lives inside a hidden folder called `.git`. It's created when you initialize a new repository with `git init`. In this stage, you'll implement that command yourself.
```

**Word counts (git, including commented HTML in stage 1):**

| File | Words |
|------|-------|
| base-01-gg4.md | 384 (42 visible) |
| base-02-ic4.md | 764 |
| base-03-jt4.md | 393 |
| base-04-kp1.md | 735 |
| base-05-fe4.md | 693 |
| base-06-jm9.md | 432 |
| base-07-mg6.md | 191 |

Typical git stage (excluding stage 1 outlier and stage 7 capstone): **400–760 words**.

---

### Claude Code (`build-your-own-claude-code`) — recurring skeleton

**Stages 2–6** follow a tighter, always-expanded pattern:

1. **Opening objective** — `In this stage, you'll …`
2. **`### [Concept block]`** — always visible, never in `<details>`
3. **Numbered sub-steps** where execution is involved (`1. Parse… 2. Write…`)
4. **`### Tests`** — command + bullet list of verifications
5. **`### Notes`** — scope limits

**Literal heading names (stages 2–6):**
- Stage 2: `### Tools` → `### Advertising Tools` → `### Tests` → `### Notes`
- Stage 3: `### Tool Calls` → `### Executing the \`Read\` Tool` → `### Tests` → `### Notes`
- Stage 4: `### The Agent Loop` → `### Tests` → `### Notes`
- Stage 5: `### The \`Write\` Tool` → `### Executing the \`Write\` Tool` → `### Tests` → `### Notes`
- Stage 6: `### The \`Bash\` Tool` → `### Executing the \`Bash\` Tool` → `### Tests` → `### Notes`

**Stage 1 anomaly:** One sentence only. **No `### Tests`, no `### Notes`.**

```1:1:/Users/yash/projects/codecrafters/_misc/build-your-own-claude-code/stage_descriptions/base-01-yy2.md
Claude Code uses a REST API to communicate with the Large Language Model (LLM). In this stage, you'll communicate with the provided LLM using an [OpenAI-compatible API](https://openrouter.ai/docs/quickstart#using-the-openrouter-api).
```

**Word counts (claude-code):**

| File | Words |
|------|-------|
| base-01-yy2.md | 27 |
| base-02-aq1.md | 401 |
| base-03-md6.md | 477 |
| base-04-ff2.md | 557 |
| base-05-oz7.md | 268 |
| base-07-oq5.md | 340 |

Typical claude stage (excluding stage 1): **270–560 words** — shorter and more uniform than git.

---

### Style delta (git → claude-code)

| Dimension | Git (old) | Claude Code (new) |
|-----------|-----------|-------------------|
| Collapsible `<details>` | Heavy in stages 2–4 | Never used |
| Tests section | Present (except stage 1 commented out, stage 7 minimal) | Always present from stage 2 onward; **missing entirely in stage 1** |
| Notes section | Always present when Tests is present | Always present from stage 2 onward |
| Verification bullets under Tests | Rare (stage 3 has bullets; most just narrate commands) | **Always** — explicit bullet list of what tester checks |
| Language-specific hints | `{{#lang_is_python}}` templating | None — language-agnostic |
| JSON/API examples | N/A | Full request/response schemas, diff blocks |
| Pseudocode | N/A | Python pseudocode for agent loop |
| Continuity references | "In the previous stage…", "As mentioned in the previous stage…" | "In previous stages…", "In later stages…" |
| Capstone stage | "You're on your own" + external links only | N/A (bash tool is last, fully specified) |
| Course-level FAQ | None | 4 FAQ entries in `course-definition.yml` |

---

## 2. OBJECTIVE / SCOPE PER STAGE

### Git — concepts and phrasing

| # | Name | Difficulty | Objective phrasing | Continuity |
|---|------|------------|-------------------|------------|
| 1 | Initialize the .git directory | very_easy | "In this stage, you'll implement that command yourself." | None — assumes user knows what `git init` is |
| 2 | Read a blob object | medium | "In this stage, you'll add support for reading a blob using the `git cat-file` command." | Introduces Git objects taxonomy with "(Future stages)" labels |
| 3 | Create a blob object | medium | "In this stage, you'll implement support for creating a blob using the `git hash-object` command." | None in opening; recap section says "As mentioned in the previous stage" |
| 4 | Read a tree object | medium | "In this stage, you'll implement the `git ls-tree` command…" | Assumes blob read/write knowledge |
| 5 | Write a tree object | medium | "In this stage, you'll implement writing a tree to the `.git/objects` directory." | "As a recap" for tree format |
| 6 | Create a commit | medium | "In this stage, you'll implement the `git commit-tree` command…" | "The last git object we'll be dealing with" |
| 7 | Clone a repository | hard | "In this stage, you'll implement cloning a public repository from GitHub." | "This is the last stage… probably the hardest across all of CodeCrafters!" |

**Prior-knowledge assumption (git):** Git assumes familiarity with Git CLI concepts (`init`, `cat-file`, `hash-object`, `ls-tree`, `write-tree`, `commit-tree`, staging area). Stage 2 opens with a full Git objects taxonomy. Stage 5 explains staging area but says "you will not implement a staging area." Binary format details (zlib, null bytes, raw 20-byte SHAs vs hex) are taught inline — the course teaches Git internals, not just command wiring.

**Continuity quote examples:**

> "In the previous stage, we learnt how to read a blob. In this stage, we'll persist a blob by implementing the `git hash-object` command."  
> — `course-definition.yml` marketing_md for stage 3

> "As mentioned in the previous stage, each Git Blob is stored as a separate file…"  
> — `/Users/yash/projects/codecrafters/_misc/build-your-own-git/stage_descriptions/base-03-jt4.md`

> "Now that we've learnt how to read/write blobs, let's move onto our next Git object: the tree."  
> — `course-definition.yml` marketing_md for stage 4

---

### Claude Code — concepts and phrasing

| # | Name | Difficulty | Objective phrasing | Continuity |
|---|------|------------|-------------------|------------|
| 1 | Communicate with the LLM | very_easy | "In this stage, you'll communicate with the provided LLM using an OpenAI-compatible API." | None |
| 2 | Advertise the read tool | easy | "In this stage, you'll add support for advertising the `Read` tool in the request." | "For this stage, you only need to advertise… (you'll implement it in later stages)" |
| 3 | Execute the read tool | easy | "In this stage, you'll add support for detecting tool calls and executing the `Read` tool call." | "In previous stages, you printed the message content directly…" |
| 4 | Implement the agent loop | medium | "In this stage, you'll implement an agent loop." | "So far, your program handles a single interaction…" |
| 5 | Implement the write tool | easy | "In this stage, you'll add support for the `Write` tool." | "Like with the `Read` tool…" |
| 6 | Implement the bash tool | easy | "In this stage, you'll add support for the `Bash` tool." | Assumes agent loop + prior tools |

**Prior-knowledge assumption (claude-code):** Lower bar on domain knowledge. Course FAQ explicitly states: "You don't need any prior experience with LLMs or machine learning." Concepts (tools, tool_calls, agent loop) are defined in-place. Starter code is referenced ("edit the existing request in the starter code"). The course teaches the *pattern* of building an AI agent, not LLM theory.

**Continuity quote:**

> "In previous stages, you printed the message content directly to stdout. Now that the model's response can include tool calls, you should **only print the message content if there's no `tool_calls` array** in the response."  
> — `base-03-md6.md`

> "Do not print raw file contents when executing the Read tool. This differs from the behavior in the 'Execute the read tool' stage."  
> — `base-04-ff2.md` (explicit behavior change across stages)

---

## 3. EXTENSION COMPOSITION & PROGRESSION ARC

Both courses use a single implicit `base` extension (files prefixed `base-NN-<slug>.md`).

### Git arc: `init → read blob → create blob → read tree → write tree → commit → clone`

**Why read-before-write:**
- Stage 2 (read blob) teaches object storage path derivation, zlib decompression, header format `blob <size>\0<content>`, and the plumbing command pattern — all without requiring the user to implement hashing/compression.
- Stage 3 (create blob) reuses the format from stage 2's recap; user now implements the inverse operation (compress, hash, write).
- Same pattern for trees: stage 4 (read/parse tree binary format, `--name-only` output) before stage 5 (write tree from working directory).
- Commits (stage 6) require trees (stage 5) and build on the header pattern established in stages 2–5.
- Clone (stage 7) is last because it requires understanding all object types + network transfer protocol + packfiles — it's an integration capstone that can't be decomposed further in the current single-stage design.

**Difficulty curve:** `very_easy → medium × 5 → hard`. Only two difficulty tiers used (plus one very_easy).

### Claude Code arc: `LLM API → advertise tool → execute tool → agent loop → write tool → bash tool`

**Arc logic:**
1. **Stage 1:** Prove you can hit the API and get a response (simplest possible win).
2. **Stage 2:** Add declarative tool schema to the request (no execution yet).
3. **Stage 3:** Parse `tool_calls` from response, execute one tool, print result (single-turn).
4. **Stage 4:** Multi-turn loop — send tool results back to model, iterate until done (the core agent pattern).
5. **Stages 5–6:** Add Write and Bash tools using the loop infrastructure from stage 4.

**Why agent loop before write/bash:** Write and Bash require multi-step reasoning (read README → create file; list files → delete old readme). These are impossible without the loop from stage 4.

**Difficulty curve:** `very_easy → easy × 4 → medium × 1`. More granular difficulty labels; only one "medium" stage (agent loop), which is the conceptual hinge.

---

## 4. EXAMPLES

### Git examples (binary/zlib/concrete values)

**Blob format with concrete values:**
```
blob 11\0hello world
```
— `base-02-ic4.md`, `base-03-jt4.md`

**Object hash path derivation:**
```bash
.git/objects/e8/8f7a929cd70b0274c4ea33b209c97fa845fdbc
```
— `base-02-ic4.md`

**hash-object workflow with concrete SHA:**
```bash
$ echo -n "hello world" > test.txt
$ git hash-object -w test.txt
95d09f2b10159347eece71399a7e2e907ea3df4f
$ file .git/objects/95/d09f2b10159347eece71399a7e2e907ea3df4f
.git/objects/95/d09f2b10159347eece71399a7e2e907ea3df4f: zlib compressed data
```
— `base-03-jt4.md`

**Tree binary format (with readability disclaimer):**
```
tree <size>\0
<mode> <name>\0<20_byte_sha>
<mode> <name>\0<20_byte_sha>
```
— `base-04-kp1.md`, `base-05-fe4.md`

**Commit object example:**
```
commit 177\0tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904
parent 3b18e512dba79e4c8300dd08aeb37f8e728b8dad
author John Doe <john@example.com> 1234567890 +0000
committer John Doe <john@example.com> 1234567890 +0000

Initial commit
```
— `base-06-jm9.md`

**Pattern:** Mix of concrete values (`hello world`, `blob 11`, real-looking SHAs) and placeholders (`<tree_sha>`, `<20_byte_sha>`, `<blob_sha_1>`). Binary concepts shown as escaped null bytes (`\0`) and explicit byte-length notes.

---

### Claude Code examples (JSON/API/multi-turn)

**Request diff block (advertising tools):**
```diff
 {
   "model": "...",
   "messages": [...],
+  "tools": [<tool1 spec>, <tool2 spec>, ...]
 }
```
— `base-02-aq1.md`

**Full Read tool JSON schema:**
```js
{
  "type": "function",
  "function": {
    "name": "Read",
    "description": "Read and return the contents of a file",
    "parameters": {
      "type": "object",
      "properties": {
        "file_path": {
          "type": "string",
          "description": "The path to the file to read"
        }
      },
      "required": ["file_path"]
    }
  }
}
```
— `base-02-aq1.md`

**Tool call response structure:**
```js
{
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "Read",
              "arguments": "{\"file_path\": \"/path/to/file.txt\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ]
}
```
— `base-03-md6.md`

**Agent loop pseudocode:**
```python
messages = [{ role: "user", content: prompt }]

loop:
    response = call_api(messages)
    append response message to messages

    if response has no tool_calls:
        print response.content
        exit

    for each tool_call in response.tool_calls:
        result = execute_tool(tool_call)
        append {
            role: "tool",
            tool_call_id: tool_call.id,
            content: result
        } to messages
```
— `base-04-ff2.md`

**Tool result message example:**
```js
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "# My Project\n\nChemical expiry period: 6 months"
}
```
— `base-04-ff2.md`

**Example count comparison:** Claude-code has **more and richer examples** per stage — full JSON payloads, diff syntax, pseudocode, and field-by-field annotation. Git has more *format-spec* examples (binary layouts) but fewer *workflow* examples. Claude-code stage 4 alone has 3 distinct code blocks showing the multi-turn conversation shape.

---

## 5. TESTS SECTION — verbatim quotes

### Git (3 examples)

**Stage 2 (`base-02-ic4.md`):**
```markdown
### Tests

The tester will first initialize a new git repository using your program, and then insert a blob with random contents into the `.git/objects` directory:

```bash
$ mkdir /tmp/test_dir && cd /tmp/test_dir
$ /path/to/your_program.sh init
$ echo "hello world" > test.txt # The tester will use a random string, not "hello world"
$ git hash-object -w test.txt
3b18e512dba79e4c8300dd08aeb37f8e728b8dad
```

After that, it'll run your program like this:

```bash
$ /path/to/your_program.sh cat-file -p 3b18e512dba79e4c8300dd08aeb37f8e728b8dad
hello world
```

The tester will verify that the output of your program matches the contents of the blob.
```

**Stage 5 (`base-05-fe4.md`):**
```markdown
### Tests

The tester will initialize a new Git repository using your program:

```bash
$ mkdir test_dir && cd test_dir
$ /path/to/your_program.sh init
```

It will then create some random files and directories:

```bash
$ echo "hello world" > test_file_1.txt
$ mkdir test_dir_1
$ echo "hello world" > test_dir_1/test_file_2.txt
$ mkdir test_dir_2
$ echo "hello world" > test_dir_2/test_file_3.txt
```

And then run your program like this:

```bash
$ /path/to/your_program.sh write-tree
4b825dc642cb6eb9a060e54bf8d69288fbee4904
```

You're expected to write the entire working directory as a tree object and print the 40-character SHA-1 hash to stdout.

The tester will verify that the output of your program matches the SHA-1 hash of the tree object that the official `git` implementation would write.
```

**Stage 7 (`base-07-mg6.md`):**
```markdown
### Tests

The tester will run your program like this:

```bash
$ /path/to/your_program.sh clone https://github.com/blah/blah <some_dir>
```

Your program must create `<some_dir>` and clone the given repository into it.

To verify your changes, the tester will:

- Check the contents of a random file
- Read commit object attributes from the `.git` directory
```

**Git Tests section pattern:** Narrates setup → shows exact command → states one verification sentence. Rarely lists multiple assertion bullets. Uses placeholder paths (`/path/to/your_program.sh`, `blah/blah`). Explicitly notes randomization ("The tester will use a random string").

---

### Claude Code (3 examples)

**Stage 2 (`base-02-aq1.md`):**
```markdown
### Tests

The tester will execute your program like this:

```bash
$ ./your_program.sh -p "How many tools are available to you in this request? Number only."
1
```

The tester will verify that:

- Your program outputs a positive number
- Your program exits with exit code `0`
```

**Stage 4 (`base-04-ff2.md`):**
```markdown
### Tests

The tester will create a Python project with:
- `README.md`
- Two Python files in `app/` with randomized names

The tester will then execute your program like this:

```bash
$ ./your_program.sh -p "Use README.md to determine the chemical expiry period in months. Number only."
<expiry period in months>
```

The tester will verify that:
- The output is the correct expiry period
- Your program exits with exit code `0`
```

**Stage 6 (`base-07-oq5.md`):**
```markdown
### Tests

The tester will create three files:
  - `app/main.js` - Main project file
  - `README.md` - The current readme file
  - `README_old.md` - An old readme file

The tester will then execute your program like this:

```bash
$ ./your_program.sh -p "Delete the old readme file."
Deleted README_old.md
```

The tester will verify that:
  - `README_old.md` has been deleted (no longer exists)
  - `app/main.js` remains intact with its original contents
  - `README.md` remains intact with its original contents
  - Your program exits with code `0`
```

**Claude Tests section pattern:** Always includes explicit verification bullet list. Shows expected stdout inline. Describes fixture setup (files created). Uses `./your_program.sh -p "..."` consistently.

---

## 6. TESTER DESIGN

### Git tester architecture

- **Definition:** `/Users/yash/projects/codecrafters/_misc/git-tester/internal/tester_definition.go` — 7 test cases, no timeouts configured, executable `your_program.sh` (legacy `your_git.sh`).
- **Assertions:** Flat functions in `assertions.go` — `assertStdout`, `assertExitCode`, `assertEqual`, all using `Expected X, got: Y` format.
- **Randomization:** `random.RandomWord()`, `random.RandomString()`, `random.RandomWords(n)` for filenames and contents.
- **Reference implementation:** Official git (via go-git library or shell `git`) used to create expected objects, not user's code (except where testing user's command directly).

---

### Stage-by-stage mapping (4 git + 4 claude stages)

#### Git Stage 1 — `testInit` (`stage_init.go`)

**What tester does:**
1. Creates temp dir
2. Runs `./your_program.sh init`
3. Asserts dirs exist: `.git`, `.git/objects`, `.git/refs`
4. Asserts file exists: `.git/HEAD`
5. Asserts HEAD contents: `ref: refs/heads/main\n` OR `ref: refs/heads/master\n`
6. Logs success per check; on failure, dumps directory tree via `logDebugTree`

**Maps to description:** Matches commented-out Tests section in `base-01-gg4.md` (which users can't see). **Hidden assertion:** Must be directory not file for `.git/objects` etc.

**Granularity:** One behavior (init), ~5 filesystem assertions.

**Failure messages (verbatim):**
- `"Expected the %q directory to be created"`
- `"Expected %q to be a directory"`
- `"Expected the %q file to be created"`
- `"Expected %s to contain %q or %q, got %q"`

---

#### Git Stage 2 — `testReadBlob` (`stage_read_blob.go`)

**What tester does:**
1. Runs user's `init`
2. Creates random-named file with random contents
3. Inserts blob into `.git/objects` via go-git (NOT user's hash-object)
4. Runs user's `cat-file -p <sha>`
5. Asserts exit code 0, stdout equals exact file contents (no trailing newline)

**Maps to description:** 1:1 with Tests section. Uses random content as described.

**Granularity:** One behavior (read blob), 2 assertions (exit code + stdout).

**Complete function (verbatim):**

```17:88:/Users/yash/projects/codecrafters/_misc/git-tester/internal/stage_read_blob.go
func testReadBlob(harness *test_case_harness.TestCaseHarness) error {
	logger := harness.Logger
	executable := harness.Executable

	tempDir, err := os.MkdirTemp("", "worktree")
	if err != nil {
		return err
	}

	executable.WorkingDir = tempDir

	logger.Infof("$ ./%s init", path.Base(executable.Path))
	_, err = executable.Run("init")
	if err != nil {
		return err
	}

	sampleFile := path.Join(tempDir, fmt.Sprintf("%s.txt", random.RandomWord()))
	sampleFileContents := random.RandomString()
	err = os.WriteFile(
		sampleFile,
		[]byte(sampleFileContents),
		os.ModePerm,
	)
	if err != nil {
		return err
	}
	expectedSha := plumbing.ComputeHash(plumbing.BlobObject, []byte(sampleFileContents))

	storage := filesystem.NewObjectStorage(
		dotgit.New(osfs.New(path.Join(tempDir, ".git"))),
		cache.NewObjectLRU(0),
	)
	obj := storage.NewEncodedObject()
	obj.SetType(plumbing.BlobObject)
	writer, err := obj.Writer()
	if err != nil {
		return err
	}

	if _, err := writer.Write([]byte(sampleFileContents)); err != nil {
		return err
	}

	hash, err := storage.SetEncodedObject(obj)
	if err != nil {
		return err
	}

	if hash != expectedSha {
		panic("Expected sha doesn't match!")
	}

	logger.Infof("Added blob object to .git/objects: %s", expectedSha.String())

	logger.Infof("$ ./%s cat-file -p %s", path.Base(executable.Path), expectedSha.String())
	result, err := executable.Run("cat-file", "-p", expectedSha.String())
	if err != nil {
		return err
	}

	if err = assertExitCode(result, 0); err != nil {
		return err
	}

	if err = assertStdout(result, sampleFileContents); err != nil {
		return err
	}

	logger.Successf("Output is valid.")
	return nil
}
```

**Failure messages:**
- `"Expected 0 as exit code, got: %d"`
- `"Expected %q as stdout, got: %q"`

---

#### Git Stage 3 — `testCreateBlob` (`stage_create_blob.go`)

**What tester does:**
1. User's `init`
2. Random file with random contents
3. User's `hash-object -w <file>`
4. Assert exit code 0
5. Assert stdout is 40-char SHA
6. Verify blob file contents match official git format (zlib + header) via `BlobObjectVerifier`
7. Assert returned SHA matches expected SHA; on mismatch, prints multi-line hints about hash computation

**Undocumented in description:** The blob file format verification (not just the SHA string). Description says "matches what the official git implementation would write" — tester enforces this via byte-level comparison after zlib decompression.

**Failure messages (verbatim):**
- `"Expected a 40-char SHA: %s\nGot:                    %s"`
- `"Did not find file at %q"`
- `"The file at %q is not Zlib-compressed"`
- `"File at %q does not match official Git implementation"`
- `"Expected SHA: %q, got: %q"`
- Hint logs: `"Hint: Your blob file was valid, but the SHA is incorrect."` + 3 follow-up hints

---

#### Git Stage 5 — `testWriteTree` (`stage_write_tree.go`)

**What tester does:**
1. User's `init`
2. Creates random nested directory structure via `generateFiles()`
3. User's `write-tree`
4. Assert exit code 0, 40-char SHA output
5. Read user's tree object file from `.git/objects`
6. Compare decompressed bytes against official git's `write-tree` on identical directory
7. On mismatch, print byte diff visualization
8. Run `git ls-tree --name-only <sha>` as sanity check

**Undocumented:** Byte-level tree object comparison (description only mentions SHA match). Zlib compression is enforced ("This file must be zlib-compressed").

**Failure messages:**
- `"Expected a 40-char SHA as output. Got: %v"`
- `"Did you write the tree object? Did not find a file in .git/objects/<first 2 chars of sha>/<remaining chars of sha>"`
- `"Git object file doesn't match official Git implementation. Diff after zlib decompression:"`
- `"Expected %q as tree hash, got: %q"`

---

#### Git Stage 7 — `testCloneRepository` (`stage_clone_repository.go`)

**What tester does:**
1. Picks random repo from 3 hardcoded GitHub sample repos
2. Runs user's `clone <url> test_dir`
3. Assert exit code 0
4. Opens cloned repo with go-git
5. Reads random commit from hardcoded list — asserts author name is `"Paul Kuruvilla"`
6. Reads random file from hardcoded list — asserts exact file contents

**Undocumented in description:** Author name check (`"Paul Kuruvilla"`) is not mentioned in stage description at all.

**Complete function (verbatim, abbreviated middle):**

```79:140:/Users/yash/projects/codecrafters/_misc/git-tester/internal/stage_clone_repository.go
func testCloneRepository(harness *test_case_harness.TestCaseHarness) error {
	logger := harness.Logger
	executable := harness.Executable

	tempDir, err := os.MkdirTemp("", "worktree")
	if err != nil {
		return err
	}

	executable.WorkingDir = tempDir

	testRepo := randomRepo()

	logger.Infof("$ ./%s clone %s <testDir>", path.Base(executable.Path), testRepo.url)
	result, err := executable.Run("clone", testRepo.url, "test_dir")
	if err != nil {
		return err
	}

	if err = assertExitCode(result, 0); err != nil {
		return err
	}

	repoDir := path.Join(tempDir, "test_dir")
	r, err := git.PlainOpen(repoDir)
	if err != nil {
		return err
	}

	// Test a commit
	commit_sha := testRepo.randomCommit()

	logger.Infof("$ git cat-file commit %s", commit_sha)

	commit, err := r.CommitObject(plumbing.NewHash(commit_sha))
	if err != nil {
		return err
	}

	expected, actual := "Paul Kuruvilla", commit.Author.Name
	if expected != actual {
		return fmt.Errorf("Expected %q as author name, got: %q", expected, actual)
	}
	logger.Successf("Commit contents verified")

	// Test a file
	testFile := testRepo.randomFile()

	logger.Debugf("Reading contents of a sample file")
	bytes, err := os.ReadFile(path.Join(repoDir, testFile.path))
	if err != nil {
		return err
	}

	expected, actual = testFile.contents, string(bytes)
	if expected != actual {
		return fmt.Errorf("Expected %q as file contents, got: %q", expected, actual)
	}
	logger.Successf("File contents verified")

	return nil
}
```

---

### Claude Code tester architecture

- **Definition:** `/Users/yash/projects/codecrafters/_misc/claude-code-tester/internal/tester_definition.go` — 6 test cases with explicit timeouts (30s for stages 1–3, 45s for 4–6).
- **Infrastructure:** Proxy server to OpenRouter (`localhost:10000`), workspace manager, guard-rail prompts appended to user prompts, assertion library with interfaces.
- **Test case pattern:** `NonInteractiveTestCase` — run `-p <prompt>`, check exit code, run stdout assertion, optionally filesystem assertions after.
- **Randomization:** Random math operands, random prompt phrasing (4 variants per stage), random filenames, random expiry period (6–36 months).

---

#### Claude Stage 1 — `testPromptResponse`

**What tester does:**
1. Start proxy server, bootstrap workspace
2. Generate random math problem (operands 1–10, operator `+` or `*`)
3. Pick random prompt phrasing from 4 variants + guard rail "Respond with only a number."
4. Run `./your_program.sh -p "<prompt>"`
5. Assert exact stdout match to computed result, exit code 0

**Maps to description:** **No Tests section in stage description at all.** User has no documented expectation.

**Failure messages:**
- `"Expected program to exit with exit code %d, got %d instead"`
- `"Expected %q, got %q"`

---

#### Claude Stage 3 — `testExecuteReadTool`

**What tester does:**
1. Create random `.py` file with one of 3 fixed content strings
2. Random prompt phrasing asking to read that file + guard rail "Respond with only file contents, no surrounding text/backticks."
3. Assert exact stdout = file contents, exit code 0

**Maps to description:** 1:1. Description mentions `apple.py` as example; tester uses random word `.py`.

**Undocumented:** Guard rail prompt appended by tester is not in description.

---

#### Claude Stage 4 — `testAgentLoop`

**What tester does:**
1. Create README.md pointing to randomized Python files in `app/`
2. Create `app/<random>.py` with `chemical_expiry_period = <random 6-36>`
3. Create `app/<main>.py` importing the chemical file
4. Prompt: determine expiry period from README + guard rail "Respond with only a number."
5. Assert stdout = exact integer

**Maps to description:** 1:1 conceptually. Requires multi-step agent behavior (read README → read Python file → extract number) but only checks final stdout.

**Granularity:** End-to-end outcome only; no assertion on intermediate tool calls or message history.

---

#### Claude Stage 6 — `testBashTool`

**What tester does:**
1. Create `app/main.js`, `README.md`, `README_old.md` with fixed contents
2. Prompt: "List files using ls and delete the old readme file you find." (2 phrasing variants)
3. Assert exit code 0 (no stdout assertion!)
4. Assert `app/main.js` contents unchanged
5. Assert `README.md` contents unchanged
6. Assert `README_old.md` does not exist

**Maps to description:** Mostly 1:1. Description shows expected stdout `"Deleted README_old.md"` but **tester does NOT assert stdout** — only filesystem state.

**Failure messages:**
- `"Expected file %s does not exist"`
- `"Expected file contents differ from actual contents"`
- `"Expected file %s to not exist, but it exists"`
- Success: `"✔ File %s does not exist"`

---

### Tester logging patterns

**Git:** `logger.Infof("$ ./%s init", …)` mimics shell commands; `logger.Successf("Output is valid.")` on pass; `logger.Debugf("Writing a tree to git storage..")` for internal steps; `logger.Errorf` + byte diff on tree mismatch.

**Claude Code:** `logger.Infof("$ ./%s -p %s", …)` with shellescaped prompt; `logger.Successf("✔ Value is %q", …)` with checkmark; filesystem assertions log expected vs actual contents on failure.

---

## 7. NOTES / EDGE CASES — verbatim scope-limiting sentences

### Git

- "Git actually creates more files & directories than the ones mentioned above when you run `git init`. We've only included the ones that are absolutely necessary for Git to function properly." — `base-01-gg4.md` (commented)
- "The `.git/HEAD` file has a newline at the end." — `base-01-gg4.md` (commented)
- "The output of `cat-file` must not contain a newline at the end" — `base-02-ic4.md`
- "Although the object file is stored with zlib compression, the SHA-1 hash needs to be computed over the 'uncompressed' contents of the file, not the compressed version." — `base-03-jt4.md`
- "The tester uses `--name-only` since this output format is easier to test against." — `base-04-kp1.md`
- "In a tree object file, the SHA-1 hashes are not in hexadecimal format. They're just raw bytes (20 bytes long)." — `base-04-kp1.md`
- "For this challenge, you will not implement a staging area. Instead, assume that all files in the working directory are already staged." — `base-05-fe4.md`
- "Note that directory mode is `40000`, not `040000`." — `base-05-fe4.md`
- "Remember to ignore the `.git` directory when creating entries in the tree object" — `base-05-fe4.md`
- "To keep things simple: You'll receive exactly one parent commit. You'll receive exactly one line in the message. You're free to hardcode any valid name and email" — `base-06-jm9.md`
- "We don't have detailed instructions for this stage, so you're all on your own here." — `base-07-mg6.md`

### Claude Code

- "For this stage, you only need to advertise the `Read` tool (you'll implement it in later stages)." — `base-02-aq1.md`
- "You can choose any reasonable name for the `Read` tool. The tester will only perform end-to-end tests" — `base-02-aq1.md`
- "For this stage, you only need to print the result of the first tool call. We'll get to handling multiple tool calls in later stages." — `base-03-md6.md`
- "In later stages, you'll send the tool results back to the model (instead of printing them)" — `base-03-md6.md`
- "Do not print raw file contents when executing the Read tool. This differs from the behavior in the 'Execute the read tool' stage." — `base-04-ff2.md`
- "You can print intermediate debugging information to stderr. Print to stdout only when the final result is ready." — `base-04-ff2.md`
- "Make sure to execute the command in the same directory as your program, not in a temporary or different working directory." — `base-07-oq5.md`

---

## 8. LANGUAGE

### Git

**Voice:** Second person ("you'll"), present tense, instructional. Mix of contractions ("we'll", "it's") and formal spec language.

**Sentence length:** Long compound sentences in concept sections; shorter in Tests/Notes.

**5 clear sentences:**
1. "Each Git Blob is stored as a separate file in the `.git/objects` directory." — `base-02-ic4.md`
2. "The output of `git write-tree` is the 40-character SHA-1 hash of the tree object that was written to `.git/objects`." — `base-05-fe4.md`
3. "Note that the output is alphabetically sorted, this is how Git stores entries in the tree object internally." — `base-04-kp1.md`
4. "Your program must create a commit object and print its 40-character SHA-1 hash to stdout." — `base-06-jm9.md`
5. "Remember to ignore the `.git` directory when creating entries in the tree object and sort all entries alphabetically by name." — `base-05-fe4.md`

**5 confusing sentences:**
1. "There are other values for submodules, but we won't be dealing with those in this challenge." — introduces submodule concept without context — `base-04-kp1.md`
2. "(The above code block is formatted with newlines for readability, but the actual file doesn't contain newlines)" — repeated across stages; easy to miss — `base-04-kp1.md`
3. "The `<20_byte_sha>` is the 20-byte SHA-1 hash of the blob/tree (this is **not** in hexadecimal format)" — contradicts user's mental model from stages 2–3 where SHAs are always hex strings — `base-04-kp1.md`
4. "If you're testing this against `git` locally, make sure to run `git add .` before `git write-tree`, so that all files in the working directory are staged." — contradicts the immediately preceding note that staging area isn't implemented — `base-05-fe4.md`
5. "We might split this into an extension with multiple stages in the future, but for now it's just one big stage." — meta-comment that doesn't help the learner — `base-07-mg6.md`

**Jargon introduced without definition:** "plumbing commands" (linked but not defined inline), "staging area" (explained briefly in stage 5 only), "worktree" (used in stage 5 without definition), "Smart HTTP transfer protocol" (stage 7, link only).

---

### Claude Code

**Voice:** Second person, present tense, more conversational. Uses bold for emphasis on behavior changes.

**5 clear sentences:**
1. "Tools are functions that an LLM can use to perform specific actions, like reading files or running commands." — `base-02-aq1.md`
2. "When the LLM decides to use a tool, the response message will contain a `tool_calls` array." — `base-03-md6.md`
3. "Every tool result must: Have the `role` field set to `"tool"`, Reference the corresponding `tool_call_id`, Include the tool call result as its `content`" — `base-04-ff2.md`
4. "Print to stdout only when the final result is ready to be printed." — `base-04-ff2.md`
5. "Capture both stdout and stderr from the command" — `base-07-oq5.md`

**5 confusing sentences:**
1. "Claude Code uses a REST API to communicate with the Large Language Model (LLM)." — entire stage 1; no guidance on what to send or expect — `base-01-yy2.md`
2. "For this challenge, there will always be exactly **one choice**." — buried in bullet list; easy to miss as a hard constraint — `base-03-md6.md`
3. "Do not print raw file contents when executing the Read tool. This differs from the behavior in the 'Execute the read tool' stage." — requires user to remember and invert prior stage behavior — `base-04-ff2.md`
4. "You can also use `finish_reason: \"stop\"` from the first response choice as a signal to stop the loop." — optional alternative presented without guidance on when to prefer it — `base-04-ff2.md`
5. "The result of the `Bash` tool call should be sent back to the model as part of the agent loop." — assumes stage 4 knowledge; no example of what the tool message looks like for bash — `base-07-oq5.md`

**Jargon introduced without definition:** "OpenAI-compatible API" (linked), "JSON schema" (used in tool spec context), "guard rail" (used in tester code but not in descriptions), "agent loop" (defined via pseudocode in stage 4, referenced earlier).

---

## 9. LINKS & EXTERNAL DOCS

### Git — frequency and style

- **Heavy linking** in concept sections: git-scm.com book chapters, command docs, Stack Overflow for binary formats, blog posts.
- **Style:** Inline markdown links with descriptive anchor text: `[Git objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)`.
- **Language-specific links:** Per-language zlib/SHA library docs via templating.
- **Stage 7:** 4 external resource links (forum post, gitprotocol-pack, gitformat-pack, blog articles) — the most link-dependent stage.
- **`tester_source_code_url`** in course-definition.yml for most stages (links to exact tester function on GitHub).

### Claude Code — frequency and style

- **Moderate linking:** OpenRouter API docs (quickstart + tools spec + chat completion spec), Claude Code tools docs.
- **Style:** Same inline markdown pattern.
- **No language-specific links.**
- **No `tester_source_code_url`** in course-definition.yml.
- **Course-level FAQ** replaces some in-stage explanation (prerequisites, learning outcomes).
- Links appear at point of need (tool advertising → OpenRouter tools spec; tool calls → chat completion spec).

---

## 10. WEAK SPOTS + STYLE DELTA

### Worst stage descriptions

**Git:**
1. **`/Users/yash/projects/codecrafters/_misc/build-your-own-git/stage_descriptions/base-01-gg4.md`** — Entire instructional content (Tests, Notes, `.git` directory spec) is HTML-commented out. Users see 42 words with no test guidance. Tester still checks 5 filesystem conditions.
2. **`/Users/yash/projects/codecrafters/_misc/build-your-own-git/stage_descriptions/base-07-mg6.md`** — Explicitly abdicates instruction: "We don't have detailed instructions for this stage, so you're all on your own here." Only 191 words. Tester checks author name `"Paul Kuruvilla"` — never mentioned in description.
3. **`/Users/yash/projects/codecrafters/_misc/build-your-own-git/stage_descriptions/base-04-kp1.md`** — Raw-byte SHA vs hex SHA distinction is critical and confusing; `--name-only` flag requirement buried in collapsible section.

**Claude Code:**
1. **`/Users/yash/projects/codecrafters/_misc/build-your-own-claude-code/stage_descriptions/base-01-yy2.md`** — 27 words, no Tests, no Notes, no example API call. Tester expects exact numeric answer to random math problem.
2. **`/Users/yash/projects/codecrafters/_misc/build-your-own-claude-code/stage_descriptions/base-07-oq5.md`** — Shows expected stdout `"Deleted README_old.md"` but tester doesn't check stdout at all; only filesystem state.
3. **`/Users/yash/projects/codecrafters/_misc/build-your-own-claude-code/stage_descriptions/base-04-ff2.md`** — Behavior inversion from stage 3 (don't print file contents) is easy to miss; only in Notes, not in main flow.

---

### What Claude Code does that Git does NOT (the style evolution delta)

1. **Explicit verification bullet lists under every Tests section** — git narrates commands; claude-code lists exactly what passes/fails.

2. **No collapsible `<details>` sections** — all content is visible by default. Git hides 60–80% of stage 2–4 content behind "Click to expand."

3. **Structured API examples as first-class content** — full JSON request/response schemas, diff blocks, pseudocode. Git teaches via binary format specs and bash command examples.

4. **End-to-end behavioral testing over unit-level format verification** — claude tester checks "did the agent accomplish the task?" (correct number, file created, file deleted). Git tester often does byte-level object format comparison against official git.

5. **Guard-rail prompts** — tester appends constraints like "Respond with only a number" that aren't always in the stage description but stabilize LLM output. Git has no equivalent.

6. **Proxy server infrastructure** — claude tester intercepts and validates API calls. Git tester is purely filesystem/subprocess.

7. **Randomized prompt phrasing** — 4 variants per stage to reduce hardcoding. Git randomizes data (filenames, contents) but not command invocation patterns.

8. **Explicit timeouts per stage** — 30s/45s in tester definition. Git has none.

9. **Behavior change callouts across stages** — claude explicitly notes when stage 4 reverses stage 3 behavior (print vs don't print file contents). Git assumes additive knowledge.

10. **Course-level FAQ block** — prerequisites, learning outcomes, motivation. Git has only testimonials.

11. **Numbered execution steps** — "1. Parse the arguments 2. Write the content 3. Append the result to messages." Git uses numbered steps only in write-tree implementation guidance.

12. **Capstone fully specified vs abandoned** — git's hardest stage (clone) has no instructions; claude's hardest stage (agent loop) has the most detailed content (557 words + pseudocode).

13. **Starter code references** — claude says "edit the existing request in the starter code"; git never references starter code structure.

14. **Assertion library with interfaces** — claude has composable `StringAssertion`, `FileContentsAssertion`, `FileDoesNotExistAssertion` with success logging (`✔`). Git has flat helper functions.

15. **Stage 1 minimalism in both courses** — but claude stage 1 is even more bare (27 words vs git's 42 visible), suggesting a deliberate "figure it out from starter code" pattern in the new style.

---

### Summary table: tester ↔ description alignment gaps

| Stage | Description says | Tester also checks (undocumented) |
|-------|-----------------|-----------------------------------|
| Git init | (commented out) | Directory vs file type validation |
| Git create blob | SHA + official format | Byte-level zlib decompressed content |
| Git write tree | SHA match | Byte-level tree object content match |
| Git clone | Random file + commit attrs | Specific author name "Paul Kuruvilla" |
| Claude stage 1 | (nothing) | Exact numeric math answer |
| Claude bash tool | stdout "Deleted README_old.md" | Filesystem only, no stdout check |
| All claude stages | Prompt shown in description | Guard-rail suffix appended by tester |

[REDACTED]