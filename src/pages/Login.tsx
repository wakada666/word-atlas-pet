import { useState, type FormEvent } from "react";
import { signIn, useAuth } from "../store/auth";
import { CreateUserForm } from "../ui/AccountForms";
import { Logo } from "../ui/Logo";

export function Login() {
  const { users } = useAuth();
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await signIn(username, password);
    setBusy(false);
    if (!r.ok) setError(r.error);
  };

  return (
    <div className="login">
      <div className="login-card">
        <Logo />
        <p className="eyebrow login-eyebrow">词光 · Word Atlas</p>
        <h1 className="login-title">今天谁来背单词？</h1>
        <p className="muted login-sub">每个账号有独立的学习曲线、词库设置和宠物。</p>

        {mode === "signin" ? (
          <>
            {users.length > 0 && (
              <div className="login-users">
                {users.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    className={`login-user ${username === u.username ? "is-on" : ""}`}
                    onClick={() => {
                      setUsername(u.username);
                      setPassword("");
                      setError(null);
                    }}
                  >
                    <span className="avatar">{u.nickname.slice(0, 1)}</span>
                    <b>{u.nickname}</b>
                    <small>@{u.username}</small>
                  </button>
                ))}
              </div>
            )}
            <form className="account-form" onSubmit={submit}>
              <label className="field-col">
                <b>用户名</b>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jingxuan" autoComplete="username" />
              </label>
              <label className="field-col">
                <b>密码</b>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
              </label>
              {error && <p className="form-error">{error}</p>}
              {notice && <p className="form-note">{notice}</p>}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "登录中…" : "登录"}
              </button>
            </form>
            <p className="login-hint">默认账号 jingxuan / jingchen，密码 123456，登录后请在「我的 → 账号」里改掉。</p>
            <button className="link login-switch" type="button" onClick={() => { setMode("create"); setError(null); }}>
              没有我的账号？新建一个
            </button>
          </>
        ) : (
          <>
            <CreateUserForm
              onDone={(msg) => {
                setMode("signin");
                setNotice(msg);
                setError(null);
              }}
            />
            <button className="link login-switch" type="button" onClick={() => setMode("signin")}>
              返回登录
            </button>
          </>
        )}
      </div>
    </div>
  );
}
