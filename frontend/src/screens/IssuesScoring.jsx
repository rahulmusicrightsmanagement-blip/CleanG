/* ============================================================
   Issues & Scoring — confidence distribution + issue triage
   ============================================================ */
import React from "react";
import { Icon } from "../components/ui.jsx";
import { StatCard } from "./helpers.jsx";

export function IssuesScoring({ ctx }) {
  const buckets = [
    { l: "70–74", v: 22, lane: "drop" }, { l: "75–79", v: 41, lane: "drop" },
    { l: "80–84", v: 34, lane: "human" }, { l: "85–89", v: 58, lane: "human" },
    { l: "90–94", v: 47, lane: "human" }, { l: "95–99", v: 96, lane: "auto" },
    { l: "100", v: 187, lane: "auto" },
  ];
  const max = Math.max.apply(null, buckets.map(function (x) { return x.v; }));
  const laneColor = { drop: "var(--surface-3)", human: "var(--human)", auto: "var(--accent)" };
  const issueTypes = [
    { k: "Dup ISRC", v: 187, lane: "auto", icon: "dup" },
    { k: "Dup Track Name", v: 64, lane: "drop", icon: "table" },
    { k: "Similar Artist", v: 223, lane: "human", icon: "user" },
    { k: "Similar Lyric Writer", v: 178, lane: "human", icon: "user" },
    { k: "Similar Composer", v: 166, lane: "human", icon: "user" },
  ];

  return React.createElement("div", { className: "page fade" },
    React.createElement("div", { className: "page-head" },
      React.createElement("div", { className: "ey" }, "Routing · Step 5"),
      React.createElement("h1", null, "Issues & scoring"),
      React.createElement("div", { className: "sub" }, "Every flagged record gets a 0–100 confidence score. The score — not a guess — decides whether the engine resolves it or a person does.")),
    React.createElement("div", { className: "stats", style: { marginBottom: 26 } },
      StatCard("Auto-merged", "283", "≥ 95 confidence", "accent"),
      StatCard("Sent to review", "5", "80–94 + conflicts", "human"),
      StatCard("Dropped / flagged", "63", "< 80 · no action"),
      StatCard("Clean, no issue", "4,492", "straight to master")),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22, alignItems: "start" } },
      React.createElement("div", null,
        React.createElement("div", { className: "sectitle" }, "Confidence distribution"),
        React.createElement("div", { className: "histo", style: { marginBottom: 30 } },
          buckets.map(function (bk, i) {
            return React.createElement("div", { key: i, className: "bar", style: { height: bk.v / max * 100 + "%", background: laneColor[bk.lane] } },
              React.createElement("span", { className: "val" }, bk.v),
              React.createElement("span", { className: "lab" }, bk.l));
          })),
        React.createElement("div", { className: "row", style: { gap: 16, fontSize: 12.5, color: "var(--ink-3)", fontFamily: "var(--mono)" } },
          legendSwatch("var(--surface-3)", "< 80 dropped"),
          legendSwatch("var(--human)", "80–94 human"),
          legendSwatch("var(--accent)", "95–100 auto"))),
      React.createElement("div", null,
        React.createElement("div", { className: "sectitle" }, "Issues by type"),
        React.createElement("div", { className: "card" },
          issueTypes.map(function (it, i) {
            return React.createElement("div", { key: it.k, style: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i < issueTypes.length - 1 ? "1px solid var(--line)" : "none" } },
              React.createElement(Icon, { name: it.icon, size: 17, style: { color: "var(--ink-3)" } }),
              React.createElement("span", { style: { fontSize: 14 } }, it.k),
              React.createElement("span", { className: "mono", style: { marginLeft: "auto", fontWeight: 600 } }, it.v),
              React.createElement("span", { className: "tag " + (it.lane === "auto" ? "auto" : it.lane === "human" ? "human" : "") }, it.lane === "auto" ? "auto" : it.lane === "human" ? "review" : "flag"));
          })))));
}

function legendSwatch(c, l) {
  return React.createElement("span", { key: l, style: { display: "inline-flex", alignItems: "center", gap: 6 } },
    React.createElement("span", { style: { width: 11, height: 11, borderRadius: 3, background: c, border: "1px solid var(--line)" } }), l);
}
