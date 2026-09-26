# CodeCrafters Stage Description Pattern Analysis
## HTTP Server (14 stages) vs SQLite (9 stages)

All file paths are under:
- **HTTP:** `/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/build-your-own-http-server/`
- **SQLite:** `/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/build-your-own-sqlite/`

---

## 1. STAGE DESCRIPTION ANATOMY

### HTTP Server — recurring skeleton

**Full template (stages 2–5, compression-01):**
1. Opening paragraph — objective in 1–2 sentences (`"In this stage, you'll..."` or `"In this stage, your server will..."`)
2. `### <Concept section>` — protocol/concept primer (title varies: `HTTP response`, `HTTP request`, `Response body`, `The User-Agent header`, `Accept-Encoding and Content-Encoding`, etc.)
3. Worked examples — request/response wire format + annotated breakdown blocks
4. `### Tests` — tester invocation, curl/nc commands, expected responses (often split into `#### First request` / `#### Second request`)
5. `### Notes` — scope limits, deferrals to later stages, external doc links
6. `{{#reader_is_bot}}` block (most base stages)

**Reduced template (stages 6–8 base, persistent connections, compression-02/03):**
- Opening paragraph
- Optional concept section (sometimes omitted)
- `### Tests` only (+ `### Notes` in extensions)
- No annotated wire-format breakdown

**Stage 1 anomaly (`stage_descriptions/base-01-at4.md`):**
- Opening paragraph only; `### Tests` and `### Notes` exist but are **HTML-commented out**:
```html
<!--
### Tests
...
### Notes
...
-->
```

**Literal heading names observed (in order):**
| Stage file | Section headings (in order) |
|---|---|
| `base-02-ia4.md` | `### HTTP response` → `### Tests` → `### Notes` |
| `base-03-ih0.md` | `### HTTP request` → `### Tests` → `### Notes` |
| `base-04-cn2.md` | `### Response body` → `### Tests` → `### Notes` |
| `base-05-fs3.md` | `### The \`User-Agent\` header` → `### Tests` → `### Notes` |
| `base-06-ej5.md` | `### Tests` (no Notes) |
| `base-07-ap6.md` | `### Tests` → `#### First request` → `#### Second request` |
| `http-compression-01-df4.md` | `### \`Accept-Encoding\` and \`Content-Encoding\`` → `### Tests` → `#### First request` → `#### Second request` → `### Notes` |
| `http-persistent-connections-01-ag9.md` | `### Tests` → `### Notes` |

**Word counts (HTTP):**

| File | Words |
|---|---|
| base-01-at4 | 95 |
| base-02-ia4 | 262 |
| base-03-ih0 | 409 |
| base-04-cn2 | 340 |
| base-05-fs3 | 238 |
| base-06-ej5 | 280 |
| base-07-ap6 | 229 |
| base-08-qv8 | 265 |
| http-compression-01-df4 | 407 |
| http-compression-02-ij8 | 194 |
| http-compression-03-cr8 | 197 |
| http-persistent-connections-01-ag9 | 137 |
| http-persistent-connections-02-ul1 | 112 |
| http-persistent-connections-03-kh7 | 150 |

- **Mean:** ~210 words/stage
- **Range:** 95–409
- **Teaching-heavy stages:** 300–410 words (stages 3–4, compression-01)
- **Extension tail:** 112–197 words (persistent connections)

---

### SQLite — recurring skeleton

**Full template (stages 1–3 only):**
1. Opening paragraph — objective
2. `### <Concept section(s)>` — 1–4 concept subsections with nested `####` headings
3. Worked hex/byte examples (stage 1, stage 3)
4. `### Tests`
5. `### Notes`

**Collapsed template (stages 4–9):**
1. Opening paragraph (sometimes continuity sentence)
2. **No `###` concept sections**
3. Inline "Here's how the tester will execute…" + expected output block
4. Brief implementation hints (1–3 sentences)
5. **No `### Tests` heading, no `### Notes` heading**

**Literal heading names (stages 1–3):**

| File | Section headings |
|---|---|
| `base-01-dr6.md` | `### .dbinfo` → `### Database file` → `### Tests` → `### Notes` |
| `base-02-ce0.md` | `### The sqlite_schema table` → `### Pages` → `#### The sqlite_schema page` → `#### Cell count` → `### Tests` → `### Notes` |
| `base-03-sz4.md` | `### The sqlite_schema.tbl_name column` → `### Cell pointer array` → `### Cell` → `#### Record format` → `#### Example` → `### Tests` → `### Notes` |

**Word counts (SQLite):**

| File | Words |
|---|---|
| base-01-dr6 | 257 |
| base-02-ce0 | 457 |
| base-03-sz4 | **799** |
| base-04-nd9 | 173 |
| base-05-az9 | 207 |
| base-06-vc9 | 81 |
| base-07-rf3 | 89 |
| base-08-ws9 | 194 |
| base-09-nz8 | 203 |

- **Mean:** ~273 words/stage (misleading — bimodal)
- **Early arc (1–3):** 257–799
- **SQL arc (4–9):** 81–207 (stage 6 is shortest at 81 words)

---

### Does SQLite deviate from the HTTP template?

**Yes, substantially.**

| Dimension | HTTP | SQLite |
|---|---|---|
| Concept primer before Tests | Consistent in base 2–5; partial in later stages | Only stages 1–3 |
| `### Tests` heading | Present in 13/14 stages (commented out in stage 1) | Present in 3/9 stages only |
| `### Notes` heading | Present in most teaching stages | Present in 3/9 stages only |
| Annotated wire-format breakdown | Standard | Only stage 3 has full byte annotation |
| Test subsections | `#### First request` / `#### Second request` common | Never |
| Opening vs Tests vs Notes roles | Distinct, predictable | Stages 4–9 collapse everything into prose + one I/O block |

**Opening paragraph role:**
- **HTTP:** States one incremental capability; often names the endpoint or HTTP artifact.
- **SQLite (1–3):** Names dot-command + file-format concept.
- **SQLite (4–9):** Often jumps straight to tester I/O; minimal "you will learn X."

**Tests section role:**
- **HTTP:** Exact shell commands, exact wire responses, explicit random-vs-fixed values.
- **SQLite (4–9):** Embedded as prose ("Here's how the tester will execute…"); no section header.

**Notes section role:**
- **HTTP:** Scope fences, deferrals, spec links.
- **SQLite:** Only in stages 1–3; stages 4–9 have scope hints inline or absent.

---

## 2. OBJECTIVE / SCOPE PER STAGE

### HTTP — concepts per stage

| Stage | Name | New concepts | Count |
|---|---|---|---|
| 1 | Bind to a port | TCP listen on 4221 | 1 |
| 2 | Respond with 200 | HTTP response structure, status line, CRLF | 2–3 |
| 3 | Extract URL path | HTTP request structure, request target, 200 vs 404 | 2–3 |
| 4 | Respond with body | Response body, Content-Type, Content-Length, `/echo/{str}` | 3 |
| 5 | Read header | Header parsing, User-Agent, case-insensitivity | 2 |
| 6 | Concurrent connections | Multi-connection handling | 1 |
| 7 | Return a file | File serving, `--directory`, octet-stream | 2 |
| 8 | Read request body | POST, request body, Content-Length read | 2 |
| comp-1 | Compression headers | Accept-Encoding / Content-Encoding negotiation | 2 |
| comp-2 | Multiple schemes | Comma-separated Accept-Encoding | 1 |
| comp-3 | Gzip compression | Actual gzip compression | 1 |
| persist-1–3 | Persistent connections | Keep-alive, concurrent persistent, Connection: close | 1 each |

**Single-concept example (HTTP):**
> `"In this stage, you'll add support for concurrent connections."`  
> — `stage_descriptions/base-06-ej5.md`

**Multi-concept example (HTTP, still bounded):**
> `"In this stage, you'll implement the /echo/{str} endpoint, which accepts a string and returns it in the response body."`  
> Then teaches: response body + Content-Type + Content-Length.  
> — `stage_descriptions/base-04-cn2.md`

**"In this stage you'll…" phrasing (HTTP):**
- `"In this stage, you'll build a TCP server that listens on port 4221."` (course-definition)
- `"In this stage, your server will respond to an HTTP request with a 200 response."` (stage 2 — uses **"your server will"** variant)
- `"In this stage, you'll implement the /user-agent endpoint…"` (stage 5)
- Extension opener: `"Welcome to the HTTP Compression extension!"` (compression-01)

**Continuity references (HTTP):**
- `"You can ignore the contents of the request. We'll cover parsing requests in later stages."` — base-02
- `"You can ignore the headers for now. You'll learn about parsing headers in a later stage."` — base-03
- `"For this stage, you don't need to compress the body. You'll implement compression in a later stage."` — compression-01/02
- `"It is very likely that the code you had for the previous stage will pass this stage without any changes!"` — base-06 (JS/TS)

---

### SQLite — concepts per stage

| Stage | Name | New concepts | Count |
|---|---|---|---|
| 1 | Print page size | `.dbinfo`, file header, magic string, page size field, big-endian | 3–4 |
| 2 | Print number of tables | `sqlite_schema`, pages, b-tree page header, cell count | **4+** |
| 3 | Print table names | cell pointer array, varint, record format, serial type codes, leaf cells | **5+** |
| 4 | Count rows | SQL `SELECT COUNT(*)`, rootpage traversal, string-split "parser" | 3 |
| 5 | Single column SELECT | Record format reread, **CREATE TABLE parsing**, column ordering | **3+** |
| 6 | Multiple columns | Multi-column projection | 1 |
| 7 | WHERE clause | Filtering | 1 |
| 8 | Full-table scan (multi-page) | B-tree traversal, multi-page tables | 2 |
| 9 | Index scan | Index lookup, performance constraint (~3s on ~1GB) | 2 |

**Single-concept example (SQLite):**
> `"This stage is similar to the previous one, just that the tester will query for multiple columns instead of just one."`  
> — `stage_descriptions/base-06-vc9.md` (81 words total)

**Multi-concept cliff (SQLite):**
Stage 3 packs: cell pointer array + varint + record header/body + serial type codes + hex walkthrough — in one stage.

Stage 5 explicitly combines binary record reading **and** SQL/DDL parsing:
> `"You'll need to parse the table's CREATE TABLE statement to do this. The CREATE TABLE statement is stored in the sqlite_schema table's sql column."`  
> — `stage_descriptions/base-05-az9.md`

**Does SQLite combine binary format internals AND SQL parsing in the same stage?**

**Yes — stage 5 (`base-05-az9.md`):**
- Binary: "Rows are stored on disk in the Record Format… To extract data for a single column, you'll need to know the order of that column in the sequence."
- SQL parsing: "You'll need to parse the table's CREATE TABLE statement… stored in the sqlite_schema table's sql column."

Stage 4 also mixes formats + minimal SQL handling, but defers full parsing:
> `"Remember: You don't need to implement a full-blown SQL parser just yet… For now you can just split the input by " " and pick the last item to get the table name."`  
> — `stage_descriptions/base-04-nd9.md`

**Continuity references (SQLite):**
- `"In this stage, you'll add 'number of tables' to your .dbinfo command's output."` — base-02 (extends prior stage)
- `"You'll learn more about b-tree pages in later stages. For now, here's what you need to know:"` — base-02
- `"Now that you've gotten your feet wet with the SQLite database file format, it's time to move on to actual SQL!"` — base-04
- `"Now that you're comfortable with jumping across database pages…"` — base-05
- **Broken reference:** base-04 says multi-page tables come in `"stage 7"`, but stage 7 is WHERE filtering; multi-page traversal is stage 8 (`base-08-ws9.md`).

**course-definition.yml duplicate (stages 7 & 8):** Both `rf3` and `ws9` marketing_md say:
> `"In this stage, you'll filter records based on a WHERE clause. You'll assume that the query can't be served by an index…"`

Stage 8's actual description is about multi-page B-tree traversal — the YAML marketing copy is wrong/stale.

---

## 3. EXTENSION COMPOSITION

### HTTP Server — all stages in order

**Base extension (8 stages):**

| # | Slug | Name | difficulty |
|---|---|---|---|
| 1 | at4 | Bind to a port | very_easy |
| 2 | ia4 | Respond with 200 | very_easy |
| 3 | ih0 | Extract URL path | easy |
| 4 | cn2 | Respond with body | easy |
| 5 | fs3 | Read header | easy |
| 6 | ej5 | Concurrent connections | easy |
| 7 | ap6 | Return a file | medium |
| 8 | qv8 | Read request body | medium |

**Arc:** Gentle ramp. Two `very_easy` → four `easy` → two `medium`. Each stage adds one HTTP layer (TCP → status line → path → body → headers → concurrency → files → POST).

**http-compression (3 stages):**

| # | Slug | Name | difficulty |
|---|---|---|---|
| 1 | df4 | Compression headers | easy |
| 2 | ij8 | Multiple compression schemes | medium |
| 3 | cr8 | Gzip compression | medium |

**Arc:** Negotiation before implementation (stages 1–2 explicitly say "don't compress yet") → actual gzip in stage 3.

**http-persistent-connections (3 stages):**

| # | Slug | Name | difficulty |
|---|---|---|---|
| 1 | ag9 | Persistent connections | medium |
| 2 | ul1 | Concurrent persistent connections | medium |
| 3 | kh7 | Connection closure | medium |

**Arc:** Flat `medium` plateau; assumes base course complete. Incremental: sequential reuse → concurrent reuse → explicit close.

**Difficulty jump points (HTTP):** `very_easy → easy` (stage 3), `easy → medium` (stage 7). Both signposted by gradual teaching in prior stages.

---

### SQLite — base only (9 stages)

| # | Slug | Name | difficulty |
|---|---|---|---|
| 1 | dr6 | Print page size | very_easy |
| 2 | ce0 | Print number of tables | **hard** |
| 3 | sz4 | Print table names | **hard** |
| 4 | nd9 | Count rows in a table | medium |
| 5 | az9 | Read data from a single column | hard |
| 6 | vc9 | Read data from multiple columns | hard |
| 7 | rf3 | Filter data with a WHERE clause | hard |
| 8 | ws9 | Retrieve data using a full-table scan | hard |
| 9 | nz8 | Retrieve data using an index | hard |

**Arc:** Dot-command / file-format bootcamp (1–3) → SQL pivot (4) → brief medium respite (4 only) → six consecutive `hard` stages (5–9).

**The difficulty cliff:** **`very_easy` (stage 1) → `hard` (stage 2)** — a 3-tier jump with no intermediate stage.

**Is it signposted?**

**No, not in the stage description.** Stage 2 opens matter-of-factly:
> `"In this stage, you'll add 'number of tables' to your .dbinfo command's output."`

It immediately introduces `sqlite_schema`, pages, b-tree page headers, and cell counts — concepts only lightly foreshadowed in stage 1's hex dump. The course-definition `marketing_md` marks stage 2 as `hard`, but the stage text never says "this is a big leap" or "review the file format spec first."

Stage 3 (799 words, also `hard`) is the **content cliff** — varints, cell pointers, record format, serial types, full hex annotation — with no intermediate `easy`/`medium` buffer.

Stage 4 drops to `medium` in YAML but the writing doesn't celebrate or scaffold the transition — it just says `"it's time to move on to actual SQL!"`

Stages 5–9 are all `hard` with shrinking word counts (81–207 words), suggesting increasing implementation burden with **decreasing instructional support**.

---

## 4. EXAMPLES

### Representative verbatim example blocks

**HTTP — CRLF in wire format (`base-02-ia4.md`):**
```
HTTP/1.1 200 OK\r\n\r\n
```

**HTTP — annotated breakdown (`base-02-ia4.md`):**
```
// Status line
HTTP/1.1  // HTTP version
200       // Status code
OK        // Optional reason phrase
\r\n      // CRLF that marks the end of the status line

// Headers (empty)
\r\n      // CRLF that marks the end of the headers

// Response body (empty)
```

**HTTP — full request with CRLF (`base-03-ih0.md`):**
```
GET /index.html HTTP/1.1\r\nHost: localhost:4221\r\nUser-Agent: curl/7.64.1\r\nAccept: */*\r\n\r\n
```

**HTTP — curl transcript style, compression (`http-compression-01-df4.md`):**
```
> GET /echo/foo HTTP/1.1
> Host: localhost:4221
> User-Agent: curl/7.81.0
> Accept: */*
> Accept-Encoding: gzip  // Client specifies it supports the gzip compression scheme.
```

**HTTP — gzip hex dump (`http-compression-03-cr8.md`):**
```
1F 8B 08 00 00 00 00 00  // This is the hexadecimal representation of the body.
00 03 4B 4C 4A 06 00 C2  // It should actually be sent as binary data.
41 24 35 03 00 00 00
```

**SQLite — file header hex (`base-01-dr6.md`):**
```
// Start of file
53 51 4c 69 74 65 20 66 6f 72 6d 61 74 20 33 00  // Magic string: "SQLite format 3" + null terminator.
10 00                                            /* Database page size, in bytes.
                                                    Here, the page size is 4096 bytes. */
...
```

**SQLite — hexdump with offsets (`base-03-sz4.md`):**
```
00000ec0           78 03 07 17 1b  1b 01 81 47 74 61 62 6c  |   x.......Gtabl|
00000ed0  65 6f 72 61 6e 67 65 73  6f 72 61 6e 67 65 73 04  |eorangesoranges.|
```

**SQLite — annotated varint/serial type walkthrough (`base-03-sz4.md`):**
```
// Size of the record (varint): 120
78

// The rowid (safe to ignore)
03

// Record header
07     // Size of record header (varint): 7

17     // Serial type for sqlite_schema.type (varint):     23
       // Size of sqlite_schema.type =                     (23-13)/2 = 5
...
6f 72 61 6e 67 65 73  // Value of sqlite_schema.tbl_name: "oranges"  <---
```

**SQLite — SQL I/O only, no byte layout (`base-05-az9.md`):**
```
$ ./your_program.sh sample.db "SELECT name FROM apples"
```
```
Granny Smith
Fuji
Honeycrisp
Golden Delicious
```

---

### Example conventions compared

| Feature | HTTP | SQLite |
|---|---|---|
| Concrete vs placeholder | Mix: `abc`, `foobar/1.2.3` concrete; `{str}`, `{filename}`, "random string" as placeholders | `sample.db`, `apples`, `superheroes.db`, `companies.db` concrete; `<column>`, `<table>` in course-definition only |
| Invisible characters | `\r\n` shown literally in JS-fenced blocks; CRLF linked to MDN | Null byte in magic string comment; varints shown as raw hex bytes |
| Byte offsets | Not used | hexdump-style offsets in stage 3 (`00000ec0`) |
| Inline annotations | `//` comments on every line in breakdown blocks | `//` and `/* */` in hex blocks; formula annotations for serial types |
| Tables | Not used | Serial type table **deferred to external spec** |
| Worked examples per stage | **Mean ~4.1 fenced blocks/stage** (57 total / 14) | **Mean ~2.7/stage** (24 total / 9); **stages 4–9 average ~2.0**, mostly command+output only |

**Does SQLite give enough worked examples?**

- **Stages 1 & 3:** Yes — strong hex annotation (especially stage 3).
- **Stage 2:** Weak — describes b-tree page header fields but **no hex walkthrough** for page 1; points to official docs.
- **Stages 4–9:** No — command transcript + expected output only. No worked byte layout for row reading, WHERE evaluation, B-tree interior nodes, or index traversal.

**External spec reliance:** SQLite repeatedly says `"See the official documentation"` for varints, record format, serial type codes, b-tree pages — rather than inlining the tables/formulas HTTP inlines for CRLF and headers.

---

## 5. TESTS SECTION

### Three verbatim Tests sections — HTTP

**1. `base-02-ia4.md`:**
```
### Tests

The tester will execute your program like this:
```bash
$ ./your_program.sh
```

The tester will then send an HTTP `GET` request to your server:
```bash
$ curl -v http://localhost:4221
```

Your server must respond to the request with the following response:
```javascript
HTTP/1.1 200 OK\r\n\r\n
```
```

**2. `base-03-ih0.md`:**
```
### Tests

The tester will execute your program like this:
```bash
$ ./your_program.sh
```

The tester will then send two HTTP requests to your server.

First, the tester will send a `GET` request, with a random string as the path:
```bash
$ curl -v http://localhost:4221/abcdefg
```

Your server must respond to this request with a `404` response:
```javascript
HTTP/1.1 404 Not Found\r\n\r\n
```

Then, the tester will send a `GET` request, with the path `/`:
```bash
$ curl -v http://localhost:4221
```

Your server must respond to this request with a `200` response:
```javascript
HTTP/1.1 200 OK\r\n\r\n
```
```

**3. `base-07-ap6.md`:**
```
### Tests

The tester will execute your program with a `--directory` flag. Your program should read this flag from the command-line arguments, and treat the specified directory as the root directory for all file requests.

```
$ ./your_program.sh --directory /tmp/
```

The tester will then send two `GET` requests to the `/files/{filename}` endpoint. Each request corresponds to the file path `{directory}/{filename}`.

Your response should depend on whether the file at `{directory}/{filename}` exists or not.

#### First request
The first request will ask for a file that exists in the files directory:
```
$ echo -n 'Hello, World!' > /tmp/foo
$ curl -i http://localhost:4221/files/foo
```

Your server must respond with a `200` response that contains the following parts:
- `Content-Type` header set to `application/octet-stream`.
- `Content-Length` header set to the size of the file, in bytes.
- Response body set to the file contents.
```
HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: 13\r\n\r\nHello, World!
```
```

**HTTP test patterns:**
- Always starts with `$ ./your_program.sh`
- Exact curl/nc commands with flags (`-v`, `-i`, `-H`, `--data`, `--http1.1 --next`)
- Exact expected wire strings
- Random values explicitly labeled ("random string as the path", "some random text", "exact number of connections is determined at random")
- Local reproduction: stage 7 shows `echo -n 'Hello, World!' > /tmp/foo`; compression-03 suggests `echo -n <uncompressed-str> | gzip | hexdump -C`

---

### Three verbatim Tests sections — SQLite

**1. `base-01-dr6.md`:**
```
### Tests

Here's how the tester will execute your program:

```
$ ./your_program.sh sample.db .dbinfo
```

Your program must print the database page size of the database file, like this:

```
database page size: 4096
```
```

**2. `base-02-ce0.md`:**
```
### Tests

Here's how the tester will execute your program:
```
$ ./your_program.sh sample.db .dbinfo
```

Your program must print the following values:
- Database page size
- Number of tables

```
database page size: 4096
number of tables: 3
```
```

**3. `base-03-sz4.md`:**
```
### Tests

Here's how the tester will execute your program:
```
$ ./your_sqlite3.sh sample.db .tables
```

Your program must print the names of the tables in the database file:
```
apples oranges
```
```

**SQLite stages 4–9 (no `### Tests` heading) — example from `base-08-ws9.md`:**
```
Here's how the tester will execute your program:

```
$ ./your_program.sh superheroes.db "SELECT id, name FROM superheroes WHERE eye_color = 'Pink Eyes'"
```

and here's the output it expects:

```
297|Stealth (New Earth)
790|Tobias Whale (New Earth)
...
```

The tester is going to use a sample database of superheroes that is ~1MB in size. You can download a small
version of this to test locally, read the **Sample Databases** section in the **README** of your repository.
```

**SQLite test patterns:**
- Invocation: `$ ./your_program.sh <db> <command-or-sql>`
- **Inconsistent script name:** stage 3 uses `your_sqlite3.sh`; others use `your_program.sh`
- Sample databases: `sample.db` (stages 1–7), `superheroes.db` (~1MB, stage 8), `companies.db` (~1GB, stage 9)
- Expected output: exact strings for dot-commands; row data for SQL (order often "doesn't matter")
- Local testing: stage 2 Notes mention `hexdump -C sample.db`; stages 8–9 point to README **Sample Databases** section for smaller downloadable versions
- Random/generated: stage 9 — "The tester will run multiple randomized queries" on `country` column; no exact SQL strings given for those
- Performance assertion: stage 9 — "return query results in less than 3 seconds" on ~1GB DB (course-definition says "under 5 seconds" — another inconsistency)

---

## 6. NOTES / EDGE CASES

### HTTP — scope-limiting sentences (5+)

1. `"You can ignore the contents of the request. We'll cover parsing requests in later stages."` — `base-02-ia4.md`
2. `"You can ignore the headers for now. You'll learn about parsing headers in a later stage."` — `base-03-ih0.md`
3. `"For this stage, you don't need to compress the body. You'll implement compression in a later stage."` — `http-compression-01-df4.md`, `http-compression-02-ij8.md`
4. `"There's another method for HTTP compression that uses the TE and Transfer-Encoding headers. We won't cover that method in this extension."` — `http-compression-01-df4.md`
5. `"You'll add support for Accept-Encoding headers with multiple compression schemes in a later stage."` — `http-compression-01-df4.md`
6. `"It's normal for a very short string like abc to increase in size when compressed."` — `http-compression-03-cr8.md`
7. `"To learn how HTTP works, you'll implement your server from scratch using TCP primitives, without relying on built-in or external HTTP libraries."` — base-02 Notes

**What goes into HTTP Notes:** deferred features, out-of-scope protocol variants, library restrictions, debugging tips, spec/MDN links.

---

### SQLite — scope-limiting sentences (5+)

1. `"In this challenge, you can assume that databases only contain tables—no indexes, views, or triggers."` — `base-02-ce0.md`
2. `"In this challenge, you can assume that the sqlite_schema table is small enough to fit entirely on a single page."` — `base-02-ce0.md`
3. `"You can ignore the rowid—it's not relevant to this stage."` — `base-03-sz4.md`
4. `"You do not need to implement either of these features for your .tables command."` (pattern arg, extra spacing) — `base-03-sz4.md`
5. `"You do not need to handle payload overflow in this challenge."` — `base-03-sz4.md`
6. `"For now you can assume that the contents of the table are small enough to fit inside the root page."` — `base-04-nd9.md`, `base-07-rf3.md`
7. `"Remember: You don't need to implement a full-blown SQL parser just yet… For now you can just split the input by " " and pick the last item to get the table name."` — `base-04-nd9.md`
8. `"You can assume that all queries run by the tester will include country in the WHERE clause, so they can be served by the index."` — `base-09-nz8.md`

**What goes into SQLite Notes (when present):** assumptions about schema contents, overflow/payload exclusions, hex inspection tips, external spec links. **Stages 4–9 have no Notes section at all** — scope limits appear inline or not at all.

---

## 7. LANGUAGE

### HTTP — voice profile
- **Tense:** Present/future instructional ("you'll implement", "your server must respond")
- **Voice:** Direct second person, active
- **Contractions:** Frequent ("you'll", "we'll", "don't", "it's", "won't")
- **Sentence length:** Short-to-medium; lists and code blocks carry complexity
- **Hedging:** Minimal; requirements use "must"

**5 especially clear sentences (HTTP):**
1. `"An HTTP response is made up of three parts, each separated by a CRLF (\r\n): 1. Status line. 2. Zero or more headers… 3. Optional response body."` — base-02
2. `"The 'request target' specifies the URL path for this request. In this example, the URL path is /index.html."` — base-03
3. `"The two headers are required for the client to be able to parse the response body."` — base-04
4. `"If the server doesn't support any of the compression schemes specified by the client, then it will not compress the response body."` — compression-01
5. `"In HTTP/1.1, connections are persistent by default unless the client sends a Connection: close header"` — persistent-01

**5 confusing/ambiguous/overloaded sentences (HTTP):**
1. `"Message body set to the User-Agent value."` — base-05 (inconsistent term: "message body" vs "response body" used elsewhere)
2. `"Header that specifies the format of the request body` + `Content-Length: 5\r\n` on separate lines in POST example — base-08 (Content-Type line missing `\r\n` unlike other headers)
3. `"The exact number of connections is determined at random."` — base-06 (no hint how many; hard to reproduce locally)
4. `"Your server must respond with a 200 response that contains the following parts:"` followed by a single-line wire string — base-04 (bullets vs monolithic string slightly redundant)
5. Stage 1 has Tests/Notes commented out — learner may not know what's tested — `base-01-at4.md`

**Jargon introduced without definition (HTTP):** Minimal — CRLF is linked and shown as `\r\n`; "request target", "origin form" linked to RFC; "reason phrase" named inline.

---

### SQLite — voice profile
- **Tense:** Same instructional frame, but stages 4–9 become telegraphic
- **Contractions:** `"you'll"`, `"don't"`, `"doesn't"` in early stages; less in late stages
- **Sentence length:** Stage 3 has long multi-clause sentences; stages 6–7 are extremely short
- **Hedging:** More deferrals to external docs ("See the official documentation")

**5 especially clear sentences (SQLite):**
1. `"The SQLite database file begins with the database header. The database page size is stored in the header, right after the magic string. It's a 2-byte, big-endian value (read left-to-right)."` — base-01
2. `"So, the number of tables in the database is equal to the number of cells on the sqlite_schema page."` — base-02
3. `"Remember: You don't need to implement a full-blown SQL parser just yet… For now you can just split the input by " " and pick the last item to get the table name."` — base-04
4. `"The order of rows returned doesn't matter."` — base-05
5. `"Rather than reading all rows in a table and then filtering in-memory, we'll use an index to perform a more intelligent search."` — base-09

**5 confusing/ambiguous/overloaded sentences (SQLite):**
1. `"You'll learn more about b-tree pages in later stages. For now, here's what you need to know:"` — base-02 ( defers the very concept needed for stage 2 )
2. `"See the official documentation to learn how they work."` (varints) — base-03 (offloads critical parsing logic)
3. `"We'll deal with tables that span multiple pages in stage 7."` — base-04 (**wrong stage number**; multi-page is stage 8)
4. `"This stage is similar to the previous one, just that you'll read data from multiple columns instead of just one."` — course-definition stage 6 vs stage description `"just that the tester will query for multiple columns"` — minor mismatch
5. course-definition stages 7 & 8 share nearly identical marketing_md about WHERE filtering, but stage 8 is about multi-page B-tree traversal — **metadata contradicts content**

**Jargon introduced without definition (SQLite):**
| Term | Where introduced | Defined? |
|---|---|---|
| varint | base-03 | Name only; `"See the official documentation"` |
| b-tree page | base-02 | Partial; deferred `"in later stages"` |
| cell pointer array | base-03 | Structural bullets only |
| serial type code | base-03 | Formula shown for one example; full table deferred to spec |
| leaf cell / interior cell | base-03 | `"table b-tree leaf cell"` named, not contrasted with interior |
| payload | base-03 Notes | `"called 'payload' in the official documentation"` |
| rootpage | base-04 | Used without diagram |
| index scan | base-09 | Concept named; **no format/algorithm for index pages** |

---

## 8. LINKS & EXTERNAL DOCS

### Frequency
- **HTTP:** ~12 external links across 14 stages (~0.9/stage); clustered in teaching stages 2–5
- **SQLite:** ~25 links across 9 stages (~2.8/stage); heavily weighted to `sqlite.org/fileformat.html`

### HTTP link style
- MDN for concepts (CRLF, HTTP messages, User-Agent, endianness N/A)
- RFC 9112 for normative details
- Wikipedia for compression/event loop
- Framing: `"For more information about…"`, `"see the MDN Web Docs on… or the HTTP/1.1 specification"`

### SQLite link style — verbatim framing examples
- `"For more information about the SQLite database file format, see the [Database File Format](https://www.sqlite.org/fileformat.html#the_database_header) guide."` — base-01
- `"See the [official documentation](https://www.sqlite.org/fileformat.html#b_tree_pages) for more information."` — base-02
- `"See the [official documentation](https://www.sqlite.org/fileformat.html#b_tree_pages) to learn how they work."` — base-03 (varints)
- `"See the [official documentation](https://www.sqlite.org/fileformat.html#record_format) for the table of all serial type codes."` — base-03
- `"For specifics on how SQLite stores B-trees on disk, read the [B-tree Pages](https://www.sqlite.org/fileformat.html#b_tree_pages) documentation section."` — base-08
- Third-party: [HexEd.it](https://hexed.it/), [Busying Oneself With B-Trees](https://medium.com/basecs/...) — rare, practical

**Does SQLite offload too much to the external spec?**

**Yes, especially after stage 3.** Critical implementation knowledge — varint decoding, serial type table, b-tree interior node layout, index B-tree structure — is referenced but not inlined. HTTP inlines CRLF semantics, header structure, and full request/response examples; SQLite inlines one hero hex walkthrough (stage 3) then stops.

Stage 8 links to a Medium article + spec section but provides **zero** worked hex for interior b-tree nodes. Stage 9 mentions index `idx_companies_country` but **never describes index b-tree page layout**.

---

## 9. WEAK SPOTS

### HTTP — worst stage descriptions

**1. `stage_descriptions/base-01-at4.md`**
- Tests and Notes are HTML-commented out; learner gets 95 words and no explicit pass criteria in visible content.
- **Fix:** Uncomment Tests/Notes or merge into visible body.

**2. `stage_descriptions/base-06-ej5.md`**
- No concept section; concurrent connections not explained beyond test script.
- Random connection count unspecified.
- **Fix:** Add 3–4 sentences on threading/event-loop model; give example connection count.

**3. `stage_descriptions/http-persistent-connections-02-ul1.md` (112 words)**
- Pure checklist Tests; no wire example showing two connections with `--next`.
- **Fix:** Show expected behavior with two parallel curl sessions.

These are minor compared to SQLite — HTTP's weak spots are **thin extension stages**, not broken scaffolding.

---

### SQLite — worst stage descriptions (detailed)

**1. WORST: `stage_descriptions/base-02-ce0.md` — the silent cliff**

**Problems:**
- Follows 257-word gentle stage 1 with 457 words introducing `sqlite_schema`, pages, b-tree page headers, cell count — marked `hard` in YAML, **unmarked in prose**.
- No hex walkthrough of page 1 header despite telling learner to read cell count from b-tree page header.
- Defers b-tree understanding: `"You'll learn more about b-tree pages in later stages."`
- Assumes learner can map "number of rows in sqlite_schema" → "number of cells on page 1" without showing either count visually.

**Rewrite would need:**
- Explicit `"This stage is significantly harder than the previous one"` callout
- Annotated hex dump of page 1 header with file header + b-tree page header + cell count field highlighted (mirror stage 1's style)
- Numeric walkthrough: "this byte at offset X = 3 cells = 3 tables"
- Bridge diagram: file → page 1 → sqlite_schema → cell count
- Keep assumptions in a visible Notes block

---

**2. `stage_descriptions/base-05-az9.md` — binary + SQL parsing collision**

**Problems:**
- 207 words; introduces CREATE TABLE parsing alongside record column extraction.
- No example CREATE TABLE string, no mapping from column name → serial type index → byte offset in record.
- Optional parser libraries mentioned (Python/Go/Rust) but no guidance on what minimally must be parsed.
- No Tests/Notes sections.

**Rewrite would need:**
- Split or sequence: (a) show one full row hex decode for `apples.name`, (b) show CREATE TABLE string from `sqlite_schema.sql`, (c) show column index mapping table
- Minimal parser spec: "you only need to extract column names in order from this subset of CREATE TABLE syntax…"
- Worked example tying SQL column name → ordinal → record bytes

---

**3. `stage_descriptions/base-08-ws9.md` — multi-page B-tree with no bytes**

**Problems:**
- 194 words; first stage requiring interior b-tree traversal.
- Links to Medium + spec; no interior vs leaf page distinction; no child pointer explanation.
- Sample DB help deferred to README.
- course-definition marketing_md incorrectly describes WHERE filtering (copy-paste from stage 7).

**Rewrite would need:**
- Page type byte explanation (0x05 interior, 0x0d leaf — from spec, inlined)
- Small 2-level B-tree hex diagram using superheroes excerpt
- Algorithm pseudocode: "if interior, read child page numbers and recurse; if leaf, read cells"
- Correct marketing_md in course-definition.yml

---

**4. `stage_descriptions/base-09-nz8.md` — index scan black box**

**Problems:**
- States performance requirement (3s on ~1GB) but doesn't teach index b-tree structure.
- `"You can assume… country in the WHERE clause"` — scope limit without explaining why index helps.
- No comparison to stage 8 full scan; learner must infer index traversal from spec alone.
- Performance numbers inconsistent: stage text says 3 seconds; course-definition says 5 seconds.

**Rewrite would need:**
- Explain `idx_companies_country` index structure (rootpage in sqlite_schema for index)
- Contrast algorithm: O(n) full scan vs O(log n) index seek
- Smaller worked example on sample.db before 1GB perf test
- Align timeout numbers across YAML and stage text

---

**5. `stage_descriptions/base-06-vc9.md` / `base-07-rf3.md` — skeleton stages**

**Problems:**
- 81 and 89 words respectively — shortest in either course.
- No Tests heading, no Notes, no edge cases (e.g., WHERE on non-indexed column syntax subset).
- Stage 7 repeats single-page assumption already stated in stage 4.

**Rewrite would need:**
- Explicit SQL grammar subset allowed for WHERE (`column = 'literal'` only?)
- Example query + output (already partially present) plus one failure/edge case
- Notes on string comparison, NULL handling (even if "not required")

---

## 10. DIRECT COMPARISON — What HTTP Does That SQLite Does Not

This is the core design gap explaining completion rate disparity (HTTP ~10% vs SQLite ~5% in course-definition.yml).

| Pattern | HTTP Server | SQLite |
|---|---|---|
| **Consistent section skeleton** | `Concept → Examples → Tests → Notes` in all teaching stages | Collapses after stage 3; stages 4–9 are I/O stubs |
| **One concept per stage** | Mostly true; multi-concept stages still teach each piece | Stage 2–3 and 5 bundle 3–5 concepts; stage 5 merges binary + SQL parsing |
| **Gradual difficulty ramp** | very_easy ×2 → easy ×4 → medium ×2 | very_easy ×1 → **hard ×2 cliff** → medium ×1 → hard ×6 |
| **Difficulty signposting** | Implicit via stage ordering; JS stage warns "may pass without changes" | **No "this is hard" warnings**; YAML says hard but prose doesn't |
| **Inline protocol teaching** | Full request/response breakdowns with `\r\n` annotations | One hero hex dump (stage 3); then nothing for B-trees/indexes |
| **Exact expected bytes/strings** | Every test shows exact wire format | Dot-command stages yes; SQL stages show row text only, not bytes |
| **Test structure** | `#### First request` / `#### Second request` negative cases | Single happy-path; stage 9 mentions randomized queries without examples |
| **Scope fences in Notes** | Consistent `"you can ignore…"`, `"we won't cover…"` | Notes disappear after stage 3 |
| **Deferred features named explicitly** | "later stage", "later in this extension" | Some deferrals, but critical path items deferred to external spec |
| **Local reproduction recipe** | curl one-liners; gzip hexdump tip; echo file setup | hexdump mention in stage 2 only; large DBs point to README |
| **Negative test cases** | 404 vs 200, invalid encoding, missing Content-Encoding | Essentially none in SQL stages |
| **Continuity without contradiction** | Clean forward references | **Broken stage number** (4→"stage 7"); duplicate/wrong marketing_md (7 vs 8) |
| **Script naming consistency** | Always `./your_program.sh` | `your_program.sh` vs `your_sqlite3.sh` in stage 3 |
| **Performance requirements** | None (functional only) | Stage 9 adds 3s/5s timeout with no algorithm guidance |
| **Language-specific scaffolding** | JS/TS event-loop note in concurrency stage | Optional SQL parser libs mentioned once in stage 5 (Python/Go/Rust only) |
| **Extension onboarding** | `"Welcome to the HTTP Compression extension!"` | N/A (no extensions) |
| **Worked example density** | ~4.1 code blocks/stage | ~2.7/stage; **~2.0 in SQL half** |
| **External doc reliance** | MDN/RFC as supplement after inline teaching | Spec as **primary teacher** for varints, serial types, b-tree interiors, indexes |
| **Invisible character handling** | `\r\n` literal + glossary link | Null byte mentioned once; varints as hex without decode algorithm |
| **Concept→Test alignment** | Everything taught is tested immediately | Stages 8–9 test B-tree/index skills not taught in stage text |

### The HTTP "recipe" (what makes it work)

1. Teach the wire format **before** asking for implementation.
2. Show annotated breakdown **and** monolithic wire string.
3. Give exact curl command learner can paste.
4. Tell learner what's **out of scope** this stage.
5. Add a negative test case so learner validates branching logic.
6. Increase difficulty one layer at a time (TCP → status → path → body → headers).

### What SQLite would need to match that recipe

1. **Stage 2 bridge stage** (`easy`): read one field from page header with hex — don't jump to cell counts yet.
2. **Stage 3 split** or slim down: varints + record format OR cell pointers — not both at once.
3. **Reintroduce section skeleton for SQL stages**: Concept → Example → Tests → Notes.
4. **Stage 5 pre-work**: show CREATE TABLE → column index → record bytes as one diagram.
5. **Stage 8**: inline interior/leaf page algorithm before linking to spec.
6. **Stage 9**: teach index b-tree page layout; add small index on sample.db before 1GB perf gate.
7. **Fix metadata bugs**: stage numbering, marketing_md duplicates, script name, timeout values.
8. **Signpost the cliff** at stage 2 opening: explicit difficulty warning + "review stage 1 hex + read fileformat.html §b-tree pages first."

---

## Summary Statistics

| Metric | HTTP (14 stages) | SQLite (9 stages) |
|---|---|---|
| Avg words/stage | ~210 | ~273 (bimodal) |
| Avg code blocks/stage | ~4.1 | ~2.7 |
| Stages with `### Tests` | 13/14 | 3/9 |
| Stages with `### Notes` | ~10/14 | 3/9 |
| Stages with concept primer | ~10/14 | 3/9 |
| External links/stage | ~0.9 | ~2.8 |
| Difficulty cliff | gentle | stage 1→2 (very_easy→hard) |
| Completion % (YAML) | 10 | 5 |

The HTTP course treats stage descriptions as **tutorial documents** that happen to end in tests. The SQLite course front-loads tutorial content into stages 1–3, then switches to **test specifications** that assume spec-reading and inference — which correlates with the reported abandonment pattern after the stage 2–3 cliff.

[REDACTED]