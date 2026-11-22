import assert from "node:assert/strict";
import test from "node:test";
import { validateNickname, validatePassword, validateUsername } from "./auth";

test("用户名规则：3–20 位字母数字下划线", () => {
  assert.equal(validateUsername("jingxuan"), null);
  assert.equal(validateUsername("jing_chen_01"), null);
  assert.ok(validateUsername(""));
  assert.ok(validateUsername("ab"));
  assert.ok(validateUsername("景轩"));
  assert.ok(validateUsername("jing xuan"));
  assert.ok(validateUsername("a".repeat(21)));
});

test("密码规则：至少 6 位", () => {
  assert.equal(validatePassword("123456"), null);
  assert.ok(validatePassword(""));
  assert.ok(validatePassword("12345"));
  assert.ok(validatePassword("a".repeat(65)));
});

test("昵称规则：非空且不超过 12 个字", () => {
  assert.equal(validateNickname("景轩"), null);
  assert.ok(validateNickname("   "));
  assert.ok(validateNickname("字".repeat(13)));
});
