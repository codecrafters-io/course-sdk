"""Does Jev separate a good stage description from a broken one?

Running the reviewer over descriptions we believe are clean measures false
positives and nothing else — a model that answered 0.7 to everything would look
the same. This takes one description that passes, breaks exactly one thing in
each copy, and asks every question of every copy.

A rule earns its place by dropping sharply on the copy that breaks it while
holding steady on the others. A rule that stays flat everywhere carries no
information, whatever its wording.

Run it before trusting a new rule, and after any model change.

    TYPESAFE_API_KEY=apikey_... python3 jev_discriminate.py
"""

import os
import sys

from jev_review import JUDGMENT_RULES, ask_jev, build_questions, describe

BASE_PATH = "../../../build-your-own-claude-code/stage_descriptions/skills-02-jd8.md"

# Each variant breaks the rule it's named for, and only that rule.
def variants(base):
    notes_start = base.index("### Notes")

    return {
        "base": base,
        "hook_one_sentence": base.replace(
            "In this stage, you'll add support for invoking a skill by name.",
            "In this stage, you'll take your agent to the next level. Skills are one of "
            "the most powerful features available. Let's dive in and see what they can do.",
        ),
        # Strips the body's worked example while leaving Tests intact, so the two
        # overlapping rules can be told apart.
        "complete_example": base[: base.index("### Resolving and loading")]
        + "### Resolving and loading\n\nYour program should find the skill directory that "
        "matches the name, read everything after the closing delimiter, and send that to "
        "the model in place of what the user typed. The other skills stay at level 1.\n\n"
        + base[base.index("### Tests") :],
        "tests_section": base[:base.index("### Tests")] + base[notes_start:],
        "no_artifacts": base[:notes_start]
        + "### Notes\n\n<!-- TODO: decide whether to mention plugins here -->\n\n"
        + "- Load only the invoked skill's body.\n\n### Notes\n\n",
    }


def main():
    api_key = os.environ.get("TYPESAFE_API_KEY") or os.environ.get("JEV_API_KEY")

    if not api_key:
        sys.exit("TYPESAFE_API_KEY is not set")

    base = open(os.path.join(os.path.dirname(__file__), BASE_PATH)).read()
    scores = {
        name: ask_jev(api_key, describe(text), build_questions([]))["answers"]
        for name, text in variants(base).items()
    }

    columns = list(scores)
    print(f"{'rule':<24}" + "".join(f"{name[:12]:>13}" for name in columns))

    for rule in JUDGMENT_RULES:
        row = f"{rule:<24}"

        for variant in columns:
            probability = scores[variant][rule]["noul"]
            # The cell where the break and the rule line up is the one that must move.
            marker = "*" if variant == rule else " "
            row += f"{probability:>12.2f}{marker}"

        print(row)

    print("\n* = this copy breaks this rule; that cell should be far below the base column")


if __name__ == "__main__":
    main()
