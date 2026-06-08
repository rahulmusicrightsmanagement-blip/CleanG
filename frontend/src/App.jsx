/* ============================================================
   G-Cleanser prototype — app shell, store, routing, auth, theme
   ============================================================ */
import React, { useState, useEffect } from "react";
import { CD } from "./data/mockData.js";
import { Icon, Avatar, OwnerDot, Modal } from "./components/ui.jsx";
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakSelect } from "./components/TweaksPanel.jsx";
import { Authentication } from "./screens/Authentication.jsx";
import { BranchDashboard } from "./screens/BranchDashboard.jsx";
import { CrossBranchBrowser } from "./screens/CrossBranchBrowser.jsx";
import { BranchSetupWizard } from "./screens/BranchSetupWizard.jsx";
import { PipelineRun } from "./screens/PipelineRun.jsx";
import { IssuesScoring } from "./screens/IssuesScoring.jsx";
import { ReviewQueue } from "./screens/ReviewQueue.jsx";
import { MasterTalent } from "./screens/MasterTalent.jsx";
import { Exports } from "./screens/Exports.jsx";

const NAV_TITLE = {
  dashboard: "Branch Dashboard", wizard: "New Branch Setup", cross: "Cross-branch Browser",
  pipeline: "Pipeline Run", issues: "Issues & Scoring", review: "Review",
  master: "Master & Talent", exports: "Exports",
};
const TODAY = "2026-06-05";
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

const ACCENTS = {
  Orchid: ["oklch(0.458 0.210 310)", "oklch(0.330 0.160 312)", "oklch(0.955 0.035 313)", "oklch(0.820 0.090 312)", "oklch(0.600 0.220 312)", "oklch(0.780 0.150 313)", "oklch(0.300 0.055 313)", "oklch(0.420 0.100 312)"],
  Violet: ["oklch(0.604 0.227 312)", "oklch(0.460 0.200 311)", "oklch(0.960 0.040 314)", "oklch(0.850 0.100 312)", "oklch(0.680 0.200 312)", "oklch(0.820 0.130 313)", "oklch(0.310 0.060 313)", "oklch(0.440 0.110 312)"],
  Plum:   ["oklch(0.400 0.160 322)", "oklch(0.300 0.130 322)", "oklch(0.955 0.032 320)", "oklch(0.830 0.075 320)", "oklch(0.580 0.180 322)", "oklch(0.740 0.140 322)", "oklch(0.300 0.060 321)", "oklch(0.420 0.090 321)"],
  Grape:  ["oklch(0.480 0.190 296)", "oklch(0.360 0.150 296)", "oklch(0.955 0.035 298)", "oklch(0.830 0.090 296)", "oklch(0.620 0.180 297)", "oklch(0.780 0.130 297)", "oklch(0.300 0.060 297)", "oklch(0.430 0.100 296)"],
};
const TWEAK_DEFAULTS = {
  "accent": ACCENTS.Orchid,
  "density": "Comfortable",
  "headings": "Public Sans",
};

function loadState() {
  try {
    const raw = localStorage.getItem(CD.STORAGE_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.branches) return s; }
  } catch (e) {}
  return null;
}

export default function App() {
  const saved = loadState();
  const [branches, setBranches] = useState(saved ? saved.branches : deepClone(CD.BRANCHES));
  const [users, setUsers] = useState(saved && saved.users ? saved.users : deepClone(CD.USERS));
  const [authedUserId, setAuthedUserId] = useState(saved ? saved.authedUserId || null : null);
  const [view, setView] = useState("dashboard");
  const [params, setParams] = useState({});
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [userMenu, setUserMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [nameModal, setNameModal] = useState(null);
  const [delId, setDelId] = useState(null);
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [theme, setTheme] = useState(function () {
    try { var s = localStorage.getItem("gc-theme"); if (s === "dark" || s === "light") return s; } catch (e) {}
    try { if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark"; } catch (e) {}
    return "light";
  });

  useEffect(function () {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("gc-theme", theme); } catch (e) {}
  }, [theme]);

  useEffect(function () {
    try {
      var w = localStorage.getItem("gc-sidebar-w");
      if (w && /^\d+px$/.test(w)) document.documentElement.style.setProperty("--sidebar-w", w);
    } catch (e) {}
  }, []);

  useEffect(function () {
    const r = document.documentElement.style;
    const a = tw.accent || ACCENTS.Orchid;
    const o = theme === "dark" && a.length >= 8 ? 4 : 0;
    r.setProperty("--accent", a[o]);
    r.setProperty("--accent-ink", a[o + 1]);
    r.setProperty("--accent-soft", a[o + 2]);
    r.setProperty("--accent-line", a[o + 3]);
    r.setProperty("--dens", tw.density === "Compact" ? "0.78" : "1");
    r.setProperty("--display", (tw.headings || "Public Sans") + ", system-ui, sans-serif");
  }, [tw, theme]);

  useEffect(function () {
    try {
      localStorage.setItem(CD.STORAGE_KEY, JSON.stringify({ branches: branches, users: users, authedUserId: authedUserId }));
    } catch (e) {}
  }, [branches, users, authedUserId]);

  useEffect(function () {
    if (!toast) return;
    const t = setTimeout(function () { setToast(null); }, 2600);
    return function () { clearTimeout(t); };
  }, [toast]);

  const currentUserId = authedUserId;
  const findUser = function (id) { return users.find(function (u) { return u.id === id; }) || CD.user(id); };
  const activeBranch = branches.find(function (b) { return b.id === activeBranchId; }) || null;
  const canEdit = !!activeBranch && activeBranch.owner === currentUserId;

  function go(v, p) { setView(v); setParams(p || {}); setUserMenu(false); }

  function signIn(email, password) {
    const u = users.find(function (x) { return (x.email || "").toLowerCase() === email.trim().toLowerCase(); });
    if (!u) return "No account found with that email.";
    if (u.password !== password) return "Incorrect password. Try again.";
    setAuthedUserId(u.id); setActiveBranchId(null); setView("dashboard");
    return null;
  }
  function signUp(data) {
    if (users.some(function (x) { return (x.email || "").toLowerCase() === data.email.trim().toLowerCase(); })) return "An account with this email already exists.";
    const id = "u_new_" + Date.now();
    const initials = data.name.trim().split(/\s+/).map(function (s) { return s[0]; }).slice(0, 2).join("").toUpperCase();
    const hues = [195, 68, 285, 330, 150, 250, 25];
    const nu = { id: id, name: data.name.trim(), email: data.email.trim(), password: data.password, role: data.role, initials: initials, hue: hues[users.length % hues.length] };
    setUsers(function (list) { return list.concat([nu]); });
    setAuthedUserId(id); setActiveBranchId(null); setView("dashboard");
    return null;
  }
  function signOut() { setAuthedUserId(null); setActiveBranchId(null); setUserMenu(false); setView("dashboard"); }
  function switchAccount(id) { setAuthedUserId(id); setActiveBranchId(null); setUserMenu(false); setView("dashboard"); }

  function naturalScreen(b) {
    if (b.owner !== currentUserId) return "cross";
    if (b.status === "setup") return "wizard";
    if (b.status === "running") return "pipeline";
    if (b.status === "awaiting-review") return "review";
    return "master";
  }
  function openBranch(id) {
    const b = branches.find(function (x) { return x.id === id; });
    if (!b) return;
    if (b.owner !== currentUserId) { go("cross", { branchId: id }); return; }
    setActiveBranchId(id);
    go(naturalScreen(b), {});
  }
  function patchBranch(id, fn) {
    setBranches(function (list) { return list.map(function (b) { return b.id === id ? fn(Object.assign({}, b)) : b; }); });
  }

  function startNewBranch() { setNameModal({ value: "", err: null }); }
  function confirmName() {
    const name = (nameModal.value || "").trim();
    if (!name) { setNameModal({ value: nameModal.value, err: "Branch name is required." }); return; }
    if (branches.some(function (b) { return b.owner === currentUserId && b.name.toLowerCase() === name.toLowerCase(); })) {
      setNameModal({ value: nameModal.value, err: "You already have a branch with this name." }); return;
    }
    const id = "b_new_" + Date.now();
    const nb = {
      id: id, owner: currentUserId, dataset: "pdl1", name: name,
      status: "setup", created: TODAY, updated: TODAY,
      files: [], primaryKey: null, preset: null, customColumns: null,
      rowsIn: 0, rowsOut: null, deleted: null, gMatches: 0,
      pipeline: { done: false, step: 0 },
      flaggedRows: [], review: { edits: {}, deleted: [], submitted: false }, adopted: {},
      commits: [{ id: "#n0", kind: "upload", label: "Branch “" + name + "” created", at: TODAY + " 10:30" }],
    };
    setBranches(function (list) { return list.concat([nb]); });
    setActiveBranchId(id);
    setNameModal(null);
    go("wizard");
  }
  function addFile(branchId, lib) {
    patchBranch(branchId, function (b) {
      const err = lib.error || (lib.bytes > CD.MAX_BYTES ? "Exceeds the 20 MB per-file limit." : null);
      const file = { id: lib.id, file: lib.file, size: lib.size, rows: lib.rows, columns: lib.columns || [], error: err };
      b.files = (b.files || []).concat([file]);
      b.rowsIn = b.files.filter(function (f) { return !f.error; }).reduce(function (s, f) { return s + (f.rows || 0); }, 0);
      return b;
    });
  }
  function removeFile(branchId, fileId) {
    patchBranch(branchId, function (b) {
      b.files = (b.files || []).filter(function (f) { return f.id !== fileId; });
      b.rowsIn = b.files.filter(function (f) { return !f.error; }).reduce(function (s, f) { return s + (f.rows || 0); }, 0);
      return b;
    });
  }
  function setPrimaryKey(branchId, col) { patchBranch(branchId, function (b) { b.primaryKey = col; return b; }); }
  function finishSetup(branchId, preset, customColumns) {
    patchBranch(branchId, function (b) {
      b.preset = preset; b.customColumns = customColumns || null;
      b.status = "running"; b.pipeline = { done: false, step: 0 };
      b.flaggedRows = CD.REVIEW_ROWS.map(function (r) { return r.id; });
      b.review = { edits: {}, deleted: [], submitted: false };
      b.gMatches = 6;
      if (!b.rowsIn) b.rowsIn = 5042;
      b.commits = b.commits.concat([
        { id: "#st1", kind: "auto", label: "Merged " + (b.files || []).filter(function (f) { return !f.error; }).length + " file(s) on key " + b.primaryKey, at: TODAY + " 10:31" },
        { id: "#st2", kind: "auto", label: "Preset “" + preset + "” · cleansing started", at: TODAY + " 10:31" },
      ]);
      return b;
    });
    go("pipeline");
  }
  function setAwaitingReview(id) {
    patchBranch(id, function (b) {
      if (b.status !== "running") return b;
      b.status = "awaiting-review"; b.pipeline = { done: false, step: 5 };
      b.commits = b.commits.concat([{ id: "#au", kind: "auto", label: "Scored & routed · " + (b.flaggedRows || []).length + " records below 100% to review", at: TODAY + " 10:33" }]);
      return b;
    });
  }
  function setRowEdit(branchId, rowId, val) {
    patchBranch(branchId, function (b) {
      b.review = Object.assign({}, b.review); b.review.edits = Object.assign({}, b.review.edits); b.review.edits[rowId] = val;
      return b;
    });
  }
  function deleteRows(branchId, ids) {
    patchBranch(branchId, function (b) {
      b.review = Object.assign({}, b.review);
      const set = (b.review.deleted || []).slice();
      ids.forEach(function (id) { if (set.indexOf(id) < 0) set.push(id); });
      b.review.deleted = set;
      return b;
    });
  }
  function submitReview(branchId) {
    patchBranch(branchId, function (b) {
      b.review = Object.assign({}, b.review, { submitted: true });
      const del = (b.review.deleted || []).length;
      b.deleted = del; b.rowsOut = Math.max(0, (b.rowsIn || 0) - del);
      b.status = "sealed"; b.pipeline = { done: true, step: 7 };
      b.commits = b.commits.concat([{ id: "#sub", kind: "seal", label: "Review submitted · " + del + " deleted · " + Object.keys(b.review.edits || {}).length + " corrected · master built", at: TODAY + " 10:50" }]);
      return b;
    });
  }
  function confirmDelete(id) { setDelId(id); }
  function doDelete() {
    const id = delId;
    setBranches(function (list) { return list.filter(function (b) { return b.id !== id; }); });
    if (activeBranchId === id) { setActiveBranchId(null); go("dashboard"); }
    setDelId(null);
    setToast("Branch deleted.");
  }
  function adopt(fromBranch, item) {
    let target = activeBranch && activeBranch.owner === currentUserId ? activeBranch : branches.find(function (b) { return b.owner === currentUserId; });
    if (!target) { setToast("You have no branch to adopt into — start one first."); return; }
    patchBranch(target.id, function (b) {
      b.adopted = Object.assign({}, b.adopted); b.adopted[item.id] = true;
      b.commits = b.commits.concat([{ id: "#ad" + Object.keys(b.adopted).length, kind: "adopt", label: "Adopted: " + item.title, at: TODAY + " 11:00", prov: "from " + findUser(fromBranch.owner).name + " · " + fromBranch.name }]);
      return b;
    });
    setToast("Adopted “" + item.title + "” into " + target.name + " — with provenance.");
  }

  const ctx = {
    currentUserId: currentUserId, users: users, user: findUser, dataset: CD.dataset,
    branches: branches, activeBranchId: activeBranchId, activeBranch: activeBranch, canEdit: canEdit,
    view: view, params: params, go: go, openBranch: openBranch,
    startNewBranch: startNewBranch, addFile: addFile, removeFile: removeFile,
    setPrimaryKey: setPrimaryKey, finishSetup: finishSetup, setAwaitingReview: setAwaitingReview,
    setRowEdit: setRowEdit, deleteRows: deleteRows, submitReview: submitReview,
    confirmDelete: confirmDelete, adopt: adopt, toast: setToast,
  };

  const requiresBranch = ["wizard", "pipeline", "issues", "review", "master", "exports"];
  let renderView = view;
  if (requiresBranch.indexOf(view) >= 0 && !activeBranch) renderView = "dashboard";
  const SCREENS = { dashboard: BranchDashboard, wizard: BranchSetupWizard, cross: CrossBranchBrowser, pipeline: PipelineRun, issues: IssuesScoring, review: ReviewQueue, master: MasterTalent, exports: Exports };
  const Screen = SCREENS[renderView] || BranchDashboard;

  if (!authedUserId) {
    return React.createElement(Authentication, { users: users, onSignin: signIn, onSignup: signUp });
  }

  const me = findUser(currentUserId);
  const inSetup = activeBranch && activeBranch.status === "setup";
  const pendingReview = activeBranch && canEdit && !activeBranch.review.submitted
    ? (activeBranch.flaggedRows || []).filter(function (id) { return (activeBranch.review.deleted || []).indexOf(id) < 0; }).length : 0;

  return React.createElement("div", { className: "app" },
    React.createElement("aside", { className: "sidebar" },
      React.createElement("div", {
        className: "sb-resizer", role: "separator", "aria-orientation": "vertical", title: "Drag to resize",
        onPointerDown: function (e) {
          e.preventDefault();
          var startX = e.clientX;
          var root = document.documentElement;
          var startW = parseInt(getComputedStyle(root).getPropertyValue("--sidebar-w")) || 252;
          e.currentTarget.classList.add("dragging");
          var handle = e.currentTarget;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
          function move(ev) {
            var w = startW + (ev.clientX - startX);
            w = Math.max(196, Math.min(460, w));
            root.style.setProperty("--sidebar-w", w + "px");
          }
          function up() {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            if (handle) handle.classList.remove("dragging");
            try { localStorage.setItem("gc-sidebar-w", getComputedStyle(root).getPropertyValue("--sidebar-w").trim()); } catch (er) {}
          }
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        },
      }),
      React.createElement("div", { className: "sb-brand" },
        React.createElement("span", { className: "dot" }),
        React.createElement("span", { className: "nm" }, "G-Cleanser"),
        React.createElement("span", { className: "wt" }, "proto")),
      React.createElement("div", { className: "sb-scroll" },
        React.createElement("div", { className: "sb-group" },
          React.createElement("div", { className: "sb-label" }, "Workspace"),
          navItem("dashboard", "dashboard", "Branch Dashboard", renderView, go),
          React.createElement("button", { className: "sb-item", onClick: startNewBranch },
            React.createElement(Icon, { name: "plus", size: 17, className: "ico" }), React.createElement("span", null, "New Branch")),
          navItem("cross", "cross", "Cross-branch Browser", renderView, go)),
        React.createElement("div", { className: "sb-group" },
          React.createElement("div", { className: "sb-label" }, activeBranch ? "Active branch" : "Active branch · none"),
          activeBranch
            ? React.createElement("div", { className: "sb-branchctx" },
                React.createElement("div", { className: "t" }, "Open"),
                React.createElement("div", { className: "b" }, React.createElement(OwnerDot, { user: findUser(activeBranch.owner) }), activeBranch.name),
                !canEdit ? React.createElement("span", { className: "tag", style: { marginTop: 6, display: "inline-block" } }, "read-only") : null)
            : null,
          inSetup
            ? navItem("wizard", "upload", "Setup Wizard", renderView, go)
            : React.createElement(React.Fragment, null,
                branchNav("pipeline", "pipeline", "Pipeline Run", renderView, go, activeBranch),
                branchNav("issues", "scale", "Issues & Scoring", renderView, go, activeBranch),
                branchNavBadge("review", "review", "Review", renderView, go, activeBranch, pendingReview),
                branchNav("master", "table", "Master & Talent", renderView, go, activeBranch),
                branchNav("exports", "export", "Exports", renderView, go, activeBranch)))),
      React.createElement("div", { className: "sb-user", style: { position: "relative" } },
        userMenu ? React.createElement("div", { className: "usermenu" },
          React.createElement("div", { className: "um-head" },
            React.createElement("div", { className: "n" }, me.name),
            React.createElement("div", { className: "e" }, me.email || "")),
          React.createElement("div", { className: "um-div" }),
          React.createElement("div", { className: "mh" }, "Switch account (demo)"),
          users.filter(function (u) { return u.id !== currentUserId; }).map(function (u) {
            return React.createElement("button", { key: u.id, onClick: function () { switchAccount(u.id); } },
              React.createElement(Avatar, { user: u, size: 26 }), React.createElement("span", null, u.name));
          }),
          React.createElement("div", { className: "um-div" }),
          React.createElement("button", { className: "signout", onClick: signOut },
            React.createElement(Icon, { name: "lock", size: 15 }), React.createElement("span", null, "Sign out"))) : null,
        React.createElement("button", { className: "sb-userbtn", onClick: function () { setUserMenu(!userMenu); } },
          React.createElement(Avatar, { user: me, size: 32 }),
          React.createElement("div", { className: "meta" }, React.createElement("div", { className: "n" }, me.name), React.createElement("div", { className: "r" }, me.role)),
          React.createElement(Icon, { name: userMenu ? "chevronUp" : "chevron", size: 16, className: "chev" })))),

    React.createElement("div", { className: "main" },
      React.createElement("div", { className: "topbar" },
        React.createElement("div", { className: "crumb" },
          React.createElement("span", null, "Workspace"),
          activeBranch && requiresBranch.indexOf(renderView) >= 0 ? React.createElement(React.Fragment, null, React.createElement("span", { className: "sep" }, "/"), React.createElement("span", null, activeBranch.name)) : null,
          React.createElement("span", { className: "sep" }, "/"),
          React.createElement("span", { className: "cur" }, NAV_TITLE[renderView])),
        React.createElement("div", { className: "right" },
          React.createElement("button", {
            className: "theme-tog", role: "switch", "aria-checked": theme === "dark",
            title: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
            onClick: function () { setTheme(theme === "dark" ? "light" : "dark"); },
          },
            React.createElement("span", { className: "tt-knob" }),
            React.createElement("span", { className: "tt-ic tt-sun" }, React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("circle", { cx: 12, cy: 12, r: 4 }), React.createElement("path", { d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" }))),
            React.createElement("span", { className: "tt-ic tt-moon" }, React.createElement("svg", { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("path", { d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" })))),
          branches.some(function (b) { return b.status === "running"; }) ? React.createElement("span", { className: "runpill" }, React.createElement("span", { className: "blip" }), "pipeline running") : null,
          React.createElement(Avatar, { user: me, size: 30 }))),
      React.createElement("div", { className: "content" }, React.createElement(Screen, { ctx: ctx }))),

    toast ? React.createElement("div", { className: "toast" }, React.createElement(Icon, { name: "check", size: 15 }), toast) : null,

    nameModal ? React.createElement(Modal, { title: "Name your branch", onClose: function () { setNameModal(null); }, width: 440 },
      React.createElement("p", { style: { marginTop: -4, fontSize: 14 } }, "Give this cleansing branch a clear name. You'll upload files into it next."),
      React.createElement("label", { className: "field-label" }, "Branch name", React.createElement("span", { className: "req" }, "*")),
      React.createElement("input", {
        className: "tinput" + (nameModal.err ? " err" : ""), autoFocus: true, value: nameModal.value,
        placeholder: "e.g. PDL Q2 catalog cleanse",
        onChange: function (e) { setNameModal({ value: e.target.value, err: null }); },
        onKeyDown: function (e) { if (e.key === "Enter") confirmName(); },
      }),
      nameModal.err ? React.createElement("div", { className: "field-err" }, nameModal.err) : null,
      React.createElement("div", { className: "modal-actions" },
        React.createElement("button", { className: "btn ghost", onClick: function () { setNameModal(null); } }, "Cancel"),
        React.createElement("button", { className: "btn pri", onClick: confirmName }, "Create & upload →"))) : null,

    delId ? (function () {
      const db = branches.find(function (b) { return b.id === delId; });
      return React.createElement(Modal, { title: "Delete this branch?", onClose: function () { setDelId(null); }, width: 440 },
        React.createElement("p", { style: { marginTop: -4, fontSize: 14 } }, "“", React.createElement("b", null, db ? db.name : ""), "” and all its cleaning work will be permanently removed. This cannot be undone."),
        React.createElement("div", { className: "modal-actions" },
          React.createElement("button", { className: "btn ghost", onClick: function () { setDelId(null); } }, "Cancel"),
          React.createElement("button", { className: "btn", style: { background: "var(--danger)", borderColor: "var(--danger)", color: "#fff" }, onClick: doDelete },
            React.createElement(Icon, { name: "alert", size: 15 }), "Delete branch")));
    })() : null,

    React.createElement(TweaksPanel, { title: "Tweaks" },
      React.createElement(TweakSection, { label: "Theme" }),
      React.createElement(TweakColor, { label: "Accent", value: tw.accent,
        options: [ACCENTS.Orchid, ACCENTS.Violet, ACCENTS.Plum, ACCENTS.Grape],
        onChange: function (v) { setTweak("accent", v); } }),
      React.createElement(TweakSection, { label: "Layout" }),
      React.createElement(TweakRadio, { label: "Density", value: tw.density,
        options: ["Comfortable", "Compact"], onChange: function (v) { setTweak("density", v); } }),
      React.createElement(TweakSelect, { label: "Headings", value: tw.headings,
        options: ["Public Sans", "Lato"], onChange: function (v) { setTweak("headings", v); } })));
}

function navItem(v, icon, label, cur, go) {
  return React.createElement("button", { className: "sb-item" + (cur === v ? " active" : ""), onClick: function () { go(v); } },
    React.createElement(Icon, { name: icon, size: 17, className: "ico" }), React.createElement("span", null, label));
}
function branchNav(v, icon, label, cur, go, active) {
  return React.createElement("button", { className: "sb-item" + (cur === v ? " active" : ""), disabled: !active, onClick: function () { if (active) go(v); } },
    React.createElement(Icon, { name: icon, size: 17, className: "ico" }), React.createElement("span", null, label));
}
function branchNavBadge(v, icon, label, cur, go, active, n) {
  return React.createElement("button", { className: "sb-item" + (cur === v ? " active" : ""), disabled: !active, onClick: function () { if (active) go(v); } },
    React.createElement(Icon, { name: icon, size: 17, className: "ico" }), React.createElement("span", null, label),
    n ? React.createElement("span", { className: "count" }, n) : null);
}
