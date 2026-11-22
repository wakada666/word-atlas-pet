import assert from "node:assert/strict";
import { test } from "node:test";
import { createPet, DAILY_TARGET, fedToday, feedPet, levelInfo, sanitizePet, tickPet } from "./engine";

const at = (day: number, hour = 12) => new Date(2026, 10, day, hour).getTime();

test("经验换算等级与当前进度", () => {
  assert.deepEqual(levelInfo(0), { level: 1, into: 0, need: 60 });
  assert.deepEqual(levelInfo(60), { level: 2, into: 0, need: 90 });
  assert.deepEqual(levelInfo(149), { level: 2, into: 89, need: 90 });
  assert.deepEqual(levelInfo(150), { level: 3, into: 0, need: 120 });
});

test("新词喂养：加饱腹、经验与当日计数", () => {
  const pet = createPet(at(22));
  const r = feedPet(pet, "new", at(22, 13));
  assert.equal(r.pet.satiety, 70);
  assert.equal(r.pet.xp, 12);
  assert.equal(r.pet.totalWords, 1);
  assert.equal(fedToday(r.pet, at(22)), 1);
  assert.equal(r.leveled, false);
});

test("一天喂满 10 个新词会饱腹并升级", () => {
  let pet = createPet(at(22));
  let leveled = false;
  for (let i = 0; i < DAILY_TARGET; i++) {
    const r = feedPet(pet, "new", at(22, 13));
    pet = r.pet;
    leveled ||= r.leveled;
  }
  assert.equal(pet.satiety, 100);
  assert.equal(fedToday(pet, at(22)), DAILY_TARGET);
  assert.equal(pet.totalWords, DAILY_TARGET);
  assert.equal(pet.level, 2);
  assert.ok(leveled);
});

test("复习只给少量饱腹与经验", () => {
  const pet = createPet(at(22));
  const r = feedPet(pet, "review", at(22, 13));
  assert.equal(r.pet.satiety, 61);
  assert.equal(r.pet.xp, 4);
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
