import { useState, type FormEvent } from "react";
import { changePassword, createUser, renameUser, validateNickname, validatePassword, validateUsername } from "../store/auth";

interface Props {
  /** 成功后回调，参数是提示文案。 */
  onDone?: (message: string) => void;
}

function FormError({ error }: { error: string | null }) {
  return error ? <p className="form-error">{error}</p> : null;
}

export function CreateUserForm({ onDone }: Props) {
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateUsername(username.trim()) ?? validateNickname(nickname || username.trim()) ?? validatePassword(password);
    if (err) return setError(err);
    setBusy(true);
    const r = await createUser({ username, nickname, password });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    const name = username.trim().toLowerCase();
    setUsername("");
    setNickname("");
    setPassword("");
    onDone?.(`已创建用户 ${name}`);
  };

  return (
    <form className="account-form" onSubmit={submit}>
      <label className="field-col">
        <b>用户名</b>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="字母/数字/下划线，创建后不可修改" autoComplete="off" />
      </label>
      <label className="field-col">
        <b>昵称</b>
        <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="显示用的名字" autoComplete="off" />
      </label>
      <label className="field-col">
        <b>密码</b>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" autoComplete="new-password" />
      </label>
      <FormError error={error} />
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "创建中…" : "创建账号"}
      </button>
    </form>
  );
}

export function RenameForm({ onDone }: Props) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateNickname(nickname);
    if (err) return setError(err);
    const r = renameUser(nickname);
    if (!r.ok) return setError(r.error);
    onDone?.("昵称已更新");
  };

  return (
    <form className="account-form" onSubmit={submit}>
      <label className="field-col">
        <b>新昵称</b>
        <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="最多 12 个字" autoComplete="off" />
      </label>
      <FormError error={error} />
      <button className="btn btn-primary" type="submit">
        保存昵称
      </button>
    </form>
  );
}

export function PasswordForm({ onDone }: Props) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await changePassword(oldPassword, newPassword);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setOldPassword("");
    setNewPassword("");
    onDone?.("密码已更新");
  };

  return (
    <form className="account-form" onSubmit={submit}>
      <label className="field-col">
        <b>原密码</b>
        <input className="input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} autoComplete="current-password" />
      </label>
      <label className="field-col">
        <b>新密码</b>
        <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="至少 6 位" autoComplete="new-password" />
      </label>
      <FormError error={error} />
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "保存中…" : "更新密码"}
      </button>
    </form>
  );
}
