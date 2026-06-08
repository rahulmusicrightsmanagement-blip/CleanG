/* ============================================================
   Branch Dashboard — your branches + read-only access to others'
   ============================================================ */
import React from "react";
import { Icon, Avatar, StatusPill, OwnerDot } from "../components/ui.jsx";

export function BranchDashboard({ ctx }) {
  const me = ctx.user(ctx.currentUserId);
  const mine = ctx.branches.filter(function (b) { return b.owner === ctx.currentUserId; });
  const others = ctx.branches.filter(function (b) { return b.owner !== ctx.currentUserId; });
  const awaiting = mine.filter(function (b) { return b.status === "awaiting-review"; }).length;
  const cleaned = mine.reduce(function (s, b) { return s + (b.rowsOut || 0); }, 0);

  return React.createElement("div", { className: "page fade" },
    React.createElement("div", { className: "acct-banner" },
      React.createElement(Avatar, { user: me, size: 46 }),
      React.createElement("div", { className: "ab-meta" },
        React.createElement("div", { className: "nm" }, me.name),
        React.createElement("div", { className: "em" }, me.email || "")),
      React.createElement("div", { className: "ab-right" },
        React.createElement("span", { className: "badge plain", style: { fontWeight: 600 } }, me.role),
        React.createElement("span", { className: "badge ok" },
          React.createElement("span", { className: "dot-own", style: { background: "var(--ok)" } }), "Signed in"))),

    React.createElement("div", { className: "page-head between" },
      React.createElement("div", null,
        React.createElement("div", { className: "ey" }, "Workspace"),
        React.createElement("h1", null, "Branches"),
        React.createElement("div", { className: "sub" }, "Every cleanse lives in its own isolated branch under its owner. Nothing is centralized — you can browse anyone's work, but it is never auto-merged into yours.")),
      React.createElement("button", { className: "btn pri", onClick: function () { ctx.startNewBranch(); } },
        React.createElement(Icon, { name: "plus", size: 16 }), "New branch")),

    React.createElement("div", { className: "stats", style: { marginBottom: 28 } },
      stat("Your branches", mine.length, ""),
      stat("Awaiting your review", awaiting, "", awaiting ? "accent" : ""),
      stat("Records you've cleaned", cleaned.toLocaleString(), "across sealed branches"),
      stat("Cross-accessible", ctx.branches.length, "all branches · read-only")),

    React.createElement("div", { className: "sectitle" }, "Your branches"),
    mine.length
      ? React.createElement("div", { className: "branchgrid", style: { marginBottom: 30 } },
          mine.map(function (b) { return React.createElement(BranchCard, { key: b.id, branch: b, ctx: ctx, owned: true }); }))
      : React.createElement("div", { className: "empty" }, "No branches yet — start one with New branch."),

    React.createElement("div", { className: "sectitle" },
      React.createElement(Icon, { name: "eye", size: 13, style: { verticalAlign: "-2px", marginRight: 6 } }),
      "Other users' branches · read-only"),
    React.createElement("div", { className: "branchgrid" },
      others.map(function (b) { return React.createElement(BranchCard, { key: b.id, branch: b, ctx: ctx, owned: false }); })));
}

function stat(k, v, d, cls) {
  return React.createElement("div", { className: "stat", key: k },
    React.createElement("div", { className: "k" }, k),
    React.createElement("div", { className: "v " + (cls || "") }, v),
    d ? React.createElement("div", { className: "d" }, d) : null);
}

export function BranchCard({ branch, ctx, owned }) {
  const owner = ctx.user(branch.owner);
  const ds = ctx.dataset(branch.dataset);
  const fileName = branch.files && branch.files[0] ? branch.files[0].file : ds ? ds.file : "—";
  const fileLabel = branch.files && branch.files.length > 1 ? branch.files.length + " files" : fileName;
  const pct = branch.rowsOut ? Math.round(branch.rowsOut / branch.rowsIn * 100) : null;
  const flagged = branch.flaggedRows || [];
  const del = branch.review && branch.review.deleted || [];
  const reviewN = branch.review && branch.review.submitted ? 0 : flagged.filter(function (id) { return del.indexOf(id) < 0; }).length;

  let segs;
  if (branch.status === "setup") {
    segs = [["var(--accent-line)", 12], ["var(--surface-3)", 88]];
  } else if (branch.status === "running") {
    segs = [["var(--accent)", branch.pipeline.step / 7 * 100], ["var(--surface-3)", 100 - branch.pipeline.step / 7 * 100]];
  } else if (branch.status === "awaiting-review") {
    const total = flagged.length || 1;
    const reviewed = total - reviewN;
    segs = [["var(--accent)", 70], ["var(--human)", reviewed / total * 30], ["var(--surface-3)", reviewN / total * 30]];
  } else {
    segs = [["var(--accent)", 100]];
  }

  return React.createElement("div", { className: "branch", onClick: function () { ctx.openBranch(branch.id); } },
    owned ? React.createElement("button", {
      className: "branch-del", title: "Delete branch",
      onClick: function (e) { e.stopPropagation(); ctx.confirmDelete(branch.id); },
    }, React.createElement(Icon, { name: "trash", size: 15 })) : null,
    React.createElement("div", { className: "bh" },
      React.createElement(OwnerDot, { user: owner }),
      React.createElement("span", { className: "nm" }, branch.name),
      React.createElement("div", { style: { marginLeft: "auto", marginRight: owned ? 30 : 0 } }, React.createElement(StatusPill, { status: branch.status }))),
    React.createElement("div", { className: "muted", style: { fontSize: 13 } },
      (owned ? "You" : owner.name) + " · " + (branch.preset || "setup in progress")),
    React.createElement("div", { className: "mono", style: { fontSize: 11, color: "var(--ink-3)", marginTop: 2 } }, fileLabel),
    React.createElement("div", { className: "bar" },
      segs.map(function (s, i) { return React.createElement("i", { key: i, style: { width: s[1] + "%", background: s[0] } }); })),
    React.createElement("div", { className: "figs" },
      React.createElement("span", null, "in ", React.createElement("b", null, (branch.rowsIn || 0).toLocaleString())),
      React.createElement("span", null, "out ", React.createElement("b", null, branch.rowsOut ? branch.rowsOut.toLocaleString() : "—")),
      React.createElement("span", null, "G ", React.createElement("b", null, branch.gMatches)),
      branch.status === "setup"
        ? React.createElement("span", { style: { marginLeft: "auto", color: "var(--ink-3)" } }, "resume setup →")
        : branch.status === "awaiting-review" && reviewN
          ? React.createElement("span", { style: { marginLeft: "auto", color: "var(--human-ink)", fontWeight: 600 } }, reviewN + " to review")
          : branch.status === "running"
            ? React.createElement("span", { style: { marginLeft: "auto", color: "var(--human-ink)" } }, "step " + branch.pipeline.step + "/7")
            : React.createElement("span", { style: { marginLeft: "auto" } }, pct ? pct + "% kept" : "")));
}
