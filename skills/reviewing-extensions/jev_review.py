"""Review stage descriptions against the rubric: parser first, Jev for the rest.

The division of labour, which came out of measuring both on the same rules:

  Parser    Anything decided by scanning characters. Exact, free, no false
            positives. Jev is bad at this — asked whether a description with
            zero semicolons contains one, it answered 0.65-0.77, and it
            flagged two descriptions for a phrase that appears in neither.

  Noul      One specific thing that is either present or absent in meaning.
            Breaking the hook moved its question 0.88 -> 0.10 while leaving
            every other question within 0.02, so these discriminate and they
            don't smear into each other.

  Choice    What a passage *is*, when the rule is really a count over kinds.
            Labelling each Notes bullet beat one noul over the whole section:
            it removed a false positive, it says which bullet is the problem,
            and its confidence says when not to trust the label.

Two rules that don't work as questions, and why they aren't here. A rule with
an escape clause ("passes trivially if nothing is randomized") sat at 0.51-0.59
no matter what it was shown: asking a model to decide whether a rule applies
turns a yes/no into an unanswerable. And a rule needing the tester source can't
be answered from a description at all.

    TYPESAFE_API_KEY=apikey_... python3 jev_review.py ../../../build-your-own-claude-code/stage_descriptions/skills-*.md
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

ENDPOINT = "https://api.typesafe.ai/v1/systemone"

# Pinned rather than jev-latest: every threshold below is tied to one model's
# probability distribution.
MODEL = "jev-1.13.0"

# $ per 1M tokens (input, output). The response reports tokens, not money.
PRICE = (0.042, 0.00)

# Below LOW a noul is a finding, above HIGH it's a pass, between is a question
# for a person. The band is wide because a real pass came back at 0.46 once.
LOW, HIGH = 0.40, 0.65

# A choice whose distribution is this flat isn't an answer worth acting on.
MIN_CONFIDENCE = 0.50


# --- what a parser decides ----------------------------------------------------

def parser_findings(text):
    """Exact verdicts. Each entry is a rule that failed, with what tripped it."""
    without_fences = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    prose = re.sub(r"`[^`]*`", "", without_fences)
    findings = {}

    bullets = notes_bullets(text)
    if len(bullets) > 3:
        findings["notes_bullet_cap"] = f"{len(bullets)} top-level bullets, at most 3 allowed"

    if ";" in prose:
        findings["no_semicolons"] = "semicolon in prose"

    stray_heading = re.search(r"^#{1,2} .*", without_fences, flags=re.MULTILINE)
    if stray_heading:
        findings["heading_level"] = f"non-### heading: {stray_heading.group(0)[:50]}"

    for tag, body in re.findall(r"^```(\w*)\n(.*?)^```", text, flags=re.DOTALL | re.MULTILINE):
        if re.search(r"^\s*\$ |your_program\.sh", body, re.MULTILINE) and tag != "bash":
            findings["bash_fenced"] = f"shell block tagged `{tag or 'untagged'}`"

    singular = re.search(
        r"\b(the (previous|next|last|earlier|following) stage|in stage \d|stage \d+'s)\b", prose, re.IGNORECASE
    )
    if singular:
        findings["plural_stage_refs"] = f"singular stage reference: {singular.group(0)!r}"

    real_x = re.search(r"\breal [A-Z]\w+", text)
    if real_x:
        findings["no_real_x"] = f"{real_x.group(0)!r} — use the product's plain name"

    return findings


def notes_bullets(text):
    """Top-level bullets of the Notes section, continuation lines folded in."""
    sections = re.split(r"^### Notes\s*$", text, flags=re.MULTILINE)

    if len(sections) < 2:
        return []

    body = re.split(r"^### ", sections[-1], flags=re.MULTILINE)[0]

    return [" ".join(bullet.split()) for bullet in re.split(r"^- ", body, flags=re.MULTILINE)[1:]]


# --- what Jev decides ---------------------------------------------------------

# Each names one thing that is present or absent in meaning. No escape clauses.
JUDGMENT_RULES = {
    "hook_one_sentence": "The text before the first heading is exactly one sentence, and it states what the learner will implement.",
    # Scoped to the body on purpose. Unscoped, the Tests section satisfies it on
    # its own and the rule can never fail independently of `tests_section`.
    "complete_example": "Outside the `### Tests` section, the explanation contains at least one worked example showing literal input and its literal result. Prose describing what would happen doesn't count.",
    "tests_section": "There is a `### Tests` section, and it shows the exact command the tester runs together with the exact output expected.",
    "no_artifacts": "There are no unresolved authoring artifacts: no TODOs, no content left in HTML comments, no empty or duplicated headings, no truncated sections.",
}

# What a Notes bullet can be. Only the first two earn the section its place.
BULLET_KINDS = {
    "fences_scope": "Bounds the work: says what may be hardcoded, what is deferred to later stages, what is out of bounds, or what the tester will not check.",
    "warns_of_trap": "Names a specific mistake that would fail the stage, and what to do instead.",
    "implementation_tip": "Recommends how to build it — a library, a data structure, an approach. Useful, but it doesn't bound the work.",
    "spec_reference": "Points at external behaviour or a standard, without changing what this stage requires.",
    "trivia": "True, but doesn't change anything the learner does.",
}

LOAD_BEARING = {"fences_scope", "warns_of_trap"}


def build_questions(bullets):
    """Every question for one description, in one request.

    Jev scores each question on its own against the state, so batching changes
    no answer and pays for the description once, rather than once per rule.
    """
    questions = {name: {"type": "noul", "instructions": text} for name, text in JUDGMENT_RULES.items()}

    for index, bullet in enumerate(bullets):
        questions[f"bullet_{index}"] = {
            "type": "choice",
            "instructions": {
                "bullet": bullet,
                "question": "A CodeCrafters stage description ends with a Notes section. What does this `bullet` do for the learner?",
            },
            "criteria": BULLET_KINDS,
        }

    return questions


def ask_jev(api_key, state, questions):
    payload = {"model": MODEL, "state": state, "questions": questions}
    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        sys.exit(f"HTTP {error.code} from {ENDPOINT}: {error.read().decode()[:500]}")


def describe(description):
    return {
        "what_this_is": "A CodeCrafters stage description. Learners read it, then implement the stage in their own language.",
        "stage_description": description,
    }


# --- putting the two together -------------------------------------------------

def review(api_key, path):
    text = open(path).read()
    bullets = notes_bullets(text)
    result = ask_jev(api_key, describe(text), build_questions(bullets))
    answers = result["answers"]

    findings, uncertain = [], []

    for rule, detail in parser_findings(text).items():
        findings.append(f"{rule}: {detail}")

    for rule in JUDGMENT_RULES:
        probability = answers[rule]["noul"]

        if probability < LOW:
            findings.append(f"{rule}: jev {probability:.2f}")
        elif probability < HIGH:
            uncertain.append(f"{rule}: jev {probability:.2f}, too close to call")

    # Jev labels each bullet; the rule over those labels is code's.
    labels = [answers[f"bullet_{index}"] for index in range(len(bullets))]

    if bullets and not any(label["choice"] in LOAD_BEARING for label in labels):
        kinds = ", ".join(label["choice"] for label in labels)
        findings.append(f"notes_fences_scope: nothing load-bearing in Notes ({kinds})")

    for bullet, label in zip(bullets, labels):
        if label["confidence"] < MIN_CONFIDENCE:
            uncertain.append(f"notes bullet read as {label['choice']} at confidence {label['confidence']:.2f}: {bullet[:60]}")

    return findings, uncertain, result.get("usage", {})


def main(paths):
    api_key = os.environ.get("TYPESAFE_API_KEY") or os.environ.get("JEV_API_KEY")

    if not api_key:
        sys.exit("TYPESAFE_API_KEY is not set")

    total_cost, total_findings = 0.0, 0

    for path in paths:
        findings, uncertain, usage = review(api_key, path)
        total_findings += len(findings)
        total_cost += usage.get("input_tokens", 0) / 1e6 * PRICE[0] + usage.get("output_tokens", 0) / 1e6 * PRICE[1]

        print(f"\n{os.path.basename(path)}" + ("" if findings or uncertain else "  clean"))

        for finding in findings:
            print(f"  FAIL  {finding}")

        for question in uncertain:
            print(f"  ?     {question}")

    print(f"\n{len(paths)} description(s), {total_findings} finding(s), ${total_cost:.5f}")


if __name__ == "__main__":
    main(sys.argv[1:] or sys.exit(__doc__))
