/* global describe, test, expect */
import { computeColorIntensities, parseTextareaMeans } from "../intensity";

describe("parseTextareaMeans", () => {
  test("parses simple gray float", () => {
    const result = parseTextareaMeans("0.42");
    expect(result.gray).toBeCloseTo(0.42);
    expect(result.r).toBeNull();
    expect(result.g).toBeNull();
    expect(result.b).toBeNull();
  });

  test("parses labeled channels string", () => {
    const result = parseTextareaMeans("gray=0.0; r=10.5; g=20; b=30.25");
    expect(result.gray).toBeCloseTo(0.0);
    expect(result.r).toBeCloseTo(10.5);
    expect(result.g).toBeCloseTo(20);
    expect(result.b).toBeCloseTo(30.25);
  });

  test("handles array input", () => {
    const result = parseTextareaMeans(["gray=1; r=2; g=3; b=4"]);
    expect(result.gray).toBeCloseTo(1);
    expect(result.r).toBeCloseTo(2);
    expect(result.g).toBeCloseTo(3);
    expect(result.b).toBeCloseTo(4);
  });

  test("parses RGB-only labeled channels string", () => {
    const result = parseTextareaMeans("r=10; g=20.5; b=30");
    expect(result.gray).toBeNull();
    expect(result.r).toBeCloseTo(10);
    expect(result.g).toBeCloseTo(20.5);
    expect(result.b).toBeCloseTo(30);
  });

  test("returns nulls on malformed input", () => {
    const result = parseTextareaMeans("not-a-number");
    expect(result.gray).toBeNull();
    expect(result.r).toBeNull();
    expect(result.g).toBeNull();
    expect(result.b).toBeNull();
  });
});

describe("computeColorIntensities", () => {
  test("computes intensities from hex color", () => {
    const { gray, r, g, b } = computeColorIntensities("#0000ff");
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(255);
    expect(gray).toBeGreaterThan(0);
  });

  test("computes intensities from rgb string", () => {
    const { gray, r, g, b } = computeColorIntensities("rgb(255, 0, 0)");
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
    expect(gray).toBeGreaterThan(0);
  });
});


