import { useSyncExternalStore } from "react";
import type { DatasetKey } from "../atlas/datasets";
import type { Accent } from "../atlas/types";
import { dayKey } from "../lib/day";
import { createPet, feedPet, sanitizePet, studyPet, tickPet, type FeedKind, type PetState } from "../pet/engine";
import { isSkin, isSkinUnlocked } from "../pet/skins";
import type { CardState, Grade } from "./srs";

export type QuizKind = "meaning" | "picture" | "listen" | "spell";
export type Step = { id: string; kind: "intro" } | { id: string; kind: QuizKind; retry?: boolean; options?: string[]; test?: boolean };

/** 会话结构版本：旧版本的步骤可能没有测试环节，直接作废重开。 */
export const SESSION_VERSION = 3;

export interface ActiveSession {
  v: number;
  id: string;
  started: number;
  steps: Step[];
  index: number;
  /** First-attempt grade per word; retries never change it. */
  graded: Record<string, Grade>;
  /** 测试步骤的首答结果，只有通过测试才喂食。 */
  tested?: Record<string, boolean>;
  newIds: string[];
  reviewIds: string[];
  /** Answer shown but not yet continued; survives reload without double counting. */
  pending?: { correct: boolean; value: string };
  finished?: number;
}

export interface DayStat {
  n: number; // new words met
  r: number; // graded reviews (first attempts)
  c: number; // correct first attempts
  t: number; // active seconds
}

export interface TypingRound {
  at: number;
  mode: "word" | "sentence" | "dictation";
  items: number;
  wpm: number;
  accuracy: number;
}

export interface Progress {
  version: 2;
  datasetId: string;
  cards: Record<string, CardState>;
  bookmarks: string[];
  days: Record<string, DayStat>;
  typing: TypingRound[];
  session: ActiveSession | null;
  /** Rolling list of recent mistakes, newest first. */
  mistakes: string[];
}

export interface Settings {
  accent: Accent;
  autoplay: boolean;
  dailyNew: number;
  retention: number;
  theme: "system" | "light" | "dark";
  sfx: boolean;
  spell: boolean;
  startLevel: number;
  onboarded: boolean;
  dataset: DatasetKey;
  ambience: "off" | "stars" | "rain" | "sea" | "forest" | "fire" | "voyage" | "cafe";
  ambienceVolume: number;
  splash: boolean;
}

export const defaultSettings: Settings = {
  accent: "uk",
  autoplay: true,
  dailyNew: 10,
  retention: 0.9,
  theme: "dark",
  sfx: true,
  spell: true,
  startLevel: 0,
  onboarded: false,
  dataset: "open",
  ambience: "stars",
  ambienceVolume: 0.45,
  splash: true,
};

export const emptyProgress = (datasetId: string): Progress => ({
  version: 2,
  datasetId,
  cards: {},
  bookmarks: [],
  days: {},
  typing: [],
  session: null,
  mistakes: [],
});

export { dayKey };

const DEFAULT_DATASET = "word-atlas-open";

/** 当前登录用户；所有进度与设置都按用户名分命名空间，互不可见。 */
let activeUser: string | null = null;

export const activeUsername = () => activeUser;

const settingsKey = (user: string | null) => (user ? `word-atlas:u:${user}:settings` : "word-atlas:settings");
const progressKey = (user: string | null, id: string) => (user ? `word-atlas:u:${user}:v2:${id}` : `word-atlas:v2:${id}`);
const petKey = (user: string | null) => (user ? `word-atlas:u:${user}:pet` : "word-atlas:pet");


function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- validation (backups and stored data are untrusted) ---------- */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, lo = -Infinity, hi = Infinity) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

function validCard(v: unknown): v is CardState {
  return (
    isObj(v) &&
    num(v.due, 0) &&
    num(v.s, 0) &&
    num(v.d, 0, 11) &&
    num(v.el, 0) &&
    num(v.sd, 0) &&
    num(v.ls, 0) &&
    num(v.reps, 0) &&
    num(v.lapses, 0) &&
    [0, 1, 2, 3].includes(v.st as number) &&
    (v.last === undefined || num(v.last, 0)) &&
    num(v.seen, 0)
  );
}

export function sanitizeProgress(v: unknown, datasetId: string): Progress {
  const out = emptyProgress(datasetId);
  if (!isObj(v) || v.version !== 2) return out;
  if (isObj(v.cards)) for (const [k, c] of Object.entries(v.cards)) if (validCard(c)) out.cards[k] = c;
  if (Array.isArray(v.bookmarks)) out.bookmarks = v.bookmarks.filter((x): x is string => typeof x === "string").slice(0, 20000);
  if (Array.isArray(v.mistakes)) out.mistakes = v.mistakes.filter((x): x is string => typeof x === "string").slice(0, 300);
  if (isObj(v.days))
    for (const [k, d] of Object.entries(v.days))
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && isObj(d) && num(d.n, 0) && num(d.r, 0) && num(d.c, 0) && num(d.t, 0))
        out.days[k] = { n: d.n as number, r: d.r as number, c: d.c as number, t: d.t as number };
  if (Array.isArray(v.typing))
    out.typing = v.typing
      .filter(
        (t): t is TypingRound =>
          isObj(t) && num(t.at, 0) && ["word", "sentence", "dictation"].includes(t.mode as string) && num(t.items, 0) && num(t.wpm, 0, 400) && num(t.accuracy, 0, 100),
      )
      .slice(-500);
  const s = v.session;
  if (isObj(s) && s.v === SESSION_VERSION && typeof s.id === "string" && Array.isArray(s.steps) && num(s.index, 0) && isObj(s.graded))
    out.session = s as unknown as ActiveSession;
  return out;
}

export function sanitizeSettings(v: unknown): Settings {
  const s = { ...defaultSettings };
  if (!isObj(v)) return s;
  if (v.accent === "uk" || v.accent === "us") s.accent = v.accent;
  if (typeof v.autoplay === "boolean") s.autoplay = v.autoplay;
  if (num(v.dailyNew, 0, 100)) s.dailyNew = Math.round(v.dailyNew as number);
  if (num(v.retention, 0.7, 0.97)) s.retention = v.retention as number;
  if (v.theme === "system" || v.theme === "light" || v.theme === "dark") s.theme = v.theme;
  if (typeof v.sfx === "boolean") s.sfx = v.sfx;
  if (typeof v.spell === "boolean") s.spell = v.spell;
  if (num(v.startLevel, 0, 5)) s.startLevel = Math.round(v.startLevel as number);
  if (typeof v.onboarded === "boolean") s.onboarded = v.onboarded;
  if (v.dataset === "open" || v.dataset === "primary" || v.dataset === "junior" || v.dataset === "private") s.dataset = v.dataset;
  if (["off", "stars", "rain", "sea", "forest", "fire", "voyage", "cafe"].includes(v.ambience as string)) s.ambience = v.ambience as Settings["ambience"];
  if (num(v.ambienceVolume, 0, 1)) s.ambienceVolume = v.ambienceVolume as number;
  if (typeof v.splash === "boolean") s.splash = v.splash;
  return s;
}

/* ---------- store ---------- */

interface State {
  progress: Progress;
  settings: Settings;
  pet: PetState;
  saveError: boolean;
}

let state: State = {
  progress: emptyProgress(DEFAULT_DATASET),
  settings: { ...defaultSettings },
  pet: createPet(),
  saveError: false,
};
const listeners = new Set<() => void>();
let saveTimer: number | undefined;
/** Only write when this tab changed something, so idle tabs never clobber newer data. */
let dirty = false;
/** Progress is written only after it has been read from storage for this dataset. */
let loadedId: string | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function scheduleSave() {
  dirty = true;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flush, 250);
}

export function flush() {
  window.clearTimeout(saveTimer);
  if (!dirty) return;
  if (!activeUser) {
    dirty = false;
    return;
  }
  dirty = false;
  const progressOk = loadedId !== state.progress.datasetId || write(progressKey(activeUser, state.progress.datasetId), state.progress);
  const petOk = write(petKey(activeUser), state.pet);
  const ok = progressOk && petOk && write(settingsKey(activeUser), state.settings);
  if (ok === state.saveError) {
    state = { ...state, saveError: !ok };
    emit();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
  // Another tab saved: adopt its data instead of keeping a stale copy.
  window.addEventListener("storage", (e) => {
    if (!e.newValue) return;
    try {
      if (e.key === settingsKey(activeUser)) state = { ...state, settings: sanitizeSettings(JSON.parse(e.newValue)) };
      else if (e.key === progressKey(activeUser, state.progress.datasetId))
        state = { ...state, progress: sanitizeProgress(JSON.parse(e.newValue), state.progress.datasetId) };
      else if (e.key === petKey(activeUser)) state = { ...state, pet: sanitizePet(JSON.parse(e.newValue)) };
      else return;
      emit();
    } catch {
      /* ignore malformed writes */
    }
  });
}

export const store = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** 切换登录用户：先把上一个用户落盘，再载入新用户的设置与当前词库进度。 */
  setUser(username: string, datasetId: string) {
    if (activeUser === username && loadedId === datasetId) return;
    flush();
    activeUser = username;
    loadedId = null;
    state = {
      ...state,
      settings: sanitizeSettings(read(settingsKey(username))),
      progress: emptyProgress(datasetId),
      pet: sanitizePet(read(petKey(username))),
      saveError: false,
    };
    emit();
    store.useDataset(datasetId);
    scheduleSave();
  },
  useDataset(datasetId: string) {
    flush();
    state = { ...state, progress: sanitizeProgress(read(progressKey(activeUser, datasetId)), datasetId) };
    loadedId = datasetId;
    emit();
  },
  progress(fn: (p: Progress) => Progress) {
    state = { ...state, progress: fn(state.progress) };
    emit();
    scheduleSave();
  },
  settings(patch: Partial<Settings>) {
    state = { ...state, settings: { ...state.settings, ...patch } };
    emit();
    scheduleSave();
  },
  /** 学习或复习完一个词：只累计经验；返回是否升级，供界面提示。 */
  petStudy(kind: FeedKind) {
    const res = studyPet(state.pet, kind);
    state = { ...state, pet: res.pet };
    emit();
    scheduleSave();
    return res;
  },
  /** 测试通过：真正喂食。 */
  petFeed(kind: FeedKind) {
    const res = feedPet(state.pet, kind);
    state = { ...state, pet: res.pet };
    emit();
    scheduleSave();
    return res;
  },
  /** 跨天时结算饥饿衰减。 */
  petTick() {
    const next = tickPet(state.pet);
    if (next === state.pet) return;
    state = { ...state, pet: next };
    emit();
    scheduleSave();
  },
  /** 切换宠物外观，只改形象；未解锁的形象不可替换。 */
  petSkin(skin: string) {
    if (!isSkin(skin) || skin === state.pet.skin) return false;
    if (!isSkinUnlocked(skin, state.pet.level)) return false;
    state = { ...state, pet: { ...state.pet, skin } };
    emit();
    scheduleSave();
    return true;
  },
};

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(state), () => select(state));
}

export function bumpDay(p: Progress, patch: Partial<DayStat>): Progress {
  const k = dayKey();
  const d = p.days[k] ?? { n: 0, r: 0, c: 0, t: 0 };
  return {
    ...p,
    days: {
      ...p.days,
      [k]: { n: d.n + (patch.n ?? 0), r: d.r + (patch.r ?? 0), c: d.c + (patch.c ?? 0), t: d.t + (patch.t ?? 0) },
    },
  };
}

export function toggleBookmark(id: string) {
  store.progress((p) => ({
    ...p,
    bookmarks: p.bookmarks.includes(id) ? p.bookmarks.filter((x) => x !== id) : [id, ...p.bookmarks],
  }));
}

/* ---------- backup ---------- */

export function exportBackup() {
  flush();
  const { progress, settings, pet } = state;
  return JSON.stringify({ app: "word-atlas", version: 2, exported: new Date().toISOString(), progress: { ...progress, session: null }, settings, pet }, null, 1);
}

function markDirty() {
  dirty = true;
}

export function importBackup(text: string): { ok: true; cards: number } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "文件不是有效的 JSON。" };
  }
  if (!isObj(data) || data.app !== "word-atlas" || data.version !== 2 || !isObj(data.progress))
    return { ok: false, error: "这不是词光的学习备份。" };
  const id = state.progress.datasetId;
  if (data.progress.datasetId !== id) return { ok: false, error: "备份来自另一个词库，请先切换到对应词库。" };
  const progress = sanitizeProgress({ ...data.progress, session: null }, id);
  const pet = isObj(data.pet) ? sanitizePet(data.pet) : state.pet;
  state = { ...state, progress, settings: { ...sanitizeSettings(data.settings), onboarded: true }, pet };
  emit();
  markDirty();
  flush();
  return { ok: true, cards: Object.keys(progress.cards).length };
}

export function resetProgress() {
  state = { ...state, progress: emptyProgress(state.progress.datasetId) };
  emit();
  markDirty();
  flush();
}
