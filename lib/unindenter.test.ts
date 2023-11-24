import { expect, test } from "bun:test";
import Unindenter from "./unindenter";

test("unindent", () => {
  const input = `
    This is a test
      This is a test
    This is a test
  `;
  const expected = `
This is a test
  This is a test
This is a test
`;
  const actual = Unindenter.unindent(input);
  expect(actual).toBe(expected);
});

