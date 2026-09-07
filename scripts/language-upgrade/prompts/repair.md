You are fixing a CodeCrafters course repository after an automated language
version upgrade broke its tests.

## What happened

`{{COURSE}}` was upgraded from {{LANGUAGE}} {{FROM_VERSION}} to {{TO_VERSION}}.
The upgrade replaced the Dockerfile and refreshed the starter template from
`language-templates`, then re-applied the version pins.

These tests passed before the upgrade and fail after it:

{{FAILURES}}

{{PRE_EXISTING_SECTION}}

## Start from the migrated template

{{TEMPLATES_REFERENCE}}

## What to do

Work in `{{COURSE_DIR}}`. Find why the new {{LANGUAGE}} version broke the
listed tests and fix the source of the breakage. Usually this is a removed or
renamed standard library API, a stricter compiler default, or a flag the
runtime no longer accepts.

Verify with:

```sh
course-sdk test {{LANGUAGE}}
```

## Rules

Do not undo the upgrade. Changing the version back, editing
`dockerfiles/{{LANGUAGE}}-{{TO_VERSION}}.Dockerfile`, or reverting a version pin
defeats the point of the run.

Do not edit anything under `compiled_starters/` or `solutions/*/code/`. Those
are generated. Edit `starter_templates/{{LANGUAGE}}/` and let
`course-sdk compile {{LANGUAGE}}` regenerate them.

Stay inside {{LANGUAGE}}. Other languages in this repo are upgraded separately
and must not appear in the diff.

Keep the change as small as the breakage requires. This lands as a pull request
a human reviews, and unrelated edits are what makes that review expensive.

If the fix needs a judgement call a reviewer should make — dropping a feature,
changing observable behaviour of the starter, or rewriting a stage's solution
approach — stop and explain the options instead of picking one.
