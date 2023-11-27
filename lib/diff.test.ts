import { expect, test } from "bun:test";
import Diff from "./diff";

test("fromContents", () => {
  expect(() => Diff.fromContents("foo", "foo")).toThrow("No diff output");
  expect(Diff.fromContents("foo\n", "bar\n")).toBeTruthy();
});