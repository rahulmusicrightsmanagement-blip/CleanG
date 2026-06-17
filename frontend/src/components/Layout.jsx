import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "./Icon.jsx";

function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">MRM</span> Cleanser
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            <Icon name="branch" size={16} /> Branches
          </NavLink>
          {user?.role === "admin" && (
            <NavLink to="/users">
              <Icon name="users" size={16} /> Users
            </NavLink>
          )}
        </nav>
        <div className="user-box">
          <div className="avatar">{initials(user?.full_name)}</div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span className="user-name">{user?.full_name}</span>
            <span className="role-pill" style={{ alignSelf: "flex-start" }}>
              {user?.role}
            </span>
          </div>
          <button className="btn ghost sm" onClick={handleLogout} title="Log out">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
