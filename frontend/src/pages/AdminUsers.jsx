import { useEffect, useState } from "react";
import { api } from "../api/client.js";

const EMPTY = { email: "", full_name: "", password: "", role: "user" };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

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

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="muted">Provision accounts for your team.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

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
            <input
              type="text"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
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
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>
                  <span className="role-pill">{u.role}</span>
                </td>
                <td>{u.is_active ? "Active" : "Disabled"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
