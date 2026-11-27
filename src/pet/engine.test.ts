import assert from "node:assert/strict";
import { test } from "node:test";
import { createPet, DAILY_TARGET, fedToday, feedPet, levelInfo, sanitizePet, studyPet, tickPet } from "./engine";

const at = (day: number, hour = 12) => new Date(2026, 10, day, hour).getTime();

test("经验换算等级与当前进度", () => {
  assert.deepEqual(levelInfo(0), { level: 1, into: 0, need: 60 });
  assert.deepEqual(levelInfo(60), { level: 2, into: 0, need: 70 });
  assert.deepEqual(levelInfo(129), { level: 2, into: 69, need: 70 });
  assert.deepEqual(levelInfo(130), { level: 3, into: 0, need: 80 });
});

test("新词喂养：只加饱腹与当日计数，不给经验", () => {
  const pet = createPet(at(22));
  const r = feedPet(pet, "new", at(22, 13));
  assert.equal(r.pet.satiety, 70);
  assert.equal(r.pet.xp, 0);
  assert.equal(r.pet.totalWords, 1);
  assert.equal(fedToday(r.pet, at(22)), 1);
  assert.equal(r.leveled, false);
});

test("学习 10 个新词累计 120 经验并升到 2 级，但不喂食", () => {
  let pet = createPet(at(22));
  for (let i = 0; i < DAILY_TARGET; i++) pet = studyPet(pet, "new", at(22, 13)).pet;
  assert.equal(pet.xp, 120);
  assert.equal(pet.level, 2);
  assert.equal(pet.satiety, 60);
  assert.equal(fedToday(pet, at(22)), 0);
});

test("一天测试成功 10 个新词会喂饱", () => {
  let pet = createPet(at(22));
  for (let i = 0; i < DAILY_TARGET; i++) pet = feedPet(pet, "new", at(22, 13)).pet;
  assert.equal(pet.satiety, 100);
  assert.equal(fedToday(pet, at(22)), DAILY_TARGET);
  assert.equal(pet.totalWords, DAILY_TARGET);
});

test("复习：只喂一点饱腹，经验由学习结算", () => {
  const pet = createPet(at(22));
  const r = feedPet(pet, "review", at(22, 13));
  assert.equal(r.pet.satiety, 61);
  assert.equal(r.pet.xp, 0);
  assert.equal(fedToday(r.pet, at(22)), 0);
});

test("跨天按 12 点/天衰减，最低为 0", () => {
  const pet = createPet(at(22));
  const twoDays = tickPet(pet, at(24));
  assert.equal(twoDays.satiety, 36);
  assert.equal(twoDays.lastTick, "2026-11-24");
  const longGap = tickPet(pet, at(30));
  assert.equal(longGap.satiety, 0);
});

test("当日计数按日期分开", () => {
  let pet = createPet(at(22));
  pet = feedPet(pet, "new", at(22)).pet;
  pet = feedPet(pet, "new", at(23)).pet;
  assert.equal(fedToday(pet, at(22)), 1);
  assert.equal(fedToday(pet, at(23)), 1);
});

test("存档清洗：坏字段回落到默认，等级由经验重算", () => {
  const fallback = sanitizePet(null, at(22));
  assert.equal(fallback.level, 1);
  assert.equal(fallback.name, "小光");

  const pet = sanitizePet(
    { version: 1, xp: 150, level: 99, satiety: 500, fed: { "2026-11-22": 3, bad: 2 }, lastTick: "2026-11-22", totalWords: 3, form: "puppy" },
    at(22),
  );
  assert.equal(pet.level, 3);
  assert.equal(pet.satiety, 60);
  assert.deepEqual(pet.fed, { "2026-11-22": 3 });
  assert.equal(pet.skin, "golden");
  assert.equal(sanitizePet({ version: 1, skin: "husky" }, at(22)).skin, "husky");
  assert.equal(sanitizePet({ version: 1, skin: "dragon" }, at(22)).skin, "golden");
});
