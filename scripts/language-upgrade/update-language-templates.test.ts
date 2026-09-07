import { describe, expect, test } from "bun:test";

import { bumpBaseImage } from "./update-language-templates";

function dockerfile(fromLine: string): string {
  return ["# syntax=docker/dockerfile:1.7-labs", fromLine, "", "WORKDIR /app", ""].join("\n");
}

function bumpedTag(fromLine: string, fromVersion: string, toVersion: string): string {
  return bumpBaseImage(dockerfile(fromLine), fromVersion, toVersion).after;
}

describe("bumpBaseImage", () => {
  // Every FROM line below is copied from a real language-templates Dockerfile.
  test.each([
    ["FROM golang:1.26-alpine", "1.26", "1.27", "1.27-alpine"],
    ["FROM rust:1.96-trixie", "1.96", "1.98", "1.98-trixie"],
    ["FROM haskell:9.10-bookworm", "9.10", "9.12", "9.12-bookworm"],
    ["FROM oven/bun:1.3-alpine", "1.3", "1.4", "1.4-alpine"],
    ["FROM swift:6.0-focal", "6.0", "6.2", "6.2-focal"],
    ["FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine", "10.0", "11.0", "11.0-alpine"],
  ])("%s bumps cleanly", (fromLine, from, to, expected) => {
    expect(bumpedTag(fromLine, from, to)).toEqual(expected);
  });

  test("only touches the version token, not a lookalike elsewhere in the tag", () => {
    // "3.23" is Alpine's version and must survive untouched.
    expect(bumpedTag("FROM node:25-alpine3.23", "25", "26")).toEqual("26-alpine3.23");
    expect(bumpedTag("FROM ruby:4.0-alpine3.23", "4.0", "4.1")).toEqual("4.1-alpine3.23");
    expect(bumpedTag("FROM php:8.5-cli-alpine3.22", "8.5", "8.6")).toEqual("8.6-cli-alpine3.22");
  });

  test("picks the right token when the tag leads with an unrelated version", () => {
    // Maven's own version comes first, the JDK version second.
    expect(bumpedTag("FROM maven:3.9.16-eclipse-temurin-26-alpine", "26", "27")).toEqual("3.9.16-eclipse-temurin-27-alpine");
    expect(bumpedTag("FROM ocaml/opam:debian-13-ocaml-5.5", "5.5", "5.6")).toEqual("debian-13-ocaml-5.6");
  });

  test("handles a version embedded in a word", () => {
    expect(bumpedTag("FROM astral/uv:python3.14-alpine", "3.14", "3.15")).toEqual("python3.15-alpine");
  });

  // The case that motivated matching whole tokens: a substring replace here
  // yields "elixir:1.20.5-alpine", inventing a patch release.
  test("refuses when the tag is more precise than the version being bumped", () => {
    expect(() => bumpedTag("FROM elixir:1.19.5-alpine", "1.19", "1.20")).toThrow(/no version token equal to "1.19"/);
    expect(() => bumpedTag("FROM dart:3.11.0", "3.11", "3.12")).toThrow(/no version token equal to "3.11"/);
    expect(() => bumpedTag("FROM ghcr.io/gleam-lang/gleam:v1.16.0-erlang-alpine", "1.16", "1.17")).toThrow(/no version token equal/);
  });

  test("refuses when the base image tracks something unrelated", () => {
    expect(() => bumpedTag("FROM gradle:jdk24-alpine", "2.3", "2.4")).toThrow(/no version token equal to "2.3"/);
    expect(() => bumpedTag("FROM gcc:15.2.0-trixie", "23", "24")).toThrow(/no version token equal to "23"/);
    expect(() => bumpedTag("FROM silkeh/clang:21-trixie", "2026.4", "2026.9")).toThrow(/no version token equal/);
  });

  test("refuses an untagged image", () => {
    expect(() => bumpedTag("FROM debian:trixie", "0.16", "0.17")).toThrow(/no version token equal to "0.16" \(found: none\)/);
  });

  test("refuses when the version appears more than once", () => {
    expect(() => bumpedTag("FROM example/thing:1.2-base1.2", "1.2", "1.3")).toThrow(/more than one place/);
  });

  test("reports the versions it did find, to make the refusal actionable", () => {
    expect(() => bumpedTag("FROM elixir:1.19.5-alpine", "1.19", "1.20")).toThrow(/found: 1\.19\.5/);
  });

  test("leaves the rest of the Dockerfile untouched", () => {
    const result = bumpBaseImage(dockerfile("FROM golang:1.26-alpine"), "1.26", "1.27");

    expect(result.contents).toContain("# syntax=docker/dockerfile:1.7-labs");
    expect(result.contents).toContain("FROM golang:1.27-alpine");
    expect(result.contents).toContain("WORKDIR /app");
    expect(result.contents).not.toContain("1.26");
  });
});
