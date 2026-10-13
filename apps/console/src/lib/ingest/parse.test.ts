import { describe, it, expect } from "vitest";
import { tokenizeCsv, parseCsv } from "./parse";

describe("tokenizeCsv", () => {
  it("parses quoted fields with commas and escaped quotes", () => {
    const grid = tokenizeCsv('a,b\n"x,1","he said ""hi"""\n');
    expect(grid).toEqual([
      ["a", "b"],
      ["x,1", 'he said "hi"'],
    ]);
  });

  it("handles a missing trailing newline and CRLF", () => {
    expect(tokenizeCsv("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsv", () => {
  it("maps flexible headers and fills optional columns", () => {
    const rows = parseCsv(
      "Part No,Brand,Category,Description,Make,Model\nABC-1,Toyota,brakes,Pad,Toyota,Hilux\n",
    );
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({
      partNumber: "ABC-1",
      brand: "Toyota",
      category: "brakes",
      description: "Pad",
      make: "Toyota",
      model: "Hilux",
      position: "",
      confidence: "",
    });
  });

  it("ignores unknown columns and returns [] for a header-only file", () => {
    expect(parseCsv("part_number,brand\n").length).toBe(0);
    const rows = parseCsv("sku,unknown_col,brand\nX1,junk,Ford\n");
    expect(rows[0]).toMatchObject({ partNumber: "X1", brand: "Ford" });
  });
});
