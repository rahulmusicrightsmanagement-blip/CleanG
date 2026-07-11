import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "../components/Icon.jsx";

const EMPTY = { email: "", full_name: "", password: "", role: "user" };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [rowBusy, setRowBusy] = useState(null); // id of the user row being changed
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState("");
  const [reportErr, setReportErr] = useState("");

  async function load() {
    setLoading(true);
    try {
      setUsers(await api("/api/users"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function sendReportNow() {
    setReportBusy(true);
    setReportMsg("");
    setReportErr("");
    try {
      const res = await api("/api/reports/daily/send", { method: "POST" });
      setReportMsg(
        `Report sent for ${res.files} file(s) to ${res.recipients.join(", ")}.`
      );
    } catch (err) {
      setReportErr(err.message);
    } finally {
      setReportBusy(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await api("/api/users", { method: "POST", body: form });
      setUsers((prev) => [user, ...prev]);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id, role) {
    setError("");
    setRowBusy(id);
    try {
      const updated = await api(`/api/users/${id}`, {
        method: "PATCH",
        body: { role },
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setRowBusy(null);
    }
  }

  async function removeUser(u) {
    if (
      !window.confirm(
        `Delete ${u.full_name} (${u.email})? This permanently removes the account and cannot be undone.`
      )
    )
      return;
    setError("");
    setRowBusy(u.id);
    try {
      await api(`/api/users/${u.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="muted">Provision accounts for your team.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card create-form">
        <h3>Daily report email</h3>
        <p className="muted">
          A summary of every uploaded &amp; cleaned data file is emailed
          automatically each day at 10:30 (India time). Use this to send it now
          for testing.
        </p>
        <button
          className="btn"
          type="button"
          onClick={sendReportNow}
          disabled={reportBusy}
        >
          {reportBusy ? "Sending…" : "Send report now"}
        </button>
        {reportMsg && <small className="muted" style={{ display: "block", marginTop: 8 }}>{reportMsg}</small>}
        {reportErr && <div className="alert" style={{ marginTop: 8 }}>{reportErr}</div>}
      </div>

      <form className="card create-form" onSubmit={handleCreate}>
        <h3>Create account</h3>
        <div className="form-row">
          <label>
            Full name
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Temporary password
            <span className="pw-wrap">
              <input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                title={showPw ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
              </button>
            </span>
            <small className="muted">
              Min 8 characters, with an uppercase letter, a lowercase letter and
              a digit.
            </small>
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      {loading ? (
        <p className="muted">Loading users…</p>
      ) : (
        <table className="table card">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = me?.id === u.id;
              return (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      disabled={isSelf || rowBusy === u.id}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      title={
                        isSelf ? "You can't change your own role" : "Change role"
                      }
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{u.is_active ? "Active" : "Disabled"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn danger sm"
                      disabled={isSelf || rowBusy === u.id}
                      onClick={() => removeUser(u)}
                      title={
                        isSelf
                          ? "You can't delete your own account"
                          : "Delete user"
                      }
                    >
                      <Icon name="trash" size={15} /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
