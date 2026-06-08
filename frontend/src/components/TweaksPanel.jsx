/* ============================================================
   Tweaks panel — accent / density / heading controls.
   Floating panel toggled by a gear button (bottom-right).
   ============================================================ */
import React, { useState, useRef, useCallback, useEffect } from "react";

const __TWEAKS_STYLE = `
  .twk-fab{position:fixed;right:16px;bottom:16px;z-index:2147483645;width:42px;height:42px;
    display:grid;place-items:center;border-radius:50%;border:1px solid var(--line-2);
    background:var(--surface);color:var(--ink-2);box-shadow:var(--shadow);transition:all .14s}
  .twk-fab:hover{color:var(--ink);border-color:var(--accent-line)}
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:var(--surface);color:var(--ink);
    border:1px solid var(--line);border-radius:14px;
    box-shadow:var(--shadow-lg);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none;border-bottom:1px solid var(--line)}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:var(--ink-3);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
  .twk-x:hover{background:var(--surface-2);color:var(--ink)}
  .twk-body{padding:8px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:var(--ink-2)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:var(--ink-3);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}
  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:28px;padding:0 8px;
    border:1px solid var(--line-2);border-radius:7px;background:var(--surface);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:var(--accent)}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;background:var(--surface-3);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;background:var(--surface);
    box-shadow:var(--shadow-sm);transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;background:transparent;
    color:inherit;font:inherit;font-weight:500;min-height:24px;border-radius:6px;cursor:pointer;padding:4px 6px;line-height:1.2}
  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;padding:0;border:0;border-radius:8px;
    overflow:hidden;cursor:pointer;box-shadow:0 0 0 1px var(--line-2);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);box-shadow:0 0 0 1px var(--ink-3),var(--shadow)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 2px var(--ink)}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:14px;height:14px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

const TWK_STORE = "gcleanser_tweaks_v1";
export function useTweaks(defaults) {
  const [values, setValues] = useState(function () {
    try {
      const raw = localStorage.getItem(TWK_STORE);
      if (raw) return Object.assign({}, defaults, JSON.parse(raw));
    } catch (e) {}
    return defaults;
  });
  const setTweak = useCallback(function (keyOrEdits, val) {
    const edits = typeof keyOrEdits === "object" && keyOrEdits !== null ? keyOrEdits : { [keyOrEdits]: val };
    setValues(function (prev) {
      const next = Object.assign({}, prev, edits);
      try { localStorage.setItem(TWK_STORE, JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);
  return [values, setTweak];
}

export function TweaksPanel({ title = "Tweaks", children }) {
  const [open, setOpen] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = useCallback(function () {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + "px";
    panel.style.bottom = offsetRef.current.y + "px";
  }, []);

  useEffect(function () {
    if (!open) return;
    clampToViewport();
    window.addEventListener("resize", clampToViewport);
    return function () { window.removeEventListener("resize", clampToViewport); };
  }, [open, clampToViewport]);

  const onDragStart = function (e) {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = function (ev) {
      offsetRef.current = { x: startRight - (ev.clientX - sx), y: startBottom - (ev.clientY - sy) };
      clampToViewport();
    };
    const up = function () {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return React.createElement(React.Fragment, null,
    React.createElement("style", null, __TWEAKS_STYLE),
    !open
      ? React.createElement("button", { className: "twk-fab", "aria-label": "Open tweaks", title: "Tweaks", onClick: function () { setOpen(true); } },
          React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" },
            React.createElement("circle", { cx: 12, cy: 12, r: 3 }),
            React.createElement("path", { d: "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" })))
      : React.createElement("div", { ref: dragRef, className: "twk-panel", style: { right: offsetRef.current.x, bottom: offsetRef.current.y } },
          React.createElement("div", { className: "twk-hd", onMouseDown: onDragStart },
            React.createElement("b", null, title),
            React.createElement("button", { className: "twk-x", "aria-label": "Close tweaks", onMouseDown: function (e) { e.stopPropagation(); }, onClick: function () { setOpen(false); } }, "✕")),
          React.createElement("div", { className: "twk-body" }, children))
  );
}

export function TweakSection({ label, children }) {
  return React.createElement(React.Fragment, null,
    React.createElement("div", { className: "twk-sect" }, label), children);
}

export function TweakRow({ label, value, children }) {
  return React.createElement("div", { className: "twk-row" },
    React.createElement("div", { className: "twk-lbl" },
      React.createElement("span", null, label),
      value != null ? React.createElement("span", { className: "twk-val" }, value) : null),
    children);
}

export function TweakRadio({ label, value, options, onChange }) {
  const opts = options.map(function (o) { return typeof o === "object" ? o : { value: o, label: o }; });
  const idx = Math.max(0, opts.findIndex(function (o) { return o.value === value; }));
  const n = opts.length;
  return React.createElement(TweakRow, { label },
    React.createElement("div", { className: "twk-seg", role: "radiogroup" },
      React.createElement("div", { className: "twk-seg-thumb", style: { left: `calc(2px + ${idx} * (100% - 4px) / ${n})`, width: `calc((100% - 4px) / ${n})` } }),
      opts.map(function (o) {
        return React.createElement("button", { key: o.value, type: "button", role: "radio", "aria-checked": o.value === value, onClick: function () { onChange(o.value); } }, o.label);
      })));
}

export function TweakSelect({ label, value, options, onChange }) {
  return React.createElement(TweakRow, { label },
    React.createElement("select", { className: "twk-field", value, onChange: function (e) { onChange(e.target.value); } },
      options.map(function (o) {
        const v = typeof o === "object" ? o.value : o;
        const l = typeof o === "object" ? o.label : o;
        return React.createElement("option", { key: v, value: v }, l);
      })));
}

function TwkCheck() {
  return React.createElement("svg", { viewBox: "0 0 14 14", "aria-hidden": true },
    React.createElement("path", { d: "M3 7.2 5.8 10 11 4.2", fill: "none", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", stroke: "#fff" }));
}

export function TweakColor({ label, value, options, onChange }) {
  const key = function (o) { return String(JSON.stringify(o)).toLowerCase(); };
  const cur = key(value);
  return React.createElement(TweakRow, { label },
    React.createElement("div", { className: "twk-chips", role: "radiogroup" },
      options.map(function (o, i) {
        const colors = Array.isArray(o) ? o : [o];
        const hero = colors[0];
        const on = key(o) === cur;
        return React.createElement("button", {
          key: i, type: "button", className: "twk-chip", role: "radio",
          "aria-checked": on, "data-on": on ? "1" : "0",
          "aria-label": colors.join(", "), title: colors.join(" · "),
          style: { background: hero }, onClick: function () { onChange(o); },
        }, on ? React.createElement(TwkCheck, null) : null);
      })));
}
