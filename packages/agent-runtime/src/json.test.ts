import { describe, it, expect } from "vitest";
import { extractJson } from "./json";

describe("extractJson", () => {
  it("parses a bare JSON object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON inside a ```json fence", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("parses JSON inside a bare fence", () => {
    expect(extractJson("```\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("recovers a JSON object wrapped in prose", () => {
    expect(extractJson('Sure! Here is the result: {"a":1} — hope that helps')).toEqual({
      a: 1,
    });
  });

  it("throws when there is no JSON", () => {
    expect(() => extractJson("no json here")).toThrow(SyntaxError);
  });
});
