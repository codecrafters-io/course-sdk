# CodeCrafters Tester Test-Design Patterns — Cross-Repo Analysis

Analysis of four Go tester repos and their course descriptions. Focus is reusable **authoring rules**, not domain knowledge.

**Repos analyzed:**
- `/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester`
- `/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/shell-tester`
- `/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/http-server-tester`
- `/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/sqlite-tester`

---

## 1. Test Granularity Per Stage

### Pattern: early = 1–2 assertions; mid = 3–8; late = 8–20+ command-level checks

Early stages test **one new behavior** with 1 declarative test case. Later stages compose many test cases, often with loops, multi-client orchestration, or sub-scenarios.

### Actual counts for 10 named stages

| Stage | Slug | Repo | Distinct assertion batches / test cases | Notes |
|-------|------|------|----------------------------------------|-------|
| Bind to port | `jm1` | redis | **1** (`BindTestCase` with retry loop) | No RESP assertion |
| PING once | `rg2` | redis | **1** `SendCommandTestCase` | |
| GET/SET | `la7` | redis | **2** (SET + GET) | Random key/value |
| RPUSH new list | `mh6` | redis | **1** | |
| Expiry | `yz1` | redis | **3** (SET PX, GET before sleep, GET after) | + timing sleep |
| Repl cmd propagation | `zn8` | redis | **~9** (handshake ~5 steps + 3 SET + 3 receive) | Multi-client |
| BLPOP timeout | `xj7` | redis | **2 sub-scenarios**, **4** command-level checks | Timeout + push-before-timeout |
| ZCARD | `kn4` | redis | **2N+3** (N=3–5 → **9–13**) | Loop: ZADD+ZCARD per member |
| GEOSEARCH | `rm9` | redis | **4–6 GEOADD + 3 GEOSEARCH** = **7–9** | Computed radii |
| Print prompt | `oo8` | shell | **1** prompt assertion | Also sets random `$HOME` |
| REPL loop | `ff0` | shell | **3–6** `InvalidCommandTestCase` | Each = 2 line assertions |
| BG job output | `si2`/`bg3` | shell | **~6** test-case invocations | FIFO setup + bg/fg |
| Connect TCP | `at4` | http | **1** connect success | Retry loop, no declarative case |
| 200 OK | `ia4` | http | **1** `SendRequestTestCase` | |
| Concurrent conn | `ej5` | http | **2 × (2–3) = 4–6** requests | Two connection waves |
| GET file | `ap6` | http | **2** (existing file + 404) | Hidden 404 check |
| .dbinfo init | `dr6` | sqlite | **2** (exit code + regex) | Random page size |
| Table scan | `ws9` | sqlite | **3** random queries × line-set compare | |

### Three verbatim stage test functions

**Very simple — `testListRpush1` (1 assertion):**

```11:36:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_list_rpush1.go
func testListRpush1(stageHarness *test_case_harness.TestCaseHarness) error {
	b := redis_executable.NewRedisExecutable(stageHarness)
	if err := b.Run(); err != nil {
		return err
	}

	logger := stageHarness.Logger
	clientsSpawner := ClientsSpawner{
		Addr:         "localhost:6379",
		StageHarness: stageHarness,
	}
	client, err := clientsSpawner.SpawnClientWithPrefix("client")
	if err != nil {
		return err
	}

	keyAndValue := testerutils_random.RandomWords(2)

	testcase := test_cases.SendCommandTestCase{
		Command:   "RPUSH",
		Args:      keyAndValue,
		Assertion: resp_assertions.NewIntegerAssertion(1),
	}

	return testcase.Run(client, logger)
}
```

**Medium — `testGetSet` (2 assertions + random inputs):**

```12:60:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_get_set.go
func testGetSet(stageHarness *test_case_harness.TestCaseHarness) error {
	b := redis_executable.NewRedisExecutable(stageHarness)
	if err := b.Run(); err != nil {
		return err
	}

	logger := stageHarness.Logger

	clientsSpawner := ClientsSpawner{
		Addr:         "localhost:6379",
		StageHarness: stageHarness,
	}
	client, err := clientsSpawner.SpawnClientWithPrefix("client")
	if err != nil {
		return err
	}

	keyAndValue := random.RandomWords(2)

	key := keyAndValue[0]
	value := keyAndValue[1]

	logger.Debugf("Setting key %s to %s", key, value)
	setCommandTestCase := test_cases.SendCommandTestCase{
		Command:   "set",
		Args:      []string{key, value},
		Assertion: resp_assertions.NewSimpleStringAssertion("OK"),
	}

	if err := setCommandTestCase.Run(client, logger); err != nil {
		logFriendlyError(logger, err)
		return err
	}

	logger.Debugf("Getting key %s", key)

	getCommandTestCase := test_cases.SendCommandTestCase{
		Command:   "get",
		Args:      []string{key},
		Assertion: resp_assertions.NewBulkStringAssertion(value),
	}

	if err := getCommandTestCase.Run(client, logger); err != nil {
		logFriendlyError(logger, err)
		return err
	}

	client.Close()
	return nil
}
```

**Complex — `testWait` (multi-replica orchestration, 2 full WAIT scenarios):**

```50:116:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_repl_wait.go
func testWait(stageHarness *test_case_harness.TestCaseHarness) error {
	deleteRDBfile()

	// Step 1: Boot the user's code as a Redis master.
	master := redis_executable.NewRedisExecutable(stageHarness)
	if err := master.Run("--port", "6379"); err != nil {
		return err
	}

	logger := stageHarness.Logger
	defer logger.ResetSecondaryPrefixes()

	// Step 2: Spawn multiple replicas and have each perform a handshake
	replicaCount := testerutils_random.RandomInt(3, 5)
	logger.Infof("Proceeding to create %v replicas.", replicaCount)

	replicas, err := SpawnReplicas(replicaCount, stageHarness, logger, "localhost:6379")
	if err != nil {
		return err
	}
	for _, replica := range replicas {
		defer replica.Close()
	}

	// Step 3: Connect to master
	clientsSpawner := ClientsSpawner{
		Addr:         "localhost:6379",
		StageHarness: stageHarness,
	}
	client, err := clientsSpawner.SpawnClientWithPrefix("client")
	if err != nil {
		return err
	}

	logger.UpdateLastSecondaryPrefix("test")
	client.UpdateBaseLogger(logger)
	for _, r := range replicas {
		r.UpdateBaseLogger(logger)
	}

	if err = RunWaitTest(client, replicas, WaitTest{
		WriteCommand:        []string{"SET", "foo", "123"},
		WaitReplicaCount:    1,
		ActualNumberOfAcks:  1,
		WaitTimeoutMilli:    500,
		ShouldVerifyTimeout: false,
		Logger:              logger,
	}); err != nil {
		return err
	}

	logger.Successf("Passed first WAIT test.")

	waitCommandReplicaSubsetCount := testerutils_random.RandomInt(2, replicaCount) + 1
	if err = RunWaitTest(client, replicas, WaitTest{
		WriteCommand:        []string{"SET", "baz", "789"},
		WaitReplicaCount:    waitCommandReplicaSubsetCount,
		ActualNumberOfAcks:  waitCommandReplicaSubsetCount - 1,
		WaitTimeoutMilli:    2000,
		ShouldVerifyTimeout: true,
		Logger:              logger,
	}); err != nil {
		return err
	}

	return nil
}
```

---

## 2. Structure of a Stage Test

### Recurring skeleton

All network/process testers follow the same choreography:

1. **Spawn binary** — `redis_executable.NewRedisExecutable(...).Run(...)`, `shell_executable.NewShellExecutable(...)`, `NewHTTPServerBinary(...)`, or `executable.Run(...)` (sqlite)
2. **Wait for ready** — TCP dial retry loops (`BindTestCase`, `testConnects`), or shell prompt assertion with longer initial timeout
3. **Send input** — RESP command, shell command, HTTP request, CLI args
4. **Assert** — declarative assertion object(s)
5. **Cleanup** — `RegisterTeardownFunc`, `client.Close()`, `deleteRDBfile()`, remove temp dirs

Redis adds: **spawn clients** via `ClientsSpawner`, **instrumented logging** per connection prefix (`[client]`, `[replica]`).

### Core abstractions (verbatim)

**Redis — send + assert:**

```15:72:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_cases/send_command_test_case.go
type SendCommandTestCase struct {
	Command                   string
	Args                      []string
	Assertion                 resp_assertions.RESPAssertion
	ShouldSkipUnreadDataCheck bool
	Retries                   int
	ShouldRetryFunc           func(resp_value.Value) bool

	// ReceivedResponse is set after the test case is run
	ReceivedResponse resp_value.Value

	readMutex sync.Mutex
}

func (t *SendCommandTestCase) Run(client *instrumented_resp_connection.InstrumentedRespConnection, logger *logger.Logger) error {
	receiveValueTestCase := ReceiveValueTestCase{
		Assertion:                 t.Assertion,
		ShouldSkipUnreadDataCheck: t.ShouldSkipUnreadDataCheck,
	}

	for attempt := 0; attempt <= t.Retries; attempt++ {
		if attempt > 0 {
			logger.Infof("Retrying... (%d/%d attempts)", attempt, t.Retries)
		}

		command := strings.ToUpper(t.Command)

		if err := client.SendCommand(command, t.Args...); err != nil {
			return err
		}

		t.readMutex.Lock()
		err := receiveValueTestCase.RunWithoutAssert(client)
		t.readMutex.Unlock()

		if err != nil {
			return err
		}

		if t.Retries == 0 {
			break
		}

		if t.ShouldRetryFunc == nil {
			panic(fmt.Sprintf("Received SendCommand with retries: %d but no ShouldRetryFunc.", t.Retries))
		} else {
			if t.ShouldRetryFunc(receiveValueTestCase.ActualValue) {
				// If ShouldRetryFunc returns true, we sleep and retry.
				time.Sleep(500 * time.Millisecond)
			} else {
				break
			}
		}
	}
	t.ReceivedResponse = receiveValueTestCase.ActualValue

	return receiveValueTestCase.Assert(client, logger)
}
```

**Redis — receive-side + extra-data guard:**

```12:52:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_cases/receive_value_test_case.go
type ReceiveValueTestCase struct {
	Assertion                 resp_assertions.RESPAssertion
	ShouldSkipUnreadDataCheck bool

	// This is set after the test is run
	ActualValue resp_value.Value
}
// ...
func (t *ReceiveValueTestCase) Assert(client *instrumented_resp_connection.InstrumentedRespConnection, logger *logger.Logger) error {
	if err := t.Assertion.Run(t.ActualValue); err != nil {
		return err
	}

	if !t.ShouldSkipUnreadDataCheck {
		client.ReadIntoBuffer() // Let's make sure there's no extra data

		if client.UnreadBuffer.Len() > 0 {
			return fmt.Errorf("Found extra data: %q", client.UnreadBuffer.String())
		}
	}

	client.GetLogger().Successf("✔︎ Received %s", t.ActualValue.FormattedString())
	return nil
}
```

**Shell — command + screen assertion:**

```18:53:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/shell-tester/internal/test_cases/command_response_test_case.go
type CommandResponseTestCase struct {
	// Command is the command to send to the shell
	Command string

	// ExpectedOutput is the expected output string to match against
	ExpectedOutput string

	// FallbackPatterns is a list of regex patterns to match against
	FallbackPatterns []*regexp.Regexp

	// SuccessMessage is the message to log in case of success
	SuccessMessage string
}

func (t CommandResponseTestCase) Run(asserter *logged_shell_asserter.LoggedShellAsserter, shell *shell_executable.ShellExecutable, logger *logger.Logger) error {
	if err := shell.SendCommand(t.Command); err != nil {
		return fmt.Errorf("Error sending command to shell: %v", err)
	}

	commandReflection := fmt.Sprintf("$ %s", t.Command)
	asserter.AddAssertion(assertions.SingleLineAssertion{
		ExpectedOutput: commandReflection,
	})

	asserter.AddAssertion(assertions.SingleLineAssertion{
		ExpectedOutput:   t.ExpectedOutput,
		FallbackPatterns: t.FallbackPatterns,
	})

	if err := asserter.AssertWithPrompt(); err != nil {
		return err
	}

	logger.Successf("%s", t.SuccessMessage)
	return nil
}
```

**HTTP — request/response:**

```15:55:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/http-server-tester/internal/http/test_cases/send_request_test_case.go
type SendRequestTestCase struct {
	Request                   *http.Request
	Assertion                 http_assertions.HTTPResponseAssertion
	ShouldSkipUnreadDataCheck bool

	// ReceivedResponse is set after the test case is run
	ReceivedResponse http_parser.HTTPResponse
}
// ...
func (t *SendRequestTestCase) Run(stageHarness *test_case_harness.TestCaseHarness, address string, logger *logger.Logger) error {
	conn, err := http_connection.NewInstrumentedHttpConnection(stageHarness, address, "")
	// ... send, read, assert, EnsureNoUnreadData
}
```

**Redis batch helper (newer pattern):**

```9:33:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_cases/multi_command_test_case.go
type CommandWithAssertion struct {
	Command   []string
	Assertion resp_assertions.RESPAssertion
}

// MultiCommandTestCase is a concise & easier way to define & run multiple SendCommandTestCase
type MultiCommandTestCase struct {
	CommandWithAssertions []CommandWithAssertion
}

func (t *MultiCommandTestCase) RunAll(client *instrumented_resp_connection.InstrumentedRespConnection, logger *logger.Logger) error {
	for _, cwa := range t.CommandWithAssertions {
		setCommandTestCase := SendCommandTestCase{
			Command:   cwa.Command[0],
			Args:      cwa.Command[1:],
			Assertion: cwa.Assertion,
		}

		if err := setCommandTestCase.Run(client, logger); err != nil {
			return err
		}
	}

	return nil
}
```

### Boilerplate vs declarative ratio

| Repo | Typical stage function | Ratio |
|------|------------------------|-------|
| Redis (new) | ~15 lines setup + N × 5-line test case structs | **~70% declarative** |
| Shell (new) | ~20 lines setup + test case `.Run()` calls | **~60% declarative** |
| HTTP (new) | ~10 lines setup + 1–2 `SendRequestTestCase` | **~80% declarative** |
| SQLite (old) | ~80 lines inline DB setup + manual compare | **~20% declarative** |
| Redis replication/RDB (old) | Imperative loops + inline assertions | **~40% declarative** |

---

## 3. How Tests Map to Stage Descriptions (6 stages)

### Stage A — Redis `la7` (GET/SET)

**Description promises** (`base-06-la7.md`): SET random key → expect `+OK`; GET same key → expect bulk string. Notes: keys/values random; GET-missing-not-tested-here.

**Tester asserts:** Exactly SET OK + GET value with `random.RandomWords(2)`. Matches description.

**Hidden requirements:** None significant. Extra-data check on each response (not mentioned in description).

**Un tested promises:** Description says GET-missing not tested — confirmed, not checked.

---

### Stage B — Redis `zn8` (command propagation)

**Description promises:** Full handshake, wait for RDB, send 3 SETs to master, assert 3 SET commands propagated to replica as RESP arrays on replication connection.

**Tester asserts:** Handshake via `SendReplicationHandshakeTestCase.RunAll`, 3 SET to master, 3 `ReceiveValueTestCase` with `CommandAssertion` on replica. Handles optional leading `SELECT` (hidden from description).

**Hidden requirements:**
- SELECT command skip/retry on first propagated command
- `ShouldSkipUnreadDataCheck` on intermediate receives
- Logger prefix phases (`handshake` / `test`)

**Un tested promises:** Description says "series of write commands" with foo/bar/baz — tester uses fixed keys `foo/123`, `bar/456`, `baz/789` (not random; anti-hardcode via fixed sequence instead).

---

### Stage C — Redis `xj7` (BLPOP with timeout)

**Description promises:** BLPOP with non-zero timeout → null array after timeout; also push-before-timeout → `["list_key", "foo"]`.

**Tester asserts:** Two sub-functions `testOnlyTimeout` + `testPushBeforeTimeout`. Random list key, random timeout 100–500ms, timing assertion `end.Before(start.Add(timeoutDuration))` is failure. Second scenario uses `BlockingClientGroupTestCase`.

**Hidden requirements:**
- Exact timing check (response must not arrive early)
- Random timeout duration (description shows 0.1s example only)
- Multi-client orchestration for push-before-timeout
- `BlockingClientGroupTestCase` expects exactly 1 client receives response; verifies no extra responses on other clients

**Un tested promises:** None major.

---

### Stage D — Shell `si2` / bg3 (background job output)

**Description promises:** bg cat on fifo1, fg cat on fifo2, write to both, verify both outputs appear.

**Tester asserts:** Matches — FIFO paths random, `BackgroundCommandResponseTestCase`, `CommandWithNoResponseTestCase`, `OutputOnlyTestCase` × 2.

**Hidden requirements:**
- Job number assertion (`ExpectedJobNumber: 1`) in bg test case
- Command echo line `$ cat ...` checked via asserter
- Fixture-recording mode skips final `logAndQuit` due to nondeterministic job reaping

**Un tested promises:** Description mentions "both processes share stdout/stderr" — tested indirectly via output visibility, not explicitly.

---

### Stage E — HTTP `ej5` (concurrent connections)

**Description promises:** Random number of concurrent TCP connections, GET request on each, expect `HTTP/1.1 200 OK\r\n\r\n`.

**Tester asserts:** `connectionCount := random.RandomInt(2, 3)`, two waves (close all, respawn, request again). Reverse order in first wave to avoid listen-backlog false pass.

**Hidden requirements:**
- **Second connection wave** after closing all — server must stay alive (not mentioned in description)
- Reverse iteration order (implementation detail from PR #60)
- Connection must stay open (`assertConnectionIsOpen`)

**Un tested promises:** Description shows `sleep 3` before sending — tester sends immediately (no artificial delay).

---

### Stage F — SQLite `ws9` (table scan)

**Description promises:** Single example query on `superheroes.db` with specific eye color, specific row output.

**Description shows:** One fixed query with fixed expected rows.

**Tester asserts:** Symlinks bundled `superheroes.db`, picks **3 random queries** from a pool of 8, compares sorted line sets (order-independent).

**Hidden requirements:**
- Order of output lines doesn't matter (sorted before compare)
- 3 queries not 1
- Exit code 0 check

**Un tested promises:** Description's exact "Pink Eyes" example may not run (random subset).

---

## 4. Determinism & Randomization

### What is randomized and why

| Mechanism | Used in | Purpose |
|-----------|---------|---------|
| `random.RandomWord()` / `RandomWords(n)` | redis, shell, sqlite | Anti-hardcode keys, values, table names |
| `random.RandomInt(min, max)` | all | Counts, timeouts, connection counts, replica counts |
| `random.ShuffleArray` | sqlite, redis zcard | Pick subset queries; shuffle ZADD order |
| Random page size from `[512..32768]` | sqlite dr6 | Anti-hardcode .dbinfo |
| Random table count 2–9 | sqlite ce0 | Anti-hardcode cell count |
| Random port in replication | replica handshake | listening-port |
| `CODECRAFTERS_RANDOM_SEED` | stages_test.go | Fixture reproducibility |

### What is deliberately fixed

- Redis port **6379** (HTTP **4221**)
- Replication handshake command sequence (PING → REPLCONF → PSYNC)
- Fixed kv maps in some repl tests (`foo/123`, `bar/456`, `baz/789`)
- Shell prompt **`$ `** (space after `$`)
- HTTP status line reason phrases (`"OK"`, `"Not Found"`)
- GEOSEARCH uses computed radii from generated location set (deterministic given seed)

### Timing-sensitive handling

**Expiry (`yz1`):** `PX 100`, sleep **101ms**, logs timestamps at each step.

**BLPOP timeout:** Random 100–500ms; verifies response arrives **not before** timeout; uses goroutine + channel.

**Blocking commands:** `BlockingClientGroupTestCase` — 2s select timeout, 1ms sleep for stray responses.

**Replication GET retry:** `SendCommandTestCase` with `Retries` + `ShouldRetryFunc` for propagation lag; fixture normalizer strips retry cycles.

**Shell asserter timeouts:**

```12:15:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/shell-tester/internal/logged_shell_asserter/logged_shell_asserter.go
const INITIAL_READ_TIMEOUT = 5000 * time.Millisecond
const SUBSEQUENT_READ_TIMEOUT = 2000 * time.Millisecond
```

### Timeout values from `tester_definition.go`

| Repo | Explicit timeouts | Notes |
|------|-------------------|-------|
| **redis** | `jm1`: **15s** only | All other stages use harness default |
| **shell** | **Every stage: 15s** | Uniform |
| **http** | **Every stage + anti-cheat: 15s** | Uniform |
| **sqlite** | `ws9`: **60s** (comment: Firecracker perf); `nz8`: **20s** | Others use default |

```44:51:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/sqlite-tester/internal/tester_definition.go
		{
			Slug:     "ws9",
			TestFunc: testTableScan,
			Timeout:  60 * time.Second, // TODO: Turn this back down once we're able to figure out why running inside firecracker takes so long
		},
		{
			Slug:     "nz8",
			TestFunc: testIndexScan,
			Timeout:  20 * time.Second,
		},
```

Longer timeouts correlate with **heavy I/O** (full table B-tree scan) not with logical complexity alone.

---

## 5. Anti-Cheat / Robustness

### Strategies

1. **Random inputs** — keys, values, table names, page sizes, query subsets
2. **Multiple rounds** — ping 3× (`wy1`), concurrent clients (`zu2`), 3–6 invalid commands (`ff0`), 2 WAIT scenarios (`na2`)
3. **Varying order** — shuffled ZADD members (`kn4`), reverse connection order (http ej5)
4. **Dedicated anti-cheat stage** — redis/http run `antiCheatTest` separately

**Redis anti-cheat (verbatim):**

```34:55:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/anti_cheat.go
	// All the answers for MEMORY DOCTOR include the string "sam" in them.
	commandTestCase := test_cases.SendCommandTestCase{
		Command: "MEMORY",
		Args:    []string{"DOCTOR"},
		Assertion: resp_assertions.PrefixAndSubstringsAssertion{
			Logger:       logger,
			ExpectedType: resp_value.BULK_STRING,
			HasSubstringPredicates: []resp_assertions.HasSubstringPredicate{{
				Substring: "Sam",
			}},
		},
		ShouldSkipUnreadDataCheck: true,
	}
	err = commandTestCase.Run(client, logger)

	if err == nil {
		logger.Criticalf("anti-cheat (ac1) failed.")
		logger.Criticalf("Please contact us at hello@codecrafters.io if you think this is a mistake.")
		return fmt.Errorf("anti-cheat (ac1) failed")
	} else {
		return nil
	}
```

Expects **failure** on MEMORY DOCTOR (real Redis answers contain "Sam"; hardcoded wrong answers won't).

### Partial correctness handling

- **Fail fast** — first assertion error returns immediately; no scoring
- **Extra data check** — `"Found extra data: %q"` catches almost-right responses with trailing bytes
- **Type-aware errors** — simple vs bulk string mismatch gets specific message (common user mistake)
- **Shell fallback regexes** — accept bash/ash/zsh/dash error formats
- **Replication retry** — tolerates propagation delay without passing wrong final state
- **Unordered array assertions** — GEOSEARCH results compared sorted (order not required)

---

## 6. Failure Messages & User-Facing Logging

### Message template families

1. **`Expected X, got Y`** — value mismatches (redis RESP, http status/body, sqlite stdout)
2. **`Expected TYPE (hint), found TYPE (hint)`** — RESP type errors with wire-format hints
3. **Diff-style (multi-line)** — XRANGE/XREAD: `"Expected:\n...\nGot:\n..."`
4. **Colored Expected/Received** — shell uses green/red diff via `BuildColoredErrorMessage`
5. **Contextual hints** — `logFriendlyError` after transport failures
6. **Success checkpoints** — `✔︎ Received ...`, `✓ Received prompt`, per-header success in HTTP

### 10+ verbatim failure/log messages

From assertion code and fixtures:

```
Expected simple string "PONG", got bulk string "PONG" instead
```
(from fixture `ping-pong/string_type_mismatch`)

```
Expected %q, got %q
```
(`simple_string_assertion.go`, `bulk_string_assertion.go`)

```
Expected %s%s, found %s%s
```
(`data_type_assertion.go` — includes `($-1\r\n)` hints for nil types)

```
Found extra data: %q
```
(`receive_value_test_case.go`)

```
Expected: %v (in any order), got %v
```
(`unordered_bulk_string_array_assertion.go`)

```
XRANGE response mismatch:
Expected:
%s
Got:
%s
```
(`xrange_response_assertion.go`)

```
Expected status code %d, got %d
```
(`http_response_assertion.go`)

```
Expected %q header to be present
```
(`http_response_assertion.go`)

```
Expected stdout to contain "database page size: 8192", got: "did nothing\n"
```
(sqlite fixture)

```
Looks like your program has terminated. A HTTP server is expected to be a long-running process.
```
(http fixture)

```
Failed to connect to port 6379.
```
(redis bind fixture)

```
Line does not match expected value.
Expected: "..."
Received: "..." (trailing space)
```
(shell `SingleLineAssertion`)

```
Hint: EOF is short for 'end of file'. This usually means that your program either:
 (a) didn't send a complete response, or
 (b) closed the connection early
```
(`log_friendly_error.go`)

```
Retrying... (%d/%d attempts)
```
(`send_command_test_case.go`)

```
✔︎ Received %s
```
(success after each redis assertion)

### Logger level usage

| Level | Purpose | Example |
|-------|---------|---------|
| `Infof` | User-visible test narrative | `$ redis-cli PING`, `$ ./your_sqlite3.sh test.db ".dbinfo"`, "Fetching key at HH:MM:SS" |
| `Debugf` | Wire-level detail | `Sent bytes: "%q"`, `Received bytes: "%q"`, `Received RESP bulk string: "PONG"` |
| `Successf` | Per-assertion pass confirmation | `✔︎ Received "OK"`, `✓ Received prompt ($ )` |
| `Errorf` | Test failure (returned error surfaced) | Assertion error text |
| `Criticalf` | Anti-cheat / internal errors only | `anti-cheat (ac1) failed` |

Raw bytes **are** logged at Debug level in redis (`instrumented_resp_connection.go` callbacks). Shell strips non-printables in error display. HTTP logs connection host/port at Debug.

### Debugging without giving away answers

- Show **what was sent** and **what was received** (types + formatted values), not the correct implementation
- Type-mismatch messages teach RESP encoding (simple vs bulk) without revealing parser code
- Hints explain EOF/connection-reset **symptoms**, not fixes
- Random inputs prevent copying expected outputs from logs
- Shell diff shows expected vs received line but not how to produce it

**Note:** No `CustomOrTypedError` type found in these repos. Friendly errors are handled via `logFriendlyError()` functions and assertion-specific messages.

---

## 7. Progressive / Cumulative Testing

### How "all previous stages must still pass" is enforced

**Platform/harness level**, not inside individual stage functions:

- `tester_definition.go` lists stages in order; the CodeCrafters runner executes **all test functions from stage 1 through current slug**
- Each stage test assumes prior behavior works (e.g., `testGetSet` doesn't re-test PING; `testListRpush1` assumes server still binds and parses RESP)
- `stages_test.go` uses `UntilStageSlug` and multi-slug `StageSlugs` with `pass_all` reference implementations:

```107:112:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/stages_test.go
		"repl_pass": {
			StageSlugs:          []string{"bw1", "ye5", "hc6", "xc1", "gl7", "eh4", "ju6", "fj0", "vm3", "cf8", "zn8", "hd5", "yg4", "xv6", "yd3", "my8", "tu8", "na2"},
			CodePath:            "./test_helpers/pass_all",
			ExpectedExitCode:    0,
			StdoutFixturePath:   "./test_helpers/fixtures/repl-wait/pass",
```

- Shell stage 1 proactively sets random `$HOME` to catch starter code that would break **future** `cd ~` stages:

```19:24:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/shell-tester/internal/stage1.go
	// Let's set HOME to a random dir in stage 1 so that CI catches starter code
	// that relies on $HOME being set to a specific dir.
	//
	// We rely on mutating $HOME in the stages that test `cd ~`. Placing this here
	// ensures that we never accept starter code that wouldn't work in those stages.
	shell.Setenv("HOME", randomDir)
```

**Within a single stage:** Later sub-scenarios build on earlier ones (e.g., `xj7` timeout then push; `na2` two WAIT tests) but do not re-run unrelated prior-stage assertions.

---

## 8. Tester-Side Signals of a Well-Scoped Stage

### Well-scoped stage (tester's perspective)

A stage is well-scoped when its test can be written as:

> **N declarative test-cases** against **one new command/behavior**, with setup limited to "spawn binary + one client/session", and **no hidden multi-phase orchestration**.

**Good examples:**
- `mh6` — 1 `SendCommandTestCase` for RPUSH → integer 1
- `rg2` — 1 PING → PONG
- `oo8` — 1 prompt assertion
- `dr6` — 1 CLI invocation + 1 regex on page size
- `ct1`/`zadd1` — 1 `ZaddTestCase` wrapping 1 command

### Badly-scoped signals (sprawling tests = sprawling stages)

| Stage | Why it's a scope warning |
|-------|--------------------------|
| **`na2` (WAIT)** | Spawns 3–5 replicas, runs 2 full WAIT scenarios, verifies timeout timing, simulates partial ACKs — entire replication subsystem in one stage |
| **`zn8`/`yg4` (replication propagation)** | Handshake + RDB + multi-command propagation + SELECT workaround |
| **`mx3`→`lf1` (pubsub subscribe chain)** | `subscribe3` adds 3 error checks for SET/GET/ECHO not mentioned in that stage's narrow description |
| **`xj7` (BLPOP timeout)** | Two sub-scenarios, timing math, multi-client blocking orchestration |
| **`rm9` (GEOSEARCH)** | Generates location set, computes 3 radii algorithmically — test logic is a mini geospatial engine |
| **`br6`/`p1` (pipelines)** | 2 pipeline tests + live file append during blocking tail -f |
| **`bg9` (job reaping)** | Two major sub-functions, FIFO timing, reaped job banner assertions, fixture nondeterminism comments |
| **`ws9` (sqlite table scan)** | 60s timeout, 1MB DB, 3 random queries — performance + algorithm stage bundled |

**Authoring rule derived:** If the stage test needs its own comment blocks (`/* Test against ECHO/SET/GET */`), sub-functions (`testOnlyTimeout`, `RunWaitTest`), or fixture nondeterminism workarounds, the **stage is probably doing too much**.

---

## 9. Old vs New — What Improved

### Oldest style: sqlite-tester + redis RDB/replication

**SQLite `testInit` — imperative, inline everything:**

```16:61:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/sqlite-tester/internal/stage_init.go
func testInit(stageHarness *test_case_harness.TestCaseHarness) error {
	logger := stageHarness.Logger
	executable := stageHarness.Executable

	_ = os.Remove("./test.db")
	// ...
	pageSizes := []int{512, 1024, 2048, 4096, 8192, 16384, 32768, 65536}
	pageSize := pageSizes[random.RandomInt(0, len(pageSizes))]

	logger.Debugf("Creating test database with page size %d: test.db", pageSize)
	db, err := sql.Open("sqlite", fmt.Sprintf("./test.db?_pragma=page_size(%d)", pageSize))
	// ... create table inline ...
	logger.Infof("$ ./%v test.db .dbinfo", path.Base(executable.Path))
	result, err := executable.Run("test.db", ".dbinfo")
	// ... manual regex assert ...
}
```

**Redis RDB `testRdbReadKey` — custom file creator, one-off assertion:**

```14:56:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_rdb_read_key.go
func testRdbReadKey(stageHarness *test_case_harness.TestCaseHarness) error {
	RDBFileCreator, err := NewRDBFileCreator()
	// ... write random key, hexdump log, run with --dir/--dbfilename ...
	commandTestCase := test_cases.SendCommandTestCase{
		Command:                   "KEYS",
		Args:                      []string{"*"},
		Assertion:                 resp_assertions.NewCommandAssertion(key),
		ShouldSkipUnreadDataCheck: false,
	}

	return commandTestCase.Run(client, logger)
}
```

Uses declarative send/assert but **stage function** still owns all RDB file mechanics.

**Old replication `testReplMasterCmdProp` — imperative loops:**

```56:93:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_repl_master_cmd_prop.go
	for i := 1; i <= len(kvMap); i++ {
		key, value := kvMap[i][0], kvMap[i][1]

		setCommandTestCase := test_cases.SendCommandTestCase{
			Command:   "SET",
			Args:      []string{key, value},
			Assertion: resp_assertions.NewSimpleStringAssertion("OK"),
		}

		if err := setCommandTestCase.Run(client, logger); err != nil {
			return err
		}
	}
	// ... mirror loop for receive with SELECT workaround inline ...
```

### Newest style: redis lists/sorted-sets/geospatial + shell extensions

**Improvements:**

1. **Domain-specific test case types** — `ZaddTestCase`, `GeoAddTestCase`, `GeoSearchTestCase`, `BackgroundCommandResponseTestCase`, `AutocompleteTestCase` — wrap `SendCommandTestCase` / asserter boilerplate
2. **`MultiCommandTestCase`** — declarative command batches (bitmaps bitcount builds `[]CommandWithAssertion`)
3. **Shared data-structure generators** — `sorted_set.GenerateSortedSetWithRandomMembers`, `location_ds.GenerateRandomLocationSet`
4. **Filesystem assertion framework** — AOF stages use `FilesystemAsserter` + typed assertions instead of inline file reads
5. **Richer assertion library** — unordered arrays, prefix+substring, floating point, subscribe response, xrange/xread diff
6. **Instrumented connections** — consistent `$ redis-cli` logging, per-client prefixes, byte-level debug
7. **Shell assertion collection** — composable `AddAssertion` + prompt-aware batch assert vs one-shot reads
8. **Fixture normalization** — `normalizeTesterOutput` strips timestamps, tmp dirs, retry cycles for stable CI

**New ZADD (clean delegation):**

```11:44:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_zset_zadd1.go
func testZsetZadd1(stageHarness *test_case_harness.TestCaseHarness) error {
	// ... standard spawn ...
	zaddTestCase := test_cases.ZaddTestCase{
		Key: zsetKey,
		Member: sorted_set.SortedSetMember{
			Name:  member.Name,
			Score: member.Score,
		},
		ExpectedAddedMembersCount: 1,
	}

	return zaddTestCase.Run(client, logger)
}
```

**New GEOSEARCH (computed expectations, declarative case):**

```28:95:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_geospatial_geosearch.go
	locationSet := location_ds.GenerateRandomLocationSet(testerutils_random.RandomInt(4, 6))
	// ... loop GeoAddTestCase ...
	geosearchSmallRadiusTestCase := test_cases.GeoSearchTestCase{
		Key:                   locationKey,
		FromCoordinates:       centerCoordinates,
		Radius:                closestRadius * 0.75,
		ExpectedLocationNames: []string{},
	}
	// ... mid and large radius cases ...
	return geosearchMidRadiusTestCase.Run(client, logger)
```

**New AOF (filesystem asserter, zero inline I/O parsing):**

```43:54:/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/redis-tester/internal/test_aof_create_append_only_file.go
	fsAsserter := filesystem_asserter.NewFilesystemAsserter([]filesystem_assertion.FilesystemAssertion{
		&filesystem_assertion.DirExistsAssertion{
			AbsolutePath: filepath.Join(dataDirectory, appendDirNameFlag),
		},
		&filesystem_assertion.AofAppendOnlyFileAssertion{
			AbsolutePath: filepath.Join(dataDirectory, appendDirNameFlag, appendOnlyFileBaseName),
			ExpectedCommands: [][]string{},
		},
	})

	return fsAsserter.RunAssertions(logger)
```

### Summary of evolution

| Aspect | Old (sqlite, redis RDB/repl) | New (lists, zset, geo, shell FA/BG) |
|--------|------------------------------|-------------------------------------|
| Test case definition | Inline loops + manual compare | Struct literals + `.Run()` |
| Assertions | Regex/bytes/string compare | Typed assertion objects with hints |
| Randomization | Present but ad-hoc | Systematic via generators |
| Logging | Minimal | Narrative Info + wire Debug + per-assert Success |
| Multi-step stages | Copy-pasted orchestration | Shared test case types + sub-scenario functions |
| Side-effect verification | Read files inline | FilesystemAsserter / asserter collection |

---

## Reusable Authoring Rules (Synthesized)

1. **One stage = one new behavior**, expressible as 1–3 declarative test cases in the common case.
2. **Always randomize** identifiers and payloads; keep ports/prompts/wire constants fixed.
3. **Use typed assertions** that distinguish common mistakes (RESP simple vs bulk, trailing space, extra bytes).
4. **Log in three layers:** narrative (`Infof`), wire (`Debugf`), pass markers (`Successf`).
5. **Fail with `Expected X, got Y`** plus format hints; add symptom hints for transport errors, not solutions.
6. **Check for extra unread data** after each network response.
7. **Extract domain test cases** once a command pattern repeats (Zadd, GeoSearch, BackgroundCommand).
8. **Use `MultiCommandTestCase`** when a stage needs many commands of the same shape.
9. **Document in stage description exactly what the tester checks**; flag multi-client, timing, and error-path tests explicitly to avoid hidden requirements.
10. **If the test needs sub-functions or fixture nondeterminism workarounds**, split the stage.
11. **Set explicit timeouts** only for slow I/O stages; default elsewhere.
12. **Regression is harness-level** (run all prior slugs); individual tests should not re-assert unrelated prior behavior unless the stage explicitly tests integration.

[REDACTED]