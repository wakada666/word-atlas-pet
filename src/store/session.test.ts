import assert from "node:assert/strict";
import { test } from "node:test";
import type { Atlas, WordRef } from "../atlas/types";
import { buildSession } from "./session";
import { defaultSettings, SESSION_VERSION, type Progress, type Settings } from "./store";

const words: WordRef[] = [1, 2, 3, 4, 5, 6].map((n, i) => ({
  id: `w${n}`,
  word: `word${n}`,
  zh: `词${n}`,
  ipa: "",
  cefr: 1,
  topic: 0,
  media: 0,
  order: i,
}));
const atlas = { words, byId: new Map(words.map((w) => [w.id, w])) } as unknown as Atlas;
const progress: Progress = {
  version: 2,
  datasetId: "test",
  cards: {},
  bookmarks: [],
  days: {},
  typing: [],
  session: null,
  mistakes: [],
};
const settings: Settings = { ...defaultSettings, dailyNew: 2, startLevel: 0 };

test("新词组：认识、回忆、拼写各一步，拼写是测试", () => {
  const s = buildSession(atlas, progress, settings);
  assert.equal(s.v, SESSION_VERSION);
  assert.deepEqual(s.newIds, ["w1", "w2"]);
  assert.deepEqual(s.steps.map((x) => x.kind), ["intro", "intro", s.steps[2].kind, s.steps[3].kind, "spell", "spell"]);
  const tests = s.steps.filter((x) => "test" in x && x.test);
  assert.equal(tests.length, 2);
  assert.ok(tests.every((x) => x.kind === "spell"));
});

test("复习步骤直接算测试", () => {
  const cards = { w1: { s: 3, due: Date.now() - 1000 } as never };
  const s = buildSession(atlas, { ...progress, cards }, { ...settings, dailyNew: 0 });
  assert.deepEqual(s.reviewIds, ["w1"]);
  assert.equal(s.steps.length, 1);
  assert.equal(s.steps[0].kind !== "intro" && s.steps[0].test, true);
});
