/* ============================================================
   Exports — full master / per-label / per-artist file generation
   ============================================================ */
import React, { useState } from "react";
import { Icon } from "../components/ui.jsx";
import { PageHead, outputColumns } from "./helpers.jsx";

export function Exports({ ctx }) {
  const b = ctx.activeBranch;
  const [view, setView] = useState("full");
  const ds = ctx.dataset(b.dataset);
  const cols = outputColumns(b);

  const FILES = {
    full: [{ n: b.name.replace(/\s+/g, "_") + "_master.xlsx", s: cols.length + " columns · " + (b.rowsOut != null ? b.rowsOut.toLocaleString() : "—") + " rows" }],
    label: [
      { n: "Label_MC_Audios_&_Videos.xlsx", s: "1,318 rows" },
      { n: "Label_Wings_Entertainment.xlsx", s: "483 rows" },
      { n: "Label_Wave_Music.xlsx", s: "415 rows" },
      { n: "Label_Sarthak_Music.xlsx", s: "257 rows" },
      { n: "… more label files", s: (ds.labels || 1) + " total" },
    ],
    artist: [
      { n: "Artist_Shweta_Mohan.xlsx", s: "14 records" },
      { n: "Artist_Shaan.xlsx", s: "2 records" },
      { n: "Artist_Sonu_Nigam.xlsx", s: "1 record" },
      { n: "Artist_Shankar_Mahadevan.xlsx", s: "1 record" },
      { n: "G_Artist_Close_Matches.xlsx", s: "fuzzy · manual check" },
    ],
  };
  const opts = [
    { id: "full", t: "Full master", d: "Everything, in your " + b.preset + " column set." },
    { id: "label", t: "Label view", d: "One file per unique label value." },
    { id: "artist", t: "Artist view", d: "Per-artist subsets matched to the G Artist list." },
  ];

  return React.createElement("div", { className: "page fade" },
    PageHead("Output · Step 7", "Exports", "Pick a view and G-Cleanser produces the files — primary key " + b.primaryKey + " first, formatted to your preset."),
    React.createElement("div", { className: "exp-grid", style: { marginBottom: 22 } },
      opts.map(function (o) {
        return React.createElement("button", { key: o.id, className: "exp-opt" + (view === o.id ? " sel" : ""), onClick: function () { setView(o.id); } },
          React.createElement("div", { className: "between" }, React.createElement("h4", null, o.t), view === o.id ? React.createElement(Icon, { name: "check", size: 16, style: { color: "var(--accent)" } }) : null),
          React.createElement("p", null, o.d));
      })),
    view === "full" ? React.createElement("div", { className: "card pad", style: { marginBottom: 16 } },
      React.createElement("div", { className: "sectitle" }, "Column order"),
      React.createElement("div", { className: "coltrack" },
        cols.map(function (c, i) { return React.createElement("span", { className: "c" + (i === 0 ? " pk" : ""), key: c }, c, i === 0 ? " ★" : ""); }))) : null,
    React.createElement("div", { className: "between", style: { marginBottom: 12 } },
      React.createElement("div", { className: "sectitle", style: { margin: 0 } }, FILES[view].length + " file" + (FILES[view].length > 1 ? "s" : "") + " to generate"),
      React.createElement("button", { className: "btn pri sm", onClick: function () { ctx.toast("Generated " + FILES[view].length + " " + view + " file(s)"); } },
        React.createElement(Icon, { name: "export", size: 14 }), "Generate & download")),
    React.createElement("div", { className: "card filelist" },
      FILES[view].map(function (f, i) {
        return React.createElement("div", { className: "fileitem", key: i },
          React.createElement(Icon, { name: "doc", size: 16, style: { color: "var(--ink-3)" } }),
          React.createElement("span", { className: "fn" }, f.n),
          React.createElement("span", { className: "sz" }, f.s),
          React.createElement("button", { className: "btn ghost sm", onClick: function () { ctx.toast("Downloaded " + f.n); } }, "Download"));
      })));
}
