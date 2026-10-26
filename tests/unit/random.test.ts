import { test } from "node:test";
import assert from "node:assert/strict";
import { selectRandomImage } from "../../src/lib/random.ts";
test("empty and single collections", () => {
  assert.equal(selectRandomImage([], null), null);
  assert.equal(selectRandomImage(["a"], "a"), "a");
});
test("every candidate bucket is reachable without choosing current", () => {
  assert.equal(
    selectRandomImage(["a", "b", "c"], "a", () => 0),
    "b",
  );
  assert.equal(
    selectRandomImage(["a", "b", "c"], "a", () => 0.99999),
    "c",
  );
  assert.equal(
    selectRandomImage(["a", "b"], "missing", () => 0),
    "a",
  );
  assert.equal(
    selectRandomImage(["a", "b"], "missing", () => 0.99),
    "b",
  );
});
test("two-image collection alternates for 100 selections without mutation", () => {
  const ids = ["a", "b"];
  let current: string | null = "a";
  for (let i = 0; i < 100; i++) {
    const next = selectRandomImage(ids, current);
    assert.notEqual(next, current);
    current = next;
  }
  assert.deepEqual(ids, ["a", "b"]);
});

test("many-image and favorite subsets never repeat or escape their eligible set", () => {
  for (const ids of [
    Object.freeze(["a", "b", "c", "d", "e"]),
    Object.freeze(["b", "d", "e"]),
  ]) {
    let current: string | null = ids[0];
    for (let i = 0; i < 100; i++) {
      const next = selectRandomImage(
        ids,
        current,
        () => ((i * 37) % 100) / 100,
      );
      assert.ok(ids.includes(next!));
      assert.notEqual(next, current);
      current = next;
    }
  }
});
test("every alternative in a larger set has a matching uniform sampling bucket", () => {
  const ids = Object.freeze(["current", "a", "b", "c", "d", "e"]);
  for (let i = 0; i < 5; i++)
    assert.equal(
      selectRandomImage(ids, "current", () => (i + 0.5) / 5),
      ids[i + 1],
    );
});
