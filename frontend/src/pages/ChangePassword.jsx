import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "../components/Icon.jsx";

// Client-side mirror of the server's password policy so the user gets instant
// feedback (the server re-validates regardless — this is UX, not the gate).
const RULES = [
  { test: (v) => v.length >= 8, label: "At least 8 characters" },
  { test: (v) => /[a-z]/.test(v), label: "A lowercase letter" },
  { test: (v) => /[A-Z]/.test(v), label: "An uppercase letter" },
  { test: (v) => /\d/.test(v), label: "A digit" },
];

// Shown full-screen when the account must rotate its password (bootstrap admin,
// or after an admin reset) before the rest of the app becomes reachable.
export default function ChangePassword({ forced = false }) {
  const { user, changePassword, logout } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));

  const failed = RULES.filter((r) => !r.test(next));
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit =
    current && failed.length === 0 && next === confirm && next !== current;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setBusy(true);
    try {
      await changePassword(current, next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell auth-solo">
      <main className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-brand auth-brand-sm">
            <img src="/logo.png" alt="MRM Cleanser" className="brand-logo" />
          </div>

          <div className="auth-head">
            <h2>{forced ? "Set a new password" : "Change your password"}</h2>
            <p className="muted small">
              {forced
                ? `For security, ${user?.email || "this account"} must choose a new password before continuing.`
                : "Pick a strong password you don't use anywhere else."}
            </p>
          </div>

          {error && (
            <div className="alert" role="alert">
              <Icon name="alert" size={16} />
              {error}
            </div>
          )}

          <label className="field">
            <span className="field-label">Current password</span>
            <span className="field-control">
              <Icon name="lock" size={17} className="field-icon" />
              <input
                type={show.current ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                autoFocus
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => toggle("current")}
                aria-label={show.current ? "Hide password" : "Show password"}
                title={show.current ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <Icon name={show.current ? "eyeOff" : "eye"} size={18} />
              </button>
            </span>
          </label>

          <label className="field">
            <span className="field-label">New password</span>
            <span className="field-control">
              <Icon name="lock" size={17} className="field-icon" />
              <input
                type={show.next ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => toggle("next")}
                aria-label={show.next ? "Hide password" : "Show password"}
                title={show.next ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <Icon name={show.next ? "eyeOff" : "eye"} size={18} />
              </button>
            </span>
          </label>

          <label className="field">
            <span className="field-label">Confirm new password</span>
            <span className="field-control">
              <Icon name="lock" size={17} className="field-icon" />
              <input
                type={show.confirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => toggle("confirm")}
                aria-label={show.confirm ? "Hide password" : "Show password"}
                title={show.confirm ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <Icon name={show.confirm ? "eyeOff" : "eye"} size={18} />
              </button>
            </span>
            {mismatch && (
              <span className="caps-hint">
                <Icon name="alert" size={13} /> Passwords don't match
              </span>
            )}
            {next && next === current && (
              <span className="caps-hint">
                <Icon name="alert" size={13} /> Must differ from the current password
              </span>
            )}
          </label>

          <ul className="pw-rules">
            {RULES.map((r) => {
              const ok = r.test(next);
              return (
                <li key={r.label} className={ok ? "ok" : ""}>
                  <Icon name={ok ? "check" : "x"} size={13} />
                  {r.label}
                </li>
              );
            })}
          </ul>

          <button
            className="btn primary auth-submit"
            type="submit"
            disabled={busy || !canSubmit}
          >
            {busy ? (
              <>
                <span className="btn-spinner" /> Saving…
              </>
            ) : (
              <>
                Update password <Icon name="arrowRight" size={16} />
              </>
            )}
          </button>

          {forced && (
            <button
              type="button"
              className="link-btn"
              style={{ marginTop: "0.75rem" }}
              onClick={logout}
            >
              Sign out instead
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
