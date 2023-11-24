import { expect, test } from "bun:test";

test("", () => {
  expect(2 + 2).toBe(4);
});

import Uncommenter from "./uncommenter";

const UNCOMMENT_PATTERN = /Uncomment this/;

const SAMPLE_PY_COMMENTED = `
abcd = true

# Uncomment this to pass the first stage
#
# # This is an assignment
# a = b
#
# if True:
#     pass
#
# blah

yay = true
`;

const SAMPLE_PY_UNCOMMENTED = `
abcd = true

# This is an assignment
a = b

if True:
    pass

blah

yay = true
`;

const SAMPLE_GO_COMMENTED = `
func main() {
  // Uncomment this to pass the first stage
  //
  // // This is an assignment
  // a := 1
  //
  // fmt.Println('hey')

  a := 2
}
`;

const SAMPLE_GO_UNCOMMENTED = `
func main() {
  // This is an assignment
  a := 1

  fmt.Println('hey')

  a := 2
}
`;

const SAMPLE_HASKELL_COMMENTD = `
main = do
 -- Uncomment this to pass the first stage
 -- a <- readLine
 -- b <- readLine
 -- -- Nested Comment
 -- return (a + b)
`;

const SAMPLE_HASKELL_UNCOMMENTD = `
main = do
 a <- readLine
 b <- readLine
 -- Nested Comment
 return (a + b)
`;

const SAMPLE_JAVA_COMMENTED = `
public static void main(String[] args) {
  // Uncomment this to pass the first stage
  //
  // // This is an assignment
  // int a = 1;
  //
  // System.out.println('Hey');

  int b = 2;
}
`;

const SAMPLE_JAVA_UNCOMMENTED = `
public static void main(String[] args) {
  // This is an assignment
  int a = 1;

  System.out.println('Hey');

  int b = 2;
}
`;

const SAMPLE_KOTLIN_COMMENTED = `
fun main(args: Array<String>) {
  // Uncomment this to pass the first stage
  //
  // // This is an assignment
  // val a = 1;
  //
  // println('Hey');

  val b = 2;
}
`;

const SAMPLE_KOTLIN_UNCOMMENTED = `
fun main(args: Array<String>) {
  // This is an assignment
  val a = 1;

  println('Hey');

  val b = 2;
}
`;

const SAMPLE_PHP_COMMENTED = `
<?php
// Uncomment this to pass the first stage.
// $a = 1;
// $b = 1;

// echo $a + $b;
?>
`;

const SAMPLE_PHP_UNCOMMENTED = `
<?php
$a = 1;
$b = 1;

// echo $a + $b;
?>
`;

const SAMPLE_JAVASCRIPT_COMMENTED = `
// Uncomment this to pass the first stage
// var a = 1;
// var b = 2;
// console.log(a + b);
`;

const SAMPLE_JAVASCRIPT_UNCOMMENTED = `
var a = 1;
var b = 2;
console.log(a + b);
`;

const SAMPLE_CSHARP_COMMENTED = `
// Uncomment this to pass the first stage
// var a = 1;
// var b = 2;
// Console.WriteLine(a + b);
`;

const SAMPLE_CSHARP_UNCOMMENTED = `
var a = 1;
var b = 2;
Console.WriteLine(a + b);
`;

const SAMPLE_TWO_MARKERS_COMMENTED = `
a = b

# Uncomment this to pass the first stage
#
# # First uncommented block
# b = c

# Uncomment this to pass the first stage
#
# # Second uncommented block
# c = d
`;

const SAMPLE_TWO_MARKERS_UNCOMMENTED = `
a = b

# First uncommented block
b = c

# Second uncommented block
c = d
`;

test("python", () => {
  const actual = new Uncommenter(
    "python",
    SAMPLE_PY_COMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_PY_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("noop if no uncomment marker", () => {
  const actual = new Uncommenter("python", SAMPLE_PY_COMMENTED, /not found/)
    .uncommented;
  const expected = SAMPLE_PY_COMMENTED;
  expect(actual).toBe(expected);
});

test("twice python", () => {
  const actual = new Uncommenter(
    "python",
    SAMPLE_PY_UNCOMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_PY_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("go", () => {
  const actual = new Uncommenter("go", SAMPLE_GO_COMMENTED, UNCOMMENT_PATTERN)
    .uncommented;
  const expected = SAMPLE_GO_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("twice go", () => {
  const actual = new Uncommenter("go", SAMPLE_GO_UNCOMMENTED, UNCOMMENT_PATTERN)
    .uncommented;
  const expected = SAMPLE_GO_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("haskell", () => {
  const actual = new Uncommenter(
    "haskell",
    SAMPLE_HASKELL_COMMENTD,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_HASKELL_UNCOMMENTD;
  expect(actual).toBe(expected);
});

test("twice haskell", () => {
  const actual = new Uncommenter(
    "haskell",
    SAMPLE_HASKELL_UNCOMMENTD,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_HASKELL_UNCOMMENTD;
  expect(actual).toBe(expected);
});

test("java", () => {
  const actual = new Uncommenter(
    "java",
    SAMPLE_JAVA_COMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_JAVA_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("twice java", () => {
  const actual = new Uncommenter(
    "java",
    SAMPLE_JAVA_UNCOMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_JAVA_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("kotlin", () => {
  const actual = new Uncommenter(
    "kotlin",
    SAMPLE_KOTLIN_COMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_KOTLIN_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("twice kotlin", () => {
  const actual = new Uncommenter(
    "kotlin",
    SAMPLE_KOTLIN_UNCOMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_KOTLIN_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("php", () => {
  const actual = new Uncommenter("php", SAMPLE_PHP_COMMENTED, UNCOMMENT_PATTERN)
    .uncommented;
  const expected = SAMPLE_PHP_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("twice php", () => {
  const actual = new Uncommenter(
    "php",
    SAMPLE_PHP_UNCOMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_PHP_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("javascript", () => {
  const actual = new Uncommenter(
    "javascript",
    SAMPLE_JAVASCRIPT_COMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_JAVASCRIPT_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("twice javascript", () => {
  const actual = new Uncommenter(
    "javascript",
    SAMPLE_JAVASCRIPT_UNCOMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_JAVASCRIPT_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("csharp", () => {
  const actual = new Uncommenter(
    "csharp",
    SAMPLE_CSHARP_COMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_CSHARP_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("twice csharp", () => {
  const actual = new Uncommenter(
    "csharp",
    SAMPLE_CSHARP_UNCOMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_CSHARP_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("two markers", () => {
  const actual = new Uncommenter(
    "python",
    SAMPLE_TWO_MARKERS_COMMENTED,
    UNCOMMENT_PATTERN
  ).uncommented;
  const expected = SAMPLE_TWO_MARKERS_UNCOMMENTED;
  expect(actual).toBe(expected);
});

test("uncommentedBlocksWithMarker", () => {
  const actual = new Uncommenter(
    "python",
    `
    # Uncomment this to pass the first stage
    # a = b
    `,
    UNCOMMENT_PATTERN
  ).uncommentedBlocksWithMarker;

  const expected = `# Uncomment this to pass the first stage
a = b`;

  expect(actual[0]).toBe(expected);
});
