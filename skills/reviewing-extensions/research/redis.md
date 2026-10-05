# CodeCrafters "Build your own Redis" — Writing & Design Pattern Report

Analysis based on full read of `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/course-definition.yml` and **60 stage description files** across: all of `base` (7), `lists` (11), `transactions` (11), `persistence-rdb` (6), plus replication (11), streams (7), bitmaps (2), geospatial (3), auth (2).

---

## 1. STAGE DESCRIPTION ANATOMY

### Recurring section skeleton (newer extensions: lists, sorted-sets, geospatial, bitmaps, auth)

**Typical order:**

1. **Opening paragraph** (no heading) — one sentence stating the stage goal
2. **`### The \`<COMMAND>\` Command`** (or variant: `### Redis Bitmaps`, `### Appending to an Existing List`, etc.) — concept explanation + examples
3. **`### Tests`** — how the tester runs and what it sends/expects
4. **`### Notes`** — scope limits, deferrals, implementation hints

**Literal heading names observed (in frequency order):**
- `### Tests` — present in **118/124** stage files (all except `base-01-jm1.md`, `base-02-rg2.md`, and the four `persistence-rdb-03` through `persistence-rdb-06` files which embed test prose without the heading)
- `### Notes` — present in ~70% of newer stages; often absent in replication mid-stages and all of persistence-rdb stages 3–6
- Command/concept headings: `### The \`RPUSH\` Command`, `### The \`LRANGE\` command`, `### The INCR command`, `### Handshake (Recap)`, `### Recap`, `### Extension prerequisites`

**Variations — older extensions (replication, persistence-rdb, streams):**

| Pattern | Older (replication, persistence-rdb) | Newer (lists, bitmaps, geospatial) |
|---|---|---|
| Opening | Often jumps straight to concept OR embeds Tests in body | Always `"In this stage, you'll..."` opener |
| Concept depth | Long background sections, `(Recap)` chains across handshake stages | One concept section, progressively narrowed |
| Spec inline | Entire RDB format in collapsible `<details>` (`persistence-rdb-02-jz6.md`, 1335 words) | Link to Redis docs + minimal inline |
| Tests section | Sometimes procedural narrative without `### Tests` heading | Always `### Tests` with `./your_program.sh` boilerplate |
| Notes | Sparse in replication; replication-10+ has good Notes | Consistent `"In this stage, you'll only..."` deferrals |
| Conditional blocks | Rare | Only in `base` stages (`{{#lang_is_javascript}}`, `{{#reader_is_bot}}`) |

**Extension welcome (persistence-rdb only):**
`/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/persistence-rdb-01-zg5.md` opens with:
> "Welcome to the RDB Persistence Extension! In this extension, you'll add support for reading [RDB files]..."

**Word count ranges** (from `wc -w`):

| Extension | Typical range | Outliers |
|---|---|---|
| base | 66–337 words | `base-01` = 66 (minimal), `base-07` = 337 |
| lists | 168–439 words | `lists-10-ec3` = 439 (blocking) |
| transactions | 111–300 words | `transactions-06` = 111 (empty transaction) |
| replication | 153–482 words | `replication-15-yd3` = 482 |
| streams | 224–631 words | `streams-03-hq8` = 631 (ID validation rules) |
| persistence-rdb | 79–1335 words | `persistence-rdb-02` = **1335** (full spec inline) |
| bitmaps | 212–486 words | |
| geospatial | 161–425 words | `geospatial-04-cr3` = 161 (mostly external repo link) |
| auth | 170–380 words | |

**Median for well-crafted newer stages (lists): ~230 words.**
**Overall course range: ~66–1335 words; most stages 150–450.**

**Opening paragraph vs Tests vs Notes:**

- **Opening:** Single imperative sentence. Formula: `"In this stage, you'll [add support for / extend / implement] [COMMAND/FEATURE]."` Continuity via `"extend"`, `"continue"`, `"finish"`, or `"Recap"` sections.
- **Tests:** Always starts `"The tester will execute your program like this:"` then shows `./your_program.sh` (sometimes with flags). Describes redis-cli commands, expected RESP bytes, multi-client scenarios. Rarely mentions local test invocation (`codecrafters test` / `git push` never appear in stage descriptions).
- **Notes:** Scope fences (`"only need to"`, `"We won't cover"`, `"We'll get to"`), random-value warnings, backward-compat reminders, language-specific hints.

---

## 2. OBJECTIVE / SCOPE PER STAGE

### How many NEW concepts per stage?

**Design norm: 1 primary concept per stage**, with explicit deferrals. Bundling is rare and usually flagged.

**(a) Single-concept stages (examples):**

`/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/lists-01-mh6.md`:
> "In this stage, you'll add support for creating a new list using the `RPUSH` command."

Notes scope it further:
> "In this stage, you'll only need to handle creating a new list with a single element. We'll get to handling `RPUSH` for existing lists and multiple elements in later stages."

`/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/transactions-04-pn0.md`:
> "In this stage, you'll just add support for handling the `MULTI` command and returning `+OK\r\n`. We'll get to queueing commands in later stages."

**(b) Multi-concept / bundled stages (examples):**

`/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/base-06-la7.md` — SET **and** GET in one stage:
> "In this stage, you'll add support for the [SET] & [GET] commands."

`/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/replication-03-hc6.md` — `--replicaof` flag **and** INFO role change:
> "In this stage, you'll extend the INFO command to reflect a server's role as a replica."

`/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/persistence-rdb-01-zg5.md` — config parsing **and** CONFIG GET command.

### "What you'll do" phrasing patterns

1. `"In this stage, you'll add support for..."` — most common
2. `"In this stage, you'll extend..."` — incremental features
3. `"In this stage, you'll implement..."` — replication handshake steps
4. `"In this stage, you'll start/continue/finish implementing..."` — multi-part commands (INCR 1/3, handshake 2/3)
5. `"In this stage, you will add support for..."` — occasional variant (lists-04, lists-05)

### Continuity with previous stage

- **Explicit recap sections:** `### Recap` in transactions-02/03, replication `(Recap)` headings
- **Inline backward references:** `"Handled in previous stages"`, `"Just like previous stages"`, `"Your implementation still needs to pass the tests in previous stages"`
- **Numbered multi-part:** `"The INCR command (1/3)"`, `"Send handshake (1/3)"`
- **Progressive narrowing:** `"We'll split the implementation of this command into three stages:"` (transactions-01-si4.md)

---

## 3. EXTENSION COMPOSITION

### Extension `description_markdown` template (from course-definition.yml)

Every extension follows the same 2-sentence + reference-link block:

```yaml
In this challenge extension you'll add support for [Feature][link] to your Redis implementation.

Along the way, you'll learn [commands/concepts] like [CMD1][link], [CMD2][link], and more.

[reference-style link definitions at bottom]
```

Example — lists:
> "In this challenge extension you'll add support for [Lists][redis-lists] to your Redis implementation. Along the way, you'll learn commands like [RPUSH][rpush-command], [LRANGE][lrange-command], and more."

### Stage names + progression arcs

#### **base** (7 stages, no extension slug — core course)
| # | Name | Difficulty |
|---|---|---|
| 1 | Bind to a port | very_easy |
| 2 | Respond to PING | easy |
| 3 | Respond to multiple PINGs | easy |
| 4 | Handle concurrent clients | medium |
| 5 | Implement the ECHO command | medium |
| 6 | Implement the SET & GET commands | medium |
| 7 | Expiry | medium |

**Arc:** TCP bind → hardcoded response → loop → concurrency → RESP parsing (ECHO) → key-value store → expiry. Happy-path-first; parsing deferred until stage 5; concurrency before parsing.

#### **lists** (11 stages)
| # | Name | Difficulty |
|---|---|---|
| 1 | Create a list | easy |
| 2 | Append an element | easy |
| 3 | Append multiple elements | easy |
| 4 | List elements (positive indexes) | easy |
| 5 | List elements (negative indexes) | easy |
| 6 | Prepend elements | easy |
| 7 | Query list length | easy |
| 8 | Remove an element | easy |
| 9 | Remove multiple elements | easy |
| 10 | Blocking retrieval | medium |
| 11 | Blocking retrieval with timeout | medium |

**Arc:** RPUSH create → append 1 → append N → LRANGE positive → LRANGE negative → LPUSH → LLEN → LPOP 1 → LPOP N → BLPOP infinite → BLPOP timeout. **Textbook single-case-before-multi-case; blocking last.**

#### **transactions** (11 stages)
| # | Name | Difficulty |
|---|---|---|
| 1 | The INCR command (1/3) | easy |
| 2 | The INCR command (2/3) | easy |
| 3 | The INCR command (3/3) | easy |
| 4 | The MULTI command | easy |
| 5 | The EXEC command | easy |
| 6 | Empty transaction | **hard** |
| 7 | Queueing commands | medium |
| 8 | Executing a transaction | **hard** |
| 9 | The DISCARD command | easy |
| 10 | Failures within transactions | medium |
| 11 | Multiple transactions | medium |

**Arc:** INCR edge cases (3 stages) → MULTI shell → EXEC error case → empty EXEC → queue → execute → DISCARD → failure handling → concurrency. **Prerequisite command (INCR) before transactions; error/edge cases interleaved; concurrency last.**

#### **replication** (18 stages)
| # | Name | Difficulty |
|---|---|---|
| 1 | Configure listening port | easy |
| 2 | The INFO command | easy |
| 3 | The INFO command on a replica | medium |
| 4 | Initial replication ID and offset | easy |
| 5–7 | Send handshake (1/3–3/3) | easy, easy, medium |
| 8–9 | Receive handshake (1/2–2/2) | easy, easy |
| 10 | Empty RDB transfer | easy |
| 11 | Single-replica propagation | medium |
| 12 | Multi-replica propagation | **hard** |
| 13 | Command processing | **hard** |
| 14–15 | ACKs with no/with commands | easy, medium |
| 16–18 | WAIT with no replicas / no commands / multiple commands | medium, medium, **hard** |

**Arc:** Config/INFO → repl IDs → handshake send (replica) → handshake receive (master) → RDB transfer → propagation 1 → propagation N → replica command processing → ACKs → WAIT. **Bidirectional build (replica then master); scale-up (1→N replicas); durability (WAIT) last.**

### First stage difficulty

**Not always easy.** Most extensions start at `easy`, but:
- **bitmaps** stage 1 = `medium` ("Create a bitmap")
- **base** stage 1 = `very_easy`

### Last stage of an extension — typical role

- **Integration / capstone:** multi-client concurrency (`transactions-11`, `lists-11` timeout variant)
- **Hardest remaining edge case:** `replication-18` (WAIT with propagated commands, hard)
- **Scale-up:** `replication-12` (multi-replica propagation)
- **Blocking behavior:** `streams-13` ($ ID in blocking XREAD), `lists-11` (BLPOP timeout)

---

## 4. EXAMPLES

### Presentation conventions

- **redis-cli transcripts** for user-visible behavior (quoted strings, `(integer)`, `(error)`)
- **RESP byte dumps** for wire-level expectations (`+PONG\r\n`, `$3\r\nbar\r\n`)
- **JSON arrays** as intermediate representation before RESP encoding (streams, especially)
- **Inline comments** inside example blocks: `# Expect: (integer) 1`, `# (Blocks)`
- **Placeholders:** `<PORT>`, `<dir>`, `<filename>`, `<random number of elements>`, `list_key`, `stream_key`
- **Concrete literals** when teaching protocol: `8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb`, `0-1`, `1526985054069-0`

### CRLF / invisible character handling

Always shown as literal `\r\n` in prose and code blocks:
> "the raw response it sends over the network is actually `+PONG\r\n`"

Explicit callouts:
> "*(This response is separated into multiple lines for readability. The actual return value doesn't contain any additional newlines.)*"

RDB bulk transfer exception documented:
> "This is similar to how bulk strings are encoded, but **without the trailing `\r\n`**."

### Representative verbatim example blocks

**1. redis-cli with inline comments (lists-03-lx4.md):**
```bash
$ redis-cli RPUSH list_key "element1" "element2" "element3"
# Expect: (integer) 3 → encoded as :3\r\n

$ redis-cli RPUSH list_key "element4" "element5"
# Expect: (integer) 5 → encoded as :5\r\n
```

**2. RESP byte dump (base-05-qq0.md):**
> "The exact bytes you'll receive will be a RESP Array that looks something like `*2\r\n$4\r\nECHO\r\n$3\r\nhey\r\n`. This is the RESP encoding of `["ECHO", "hey"]`."
> "The tester will expect to receive `$3\r\nhey\r\n` as a response."

**3. Multi-line RESP with readability note (streams-06-zx1.md):**
```text
*2\r\n
*2\r\n
$15\r\n1526985054069-0\r\n
*4\r\n
$11\r\ntemperature\r\n
$2\r\n36\r\n
...
```
> "*(This response is separated into multiple lines for readability. The actual return value doesn't contain any additional newlines.)*"

**4. Multi-client blocking scenario (lists-10-ec3.md):**
```bash
$ redis-cli BLPOP list_key 0
# (Blocks)

# In another client:
$ redis-cli RPUSH list_key "foo"
# Expect: (integer) 1
```

### Input AND output?

**Usually both**, but with a split convention:
- **redis-cli blocks** show human-readable input/output
- **Separate prose** gives exact RESP bytes expected
- **Not** a full hex dump of what the tester sends on the wire (except RDB stages)

### "Your program's output" vs "reference implementation"

They don't distinguish two implementations. The pattern is:
- `"The tester will expect..."` / `"Your server should respond with..."`
- redis-cli output shown as what the *user* would see if they ran redis-cli against their server
- No mention of a reference Redis binary; tester is the oracle

---

## 5. TESTS SECTION

### Boilerplate (near-universal)

```
The tester will execute your program like this:

```bash
$ ./your_program.sh
```
(or with flags: `--port`, `--dir`, `--dbfilename`, `--replicaof`)
```

### Verbatim Tests sections

**lists-01-mh6.md:**
> "It will then send the following command to your program:
> ```bash
> $ redis-cli RPUSH list_key "element"
> ```
> The tester will verify that the response to the command is `:1\r\n`, which is 1 (the number of elements in the list), encoded as a RESP integer."

**transactions-07-rs9.md:**
> "The tester will then connect to your server as a Redis client, and send multiple commands using the same connection:
> ```bash
> $ redis-cli
> > MULTI
> > SET foo 41 (expecting "+QUEUED\r\n")
> > INCR foo (expecting "+QUEUED\r\n")
> ```
> Since these commands were only "queued", the key `foo` should not exist yet. The tester will verify this by creating another connection and sending this command:
> ```bash
> $ redis-cli GET foo (expecting `$-1\r\n` as the response)
> ```"

**replication-10-cf8.md:**
> "It will then connect to your TCP server as a replica and execute the following commands:
> 1. `PING` - expecting `+PONG\r\n`
> 2. `REPLCONF listening-port <PORT>` - expecting `+OK\r\n`
> 3. `REPLCONF capa eof capa psync2` - expecting `+OK\r\n`
> 4. `PSYNC ? -1` - expecting `+FULLRESYNC <REPL_ID> 0\r\n`
> After the last response, the tester will expect to receive an empty RDB file from your server."

### Determinism / pinning

| Aspect | Pinned? | How described |
|---|---|---|
| Port numbers | **Random** | `"The tester will pass a random port number"` |
| Keys/values | **Random** | `"keys and values will be random, so you won't be able to hardcode"` |
| ECHO argument | **Random** | base-05 |
| Replication ID | **Can hardcode** | `"you can hardcode 8371b4fb..."` |
| Expiry timestamps (RDB) | **Random** | `"expiry timestamps will also be random"` |
| Replica count (WAIT) | **Random** | `"number of replicas created in this stage will be random"` |
| Timing | **Partially pinned** | `sleep 0.2`, `BLPOP 0.1`, `BLOCK 1000`, `500ms` — relative, not absolute clocks |
| Number of replicas in examples | **Illustrative only** | Example uses `7` but Notes say don't hardcode |

### Local test instructions

**None.** Stage descriptions never mention `codecrafters test`, `git push`, or how to run the tester locally. The only local-run hint is `./your_program.sh` as the program entrypoint the tester uses.

---

## 6. NOTES / EDGE CASES

### Notes vs main body split

| Main body | Notes |
|---|---|
| What the command does (Redis semantics) | What THIS stage requires vs defers |
| General behavior rules | Random-value warnings |
| Examples of happy path | `"Your code must pass previous stages"` |
| Protocol encoding explanation | Language-specific package hints (`{{#lang_is_haskell}}`) |
| Multi-step conceptual background | Repo migration notices (Oct 2023 CLI args PR) |

### Scope-limiting sentences (5+ verbatim)

1. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/lists-01-mh6.md`:
   > "In this stage, you'll only need to handle creating a new list with a single element. We'll get to handling `RPUSH` for existing lists and multiple elements in later stages."

2. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/base-06-la7.md`:
   > "We won't cover these extra options in this stage. We'll get to them in later stages."

3. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/streams-02-cf6.md`:
   > "`XADD` supports other optional arguments, but we won't deal with them in this challenge."

4. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/replication-03-hc6.md`:
   > "You don't need to actually connect to the master server specified via `--replicaof` in this stage. We'll get to that in later stages."

5. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/transactions-10-sg9.md`:
   > "There are a subset of command failures (like syntax errors) that will cause a transaction to be aborted entirely. We won't cover those in this challenge."

6. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/bitmaps-06-nx3.md`:
   > "In this stage, you'll only need to handle `BITCOUNT` with no range, and with non-negative indexes. We won't deal with negative indexes in this challenge."

7. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/persistence-rdb-01-zg5.md`:
   > "You don't need to read the RDB file in this stage, you only need to store `dir` and `dbfilename`."

8. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/base-04-zu2.md`:
   > "Since the tester client _only_ sends the `PING` command at the moment, it's okay to ignore what the client sends and hardcode a response."

---

## 7. LANGUAGE

### Characteristics

| Dimension | Pattern |
|---|---|
| Sentence length | Short-to-medium (15–25 words); lists extension is clearest |
| Voice | Second person **"you"** dominant; **"we"** for course authorial deferrals ("We'll get to") |
| Tense | Present imperative for tasks; present descriptive for behavior |
| Contractions | Frequent: "you'll", "it's", "don't", "won't", "we'll" |
| Hedging | Low; direct assertions. Occasional "might", "can assume" |
| Command references | Backtick-wrapped: `` `RPUSH` ``, `` `+PONG\r\n` `` |
| Jargon | RESP terms linked on first use; "bulk string", "simple error", "null array" |

### 5 especially clear sentences

1. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/lists-04-sf6.md`:
   > "The index of the first element is `0`. The `stop` index is inclusive, meaning the element at that index is included in the response."

2. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/transactions-07-rs9.md`:
   > "When commands are queued, they should not be executed or alter the database in any way."

3. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/replication-11-zn8.md`:
   > "Write commands are commands that modify the master's dataset, such as `SET` and `DEL`. Commands like `PING`, `ECHO`, etc., are not considered "write" commands, so they aren't propagated."

4. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/bitmaps-01-bq9.md`:
   > "The `SETBIT` command takes the key, an offset, and a value (`0` or `1`) as arguments. It returns the original bit at that offset. On a new key, that is always `0`."

5. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/base-02-rg2.md`:
   > "For this stage, your task is to simply hardcode a `+PONG\r\n` response, regardless of the incoming command."

### 5 confusing / ambiguous / overloaded sentences

1. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/transactions-09-rl9.md` — duplicate empty heading:
   > "### The DISCARD command" ... "### DISCARD" *(empty section between them)*

2. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/transactions-05-lo4.md` — stage title vs body mismatch:
   Title/marketing: "The EXEC command" but body focuses on **EXEC without MULTI** first; happy-path EXEC deferred.

3. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/replication-17-tu8.md`:
   > "For this stage, you can ignore both arguments (`<numreplicas> <timeout>`) and simply return the number of connected replicas."
   *(Teaches WAIT but says ignore its arguments — confusing until you read it as a stepping stone.)*

4. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/streams-11-bs1.md` — marketing_md in course-definition.yml has copy-paste error:
   > "In this stage, you'll add extend support to `XREAD` to allow querying multiple streams."
   *(Same text used for stages 10, 11, 12, 13 in yml.)*

5. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/persistence-rdb-03-gc6.md` — Tests merged into intro with no section structure:
   > "Just like with previous stages, we'll stick to supporting RDB files that contain a single key for now."
   *(No `### Tests`, no `### Notes`, no behavior edge cases for string encoding types beyond one sentence.)*

### Jargon introduced without definition

- **"pseudo-random string"** (replication-04) — no generation method defined beyond "can hardcode"
- **"vectorset"** (streams-01 TYPE command) — listed as a type but never implemented
- **"null array"** vs **"empty array"** — used distinctly but not formally defined inline (`*-1\r\n` vs `*0\r\n`)
- **"Subscribed mode"** (pub-sub) — referenced in auth context indirectly
- **"size encoding"** (RDB) — defined inside collapsed spec, easy to miss

---

## 8. LINKS & EXTERNAL DOCS

### Frequency

- **Every extension** `description_markdown` links to Redis docs (reference-style `[redis-lists]: url`)
- **Per-stage:** 1–4 inline markdown links to redis.io command docs and RESP spec
- **Heavy external dependency:** persistence-rdb (RDB format blog), geospatial-04 (GitHub algorithm repo), replication-10 (tester asset for empty RDB hex)

### Link style

- **Reference-style** in extension descriptions: `[Lists][redis-lists]`
- **Inline** in stage bodies: `[RPUSH](https://redis.io/docs/latest/commands/rpush/)`
- **RESP spec** repeatedly: `https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings`

### Inline vs external spec

| Topic | Approach |
|---|---|
| RESP encoding | Inline bytes + link to spec |
| Command semantics | redis-cli examples inline; link for full option list |
| RDB file format | **Full spec inline** in persistence-rdb-02 (1335 words) + external link |
| Geohash scoring | **External repo required** (geospatial-04-cr3.md) — not inline |
| Geodistance formula | Link to Rosetta Code + Redis source (geospatial-07) |
| Transaction error behavior | Link to official docs (transactions-10) |

**Rule of thumb:** Protocol bytes and command happy-path = inline. Binary format specs and algorithms = external, sometimes with inline subset.

---

## 9. WEAK SPOTS (10 worst stage descriptions)

### 1. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/base-01-jm1.md`
**Problems:** No `### Tests`, no `### Notes`, no examples, no `./your_program.sh` boilerplate. Only a bot-conditional scope note. At 66 words, learner has no idea what "pass" means beyond binding port 6379.
> "Redis servers communicate over TCP... In this stage, you'll implement a TCP server that listens on port 6379, just like the real Redis."

### 2. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/base-02-rg2.md`
**Problems:** No Tests/Notes sections. No explicit tester expectations. Learner must infer from marketing_md that hardcoded PONG suffices.
> "For this stage, your task is to simply hardcode a `+PONG\r\n` response, regardless of the incoming command."

### 3. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/persistence-rdb-03-gc6.md`
**Problems:** No section headings at all. Tests prose embedded in opening paragraph. No Notes. Doesn't explain how tester creates RDB file. String encoding types mentioned but not exemplified.
> "In this stage, you only need to support length-prefixed strings. We won't cover the other two types in this challenge."

### 4. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/persistence-rdb-04-jw4.md`
**Problems:** Same structural collapse as -03. No edge cases (key ordering? empty DB?). Only one example response.
> "For example, let's say the RDB file contains two keys: `foo` and `bar`. The expected response will be: `*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n`"

### 5. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/persistence-rdb-05-dq3.md`
**Problems:** 79 words. No Notes. No expected bytes per GET. Assumes prior stages cover everything.
> "The response to each `GET <key>` command should be a RESP bulk string with the value corresponding to the key."

### 6. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/persistence-rdb-06-sm4.md`
**Problems:** Expiry is complex but description is 126 words with no format guidance for FC/FD expiry bytes (defined only in stage 2's collapsed spec). No clock/time reference for "past vs future".
> "When a key has expired, the expected response is `$-1\r\n` (a "null bulk string")."

### 7. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/transactions-11-jf8.md`
**Problems:** Tests section truncated — shows only partial command sequence with no expected bytes, no second-client scenario detail despite body describing two transactions interleaved.
> ```bash
> $ redis-cli MULTI
> > INCR foo
> > EXEC
> ```
*(File ends abruptly; no expected `:43\r\n` or multi-connection choreography.)*

### 8. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/transactions-09-rl9.md`
**Problems:** Duplicate `### DISCARD` heading with empty section — looks like unfinished edit. Typo "abort a transactions."
> "### The DISCARD command" ... "### DISCARD" *(blank)* ... "### Tests"

### 9. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/replication-12-hd5.md`
**Problems:** 153 words. Recap is one sentence. No Notes. No RESP encoding example for propagated commands. No assertion details (order only? same connection?).
> "It will then assert that each replica received those commands in the correct order."

### 10. `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/geospatial-04-cr3.md`
**Problems:** Core algorithm entirely outsourced to external GitHub repo (161 words in stage). No inline pseudocode. Stage is untestable from description alone without leaving the course.
> "We've created a GitHub repository that explains how this conversion is done... Here's the repository link."

**Honorable mention — course-definition.yml marketing_md copy-paste bug for replication stage `xc1`:**
> "In this stage, you'll add support for reading a key from an RDB file that contains a single key-value pair. You'll do this by implementing the `KEYS *` command."
*(Stage is actually "Initial replication ID and offset" — misleading before learner opens the stage file.)*

---

## Cross-cutting design patterns (summary)

1. **Opener formula:** `"In this stage, you'll [verb] [one thing]."`
2. **Section triad:** Concept → Tests → Notes (mature extensions); older extensions omit Notes or Tests heading
3. **Scope fencing:** `"In this stage, you'll only..."` / `"We'll get to... in later stages"` — appears in ~80% of Notes sections
4. **Progressive command teaching:** create → append-one → append-many → read → edge indexes → inverse command → blocking
5. **Tester oracle pattern:** `"The tester will expect..."` + exact RESP bytes
6. **Dual notation:** redis-cli for humans, `\r\n` bytes for wire
7. **Randomness disclosure:** always in Notes when keys/values/ports are random
8. **Extension intro:** 2 sentences + reference links; no stage-level welcome except persistence-rdb-01
9. **Difficulty:** first stage usually easy (except bitmaps); last stage adds concurrency/blocking/scale; spikes to `hard` for integration points
10. **No local test docs** in stage descriptions — platform mechanics assumed external

---

**Files analyzed:** 60 stage descriptions under `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/stage_descriptions/` plus `/Users/yash/projects/codecrafters/_misc/build-your-own-redis/course-definition.yml`.

[REDACTED]