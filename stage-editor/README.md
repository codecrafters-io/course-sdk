# Stage editor

A local web page for editing a challenge's stage descriptions and `course-definition.yml`, with each stage's tests shown alongside. Edits auto-save to the course repo. Review and commit them yourself.

```sh
python3 stage-editor/server.py tokenizer   # then open http://127.0.0.1:8765
```

It looks for the challenge repos next to `course-sdk`:

- `../build-your-own-<slug>` (required)
- `../<slug>-tester` (optional; without it the Tests pane links to GitHub)

If a repo is missing, it prints the GitHub link and a `git clone` command. Override the locations with `--repos-dir`, `--course` or `--tester`, and the port with `--port`.

Standard-library Python only, and it listens on 127.0.0.1 only.
