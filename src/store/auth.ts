import { useSyncExternalStore } from "react";

/**
 * 本地多用户账号。
 *
 * 这是一个纯前端的自托管应用，没有服务器：账号、盐值和口令摘要都只存在本机浏览器里。
 * 口令用 SHA-256(盐 + 口令) 存摘要，不存明文；但这只是「区分用户」，
 * 不构成真正的安全边界（能改本机存储的人就能改账号数据）。
 *
 * 每个用户的进度、设置（曲线 / 词库配置 / 以后的宠物状态）按 username 分命名空间存储，
 * 见 store.ts 里的 settingsKey / progressKey。
 */
export interface User {
  username: string;
  nickname: string;
  salt: string;
  hash: string;
  createdAt: number;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

const USERS_KEY = "word-atlas:users";
const ACTIVE_KEY = "word-atlas:active-user";

const DEFAULT_USERS = [
  { username: "jingxuan", nickname: "景轩", password: "123456" },
  { username: "jingchen", nickname: "景辰", password: "123456" },
];

let users: User[] = [];
let currentName: string | null = null;
let ready = false;
let snapshot: { ready: boolean; current: User | null; users: User[] } = { ready: false, current: null, users: [] };
const listeners = new Set<() => void>();

function emit() {
  snapshot = { ready, current: users.find((u) => u.username === currentName) ?? null, users: [...users] };
  listeners.forEach((l) => l());
}

/* ---------- 口令摘要 ---------- */

function fallbackDigest(bytes: Uint8Array) {
  // 非安全上下文（例如局域网 http）没有 crypto.subtle，改用简单的双散列，仅用于区分账号。
  let a = 0x811c9dc5;
  let b = 0x1000193;
  for (const v of bytes) {
    a = Math.imul(a ^ v, 16777619) >>> 0;
    b = Math.imul(b ^ v, 2654435761) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

async function hashPassword(password: string, salt: string) {
  const bytes = new TextEncoder().encode(`word-atlas:${salt}:${password}`);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return fallbackDigest(bytes);
}

function newSalt() {
  const bytes = new Uint8Array(8);
  try {
    globalThis.crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeUser(username: string, nickname: string, password: string): Promise<User> {
  const salt = newSalt();
  return { username, nickname, salt, hash: await hashPassword(password, salt), createdAt: Date.now() };
}

/* ---------- 存储 ---------- */

function readUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter(
      (u): u is User =>
        !!u &&
        typeof u === "object" &&
        typeof (u as User).username === "string" &&
        typeof (u as User).nickname === "string" &&
        typeof (u as User).salt === "string" &&
        typeof (u as User).hash === "string",
    );
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    if (currentName) localStorage.setItem(ACTIVE_KEY, currentName);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* 浏览器拒绝写入时账号只存在于本次会话 */
  }
}

/** 首次运行时写入两个默认账号（jingxuan / jingchen，口令 123456）。 */
export async function initAuth() {
  if (ready) return;
  users = readUsers();
  if (!users.length) {
    for (const d of DEFAULT_USERS) users.push(await makeUser(d.username, d.nickname, d.password));
    persist();
  }
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(ACTIVE_KEY);
  } catch {
    saved = null;
  }
  currentName = saved && users.some((u) => u.username === saved) ? saved : null;
  ready = true;
  emit();
}

/* ---------- 校验 ---------- */

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export function validateUsername(v: string): string | null {
  if (!v) return "请填写用户名。";
  if (!USERNAME_RE.test(v)) return "用户名需 3–20 位，只能用字母、数字和下划线。";
  return null;
}
export function validateNickname(v: string): string | null {
  if (!v.trim()) return "请填写昵称。";
  if (v.trim().length > 12) return "昵称最多 12 个字。";
  return null;
}
export function validatePassword(v: string): string | null {
  if (!v) return "请填写密码。";
  if (v.length < 6) return "密码至少 6 位。";
  if (v.length > 64) return "密码太长了。";
  return null;
}

/* ---------- 账号操作 ---------- */

export async function signIn(username: string, password: string): Promise<AuthResult> {
  const name = username.trim().toLowerCase();
  const user = users.find((u) => u.username === name);
  if (!user) return { ok: false, error: "没有这个用户。" };
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.hash) return { ok: false, error: "密码不对，再试一次。" };
  currentName = name;
  persist();
  emit();
  return { ok: true };
}

export function signOut() {
  currentName = null;
  persist();
  emit();
}

export async function createUser(input: { username: string; nickname: string; password: string }): Promise<AuthResult> {
  const username = input.username.trim().toLowerCase();
  const nickname = input.nickname.trim() || username;
  const err = validateUsername(username) ?? validateNickname(nickname) ?? validatePassword(input.password);
  if (err) return { ok: false, error: err };
  if (users.some((u) => u.username === username)) return { ok: false, error: "这个用户名已经被占用了。" };
  if (users.length >= 20) return { ok: false, error: "本机账号太多了（上限 20 个）。" };
  users = [...users, await makeUser(username, nickname, input.password)];
  persist();
  emit();
  return { ok: true };
}

export function renameUser(nickname: string): AuthResult {
  const user = users.find((u) => u.username === currentName);
  if (!user) return { ok: false, error: "请先登录。" };
  const name = nickname.trim();
  const err = validateNickname(name);
  if (err) return { ok: false, error: err };
  users = users.map((u) => (u.username === user.username ? { ...u, nickname: name } : u));
  persist();
  emit();
  return { ok: true };
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<AuthResult> {
  const user = users.find((u) => u.username === currentName);
  if (!user) return { ok: false, error: "请先登录。" };
  const oldHash = await hashPassword(oldPassword, user.salt);
  if (oldHash !== user.hash) return { ok: false, error: "原密码不对。" };
  const err = validatePassword(newPassword);
  if (err) return { ok: false, error: err };
  const salt = newSalt();
  const hash = await hashPassword(newPassword, salt);
  users = users.map((u) => (u.username === user.username ? { ...u, salt, hash } : u));
  persist();
  emit();
  return { ok: true };
}

/* ---------- React ---------- */

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAuth() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}
