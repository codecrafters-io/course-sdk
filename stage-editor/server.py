#!/usr/bin/env python3
"""Local editor for a CodeCrafters course's stage descriptions, with the tester's tests alongside.

Usage: python3 server.py <challenge-slug> [--repos-dir DIR] [--course DIR] [--tester DIR] [--port N]

By default the challenge repos are looked up next to course-sdk:
  <repos-dir>/build-your-own-<slug> and <repos-dir>/<slug>-tester
"""

import argparse
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent

parser = argparse.ArgumentParser(description="Edit a challenge's stage descriptions, with its tests alongside.")
parser.add_argument("slug", help='challenge slug, e.g. "tokenizer" or "redis"')
parser.add_argument("--repos-dir", default=str(HERE.parent.parent), help="directory holding the challenge repos (default: course-sdk's parent)")
parser.add_argument("--course", help="course repo path (default: <repos-dir>/build-your-own-<slug>)")
parser.add_argument("--tester", help="tester repo path (default: <repos-dir>/<slug>-tester)")
parser.add_argument("--port", type=int, default=8765)
args = parser.parse_args()

COURSE_REPO = f"build-your-own-{args.slug}"
TESTER_REPO = f"{args.slug}-tester"
COURSE_URL = f"https://github.com/codecrafters-io/{COURSE_REPO}"
TESTER_URL = f"https://github.com/codecrafters-io/{TESTER_REPO}"

COURSE = Path(args.course or Path(args.repos_dir) / COURSE_REPO).resolve()
TESTER = Path(args.tester or Path(args.repos_dir) / TESTER_REPO).resolve()


def clone_hint(path, repo, url):
    return f"  {url}\n  git clone git@github.com:codecrafters-io/{repo}.git {path}"


if not (COURSE / "course-definition.yml").is_file():
    sys.exit(f"Course repo not found at {COURSE}\nClone it from GitHub:\n{clone_hint(COURSE, COURSE_REPO, COURSE_URL)}")

TESTER_FOUND = (TESTER / "internal" / "tester_definition.go").is_file()
if not TESTER_FOUND:
    print(f"Tester repo not found at {TESTER}; the Tests pane will be empty.\nClone it from GitHub:\n{clone_hint(TESTER, TESTER_REPO, TESTER_URL)}\n")


def yaml_field(block, key, indent):
    match = re.search(rf'^{indent}{key}: "?(.*?)"?\s*$', block, re.M)
    return match.group(1) if match else None


def course_info():
    text = (COURSE / "course-definition.yml").read_text()
    marketing = text[text.index("\nmarketing:") :] if "\nmarketing:" in text else ""
    return {"name": yaml_field(text, "name", ""), "difficulty": yaml_field(marketing, "difficulty", "  ")}


def list_stages():
    text = (COURSE / "course-definition.yml").read_text()
    stages_block = text[text.index("\nstages:") :]
    stages = []
    for block in re.split(r"^  - (?=slug:)", stages_block, flags=re.M)[1:]:
        slug = yaml_field(block, "slug", "")
        files = sorted((COURSE / "stage_descriptions").glob(f"*-{slug}.md"))
        stages.append({
            "slug": slug,
            "name": yaml_field(block, "name", "    "),
            "difficulty": yaml_field(block, "difficulty", "    "),
            "file": files[0].name if files else None,
        })
    return stages


def find_stage(slug):
    return next((s for s in list_stages() if s["slug"] == slug), None)


def load_tests(slug):
    if not TESTER_FOUND:
        return {"missing": True, "path": str(TESTER), "repo": TESTER_REPO, "url": TESTER_URL}

    internal = TESTER / "internal"
    definition = (internal / "tester_definition.go").read_text()
    match = re.search(r'Slug:\s*"' + re.escape(slug) + r'",\s*TestFunc:\s*(\w+)', definition)
    if not match:
        return None

    test_func = match.group(1)
    for go_file in sorted(internal.glob("*.go")):
        source = go_file.read_text()
        if not re.search(r"^func " + test_func + r"\(", source, re.M):
            continue

        result = {"testFunc": test_func, "goFile": go_file.name, "goSource": source, "fixture": None}
        fixture = re.search(r'runFixture\(\w+,\s*"([\w-]+)"\)', source)
        if fixture:
            fixture_path = internal / "fixtures" / f"{fixture.group(1)}.json"
            raw = fixture_path.read_text()
            result["fixture"] = {"name": fixture_path.name, "raw": raw, "cases": json.loads(raw)}
        return result

    return {"testFunc": test_func, "goFile": None, "goSource": None, "fixture": None}


class Handler(BaseHTTPRequestHandler):
    def send(self, status, body, content_type="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            return self.send(200, (HERE / "index.html").read_bytes(), "text/html; charset=utf-8")
        if self.path == "/api/stages":
            tester = TESTER.name if TESTER_FOUND else f"{TESTER.name} (not found)"
            return self.send(200, {"course": COURSE.name, "tester": tester, "info": course_info(), "stages": list_stages()})
        if self.path == "/api/course":
            return self.send(200, {"file": "course-definition.yml", "content": (COURSE / "course-definition.yml").read_text()})

        match = re.fullmatch(r"/api/stages/([\w-]+)", self.path)
        if match:
            stage = find_stage(match.group(1))
            if not stage:
                return self.send(404, {"error": "unknown stage"})
            markdown = (COURSE / "stage_descriptions" / stage["file"]).read_text() if stage["file"] else ""
            return self.send(200, {**stage, "markdown": markdown, "tests": load_tests(stage["slug"])})

        self.send(404, {"error": "not found"})

    def do_PUT(self):
        if self.path == "/api/course":
            body = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()
            (COURSE / "course-definition.yml").write_text(json.loads(body)["content"])
            return self.send(200, {"ok": True})

        match = re.fullmatch(r"/api/stages/([\w-]+)", self.path)
        stage = find_stage(match.group(1)) if match else None
        if not stage or not stage["file"]:
            return self.send(404, {"error": "unknown stage"})

        body = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()
        markdown = json.loads(body)["markdown"]
        (COURSE / "stage_descriptions" / stage["file"]).write_text(markdown)
        self.send(200, {"ok": True})

    def log_message(self, format, *log_args):
        if self.command != "GET":
            super().log_message(format, *log_args)


if __name__ == "__main__":
    print(f"Course: {COURSE}\nTester: {TESTER}\nOpen http://127.0.0.1:{args.port}")
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
