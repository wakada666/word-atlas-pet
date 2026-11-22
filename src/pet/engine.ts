import { dayKey } from "../lib/day";
import { DEFAULT_SKIN, isSkin } from "./skins";

/** 每天 10 个新词就把宠物喂饱。 */
export const DAILY_TARGET = 10;
const NEW_SATIETY = 10;
const REVIEW_SATIETY = 1;
const NEW_XP = 12;
const REVIEW_XP = 4;
const DECAY_PER_DAY = 12;
const MAX_SATIETY = 100;

export type FeedKind = "new" | "review";
export type PetMood = "happy" | "ok" | "hungry";

export interface PetState {
  version: 1;
  name: string;
  born: number;
  /** 累计经验，等级由它换算，避免两个字段互相打架。 */
  xp: number;
  level: number;
  /** 0–100 饱腹度。 */
  satiety: number;
  /** 每天喂了几个新词，用于「今日 x/10」。 */
  fed: Record<string, number>;
  /** 上次结算饥饿衰减的日期。 */
  lastTick: string;
  totalWords: number;
  form: string;
  /** 当前外观，只影响形象，不影响数值。 */
  skin: string;
  lastFed: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function xpNeeded(level: number) {
  return 60 + (level - 1) * 30;
}

/** 由累计经验换算等级与当前等级进度。 */
export function levelInfo(xp: number) {
  let level = 1;
  let left = Math.max(0, Math.floor(xp));
  while (left >= xpNeeded(level)) {
    left -= xpNeeded(level);
    level++;
  }
  return { level, into: left, need: xpNeeded(level) };
}

export function createPet(now = Date.now()): PetState {
  return {
    version: 1,
    name: "小光",
    born: now,
    xp: 0,
    level: 1,
    satiety: 60,
    fed: {},
    lastTick: dayKey(new Date(now)),
    totalWords: 0,
    form: "puppy",
    skin: DEFAULT_SKIN,
    lastFed: 0,
  };
}

/** 离线期间按天衰减饱腹度；跨天或首次加载时调用。 */
export function tickPet(pet: PetState, now = Date.now()): PetState {
  const today = dayKey(new Date(now));
  if (pet.lastTick === today) return pet;
  const last = Date.parse(`${pet.lastTick}T00:00:00`);
  const cur = Date.parse(`${today}T00:00:00`);
  const days = Number.isFinite(last) ? Math.max(1, Math.round((cur - last) / 86_400_000)) : 1;
  const satiety = Math.max(0, pet.satiety - days * DECAY_PER_DAY);
  const fed = pruneFed(pet.fed, cur);
  return { ...pet, satiety, fed, lastTick: today };
}

function pruneFed(fed: Record<string, number>, now: number) {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(fed)) {
    const t = Date.parse(`${k}T00:00:00`);
    if (Number.isFinite(t) && (now - t) / 86_400_000 <= 30) out[k] = v;
  }
  return out;
}

export function fedToday(pet: PetState, now = Date.now()) {
  return pet.fed[dayKey(new Date(now))] ?? 0;
}

export function petMood(satiety: number): PetMood {
  if (satiety >= 60) return "happy";
  if (satiety >= 30) return "ok";
  return "hungry";
}

/** 等级越高体型越大，上限约 1.25 倍。 */
export function sizeScale(level: number) {
  return Math.min(1.25, 0.8 + Math.max(0, level - 1) * 0.035);
}

export interface FeedResult {
  pet: PetState;
  leveled: boolean;
  gainedXp: number;
}

/** 学完一个词后喂养：新词加饱腹与经验，复习只给少量。 */
export function feedPet(pet: PetState, kind: FeedKind, now = Date.now()): FeedResult {
  const base = tickPet(pet, now);
  const today = dayKey(new Date(now));
  const gainedXp = kind === "new" ? NEW_XP : REVIEW_XP;
  const xp = base.xp + gainedXp;
  const { level } = levelInfo(xp);
  const fed = kind === "new" ? { ...base.fed, [today]: (base.fed[today] ?? 0) + 1 } : base.fed;
  return {
    pet: {
      ...base,
      xp,
      level,
      satiety: clamp(base.satiety + (kind === "new" ? NEW_SATIETY : REVIEW_SATIETY), 0, MAX_SATIETY),
      fed,
      totalWords: base.totalWords + 1,
      lastFed: now,
    },
    leveled: level > base.level,
    gainedXp,
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
const num = (v: unknown, lo = -Infinity, hi = Infinity): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** 本地存档不可信：只保留合理字段，坏数据回落到新宠物。 */
export function sanitizePet(v: unknown, now = Date.now()): PetState {
  const base = createPet(now);
  if (!isObj(v) || v.version !== 1) return tickPet(base, now);
  const xp = num(v.xp, 0, 100_000_000) ? Math.floor(v.xp) : 0;
  const fed: Record<string, number> = {};
  if (isObj(v.fed))
    for (const [k, n] of Object.entries(v.fed))
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && num(n, 0, 1000)) fed[k] = Math.floor(n);
  const pet: PetState = {
    version: 1,
    name: typeof v.name === "string" && v.name.trim() ? v.name.slice(0, 12) : base.name,
    born: num(v.born, 0) ? v.born : base.born,
    xp,
    level: levelInfo(xp).level,
    satiety: num(v.satiety, 0, MAX_SATIETY) ? v.satiety : base.satiety,
    fed,
    lastTick: typeof v.lastTick === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.lastTick) ? v.lastTick : base.lastTick,
    totalWords: num(v.totalWords, 0) ? Math.floor(v.totalWords) : 0,
    form: typeof v.form === "string" ? v.form : "puppy",
    skin: typeof v.skin === "string" && isSkin(v.skin) ? v.skin : DEFAULT_SKIN,
    lastFed: num(v.lastFed, 0) ? v.lastFed : 0,
  };
  return tickPet(pet, now);
}
