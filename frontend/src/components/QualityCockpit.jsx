import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";

// Colour a status (0 ok, 1 fixed, 2 error) using the app's theme variables.
const STATUS_COLOR = ["var(--green)", "var(--amber)", "var(--red)"];

function gradeColor(score) {
  if (score >= 90) return "var(--green)";
  if (score >= 75) return "var(--blue)";
  if (score >= 60) return "var(--amber)";
  return "var(--red)";
}

// Count up to `target` so the score "lands" with a little life.
function useCountUp(target, ms = 700) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

/**
 * The dataset heatmap: one pixel per (downsampled) row, painted green/amber/red.
 * Drawn to a <canvas> so a ribbon of thousands of rows stays crisp and cheap.
 */
function Heatmap({ strip, scale }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !strip.length) return;
    const dpr = window.devicePixelRatio || 1;
    const cols = strip.length;
    const cw = canvas.clientWidth;
    const cellW = Math.max(2, Math.floor(cw / cols));
    const rows = Math.ceil((cols * cellW) / cw) || 1;
    const perRow = Math.ceil(cols / rows);
    const ch = rows * 14;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.height = `${ch}px`;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);
    const styles = getComputedStyle(document.documentElement);
    const resolve = (v) =>
      styles.getPropertyValue(v.replace("var(", "").replace(")", "")).trim();
    const colors = STATUS_COLOR.map(resolve);
    strip.forEach((s, i) => {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      ctx.fillStyle = colors[s] || colors[0];
      ctx.fillRect(c * cellW, r * 14, cellW - 1, 11);
    });
  }, [strip]);

  function onMove(e) {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cw = canvas.clientWidth;
    const cols = strip.length;
    const cellW = Math.max(2, Math.floor(cw / cols));
    const perRow = Math.ceil(cols / Math.ceil((cols * cellW) / cw || 1));
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / cellW);
    const r = Math.floor(y / 14);
    const idx = r * perRow + c;
    if (idx < 0 || idx >= strip.length) return setHover(null);
    const from = idx * scale + 1;
    const to = Math.min(from + scale - 1, strip.length * scale);
    const label = scale > 1 ? `rows ${from}–${to}` : `row ${from}`;
    const status = ["clean", "auto-fixed", "needs review"][strip[idx]];
    setHover({ label, status, x: e.clientX - rect.left });
  }

  return (
    <div className="heatmap-wrap" onMouseLeave={() => setHover(null)}>
      <canvas ref={ref} className="heatmap" onMouseMove={onMove} />
      {hover && (
        <div className="heatmap-tip" style={{ left: hover.x }}>
          <strong>{hover.label}</strong> · {hover.status}
        </div>
      )}
    </div>
  );
}

export default function QualityCockpit({ profile, onPickColumn }) {
  const score = useCountUp(profile.score);
  const gColor = gradeColor(profile.score);

  // SVG ring geometry for the score gauge.
  const R = 52;
  const C = 2 * Math.PI * R;
  const dash = (profile.score / 100) * C;

  const worstColumns = useMemo(
    () =>
      [...profile.columns]
        .map((c) => ({ ...c, bad: c.errors }))
        .sort((a, b) => b.bad - a.bad || a.completeness - b.completeness),
    [profile.columns]
  );

  return (
    <div className="cockpit">
      {/* Score gauge */}
      <div className="cockpit-gauge">
        <svg viewBox="0 0 120 120" className="gauge">
          <circle cx="60" cy="60" r={R} className="gauge-track" />
          <circle
            cx="60"
            cy="60"
            r={R}
            className="gauge-fill"
            stroke={gColor}
            strokeDasharray={`${dash} ${C}`}
          />
          <text x="60" y="56" className="gauge-score" fill={gColor}>
            {score}
          </text>
          <text x="60" y="78" className="gauge-grade" fill={gColor}>
            {profile.grade}
          </text>
        </svg>
        <div className="cockpit-gauge-label">
          <strong>Data quality score</strong>
          <span className="muted small">
            {profile.clean_rows} of {profile.total_rows} rows fully clean
          </span>
        </div>
      </div>

      {/* Cell breakdown */}
      <div className="cockpit-stats">
        <div className="qstat">
          <span className="qdot" style={{ background: "var(--green)" }} />
          <b>{profile.clean_cells.toLocaleString()}</b>
          <span className="muted small">clean cells</span>
        </div>
        <div className="qstat">
          <span className="qdot" style={{ background: "var(--amber)" }} />
          <b>{profile.fixed_cells.toLocaleString()}</b>
          <span className="muted small">auto-fixed</span>
        </div>
        <div className="qstat">
          <span className="qdot" style={{ background: "var(--red)" }} />
          <b>{profile.error_cells.toLocaleString()}</b>
          <span className="muted small">need review</span>
        </div>
        <div className="qstat">
          <span className="qdot" style={{ background: "var(--blue)" }} />
          <b>{(profile.normalized_cells ?? 0).toLocaleString()}</b>
          <span className="muted small">tidied</span>
        </div>
        <div className="qstat">
          <span className="qdot" style={{ background: "var(--border-strong)" }} />
          <b>{profile.blank_cells.toLocaleString()}</b>
          <span className="muted small">blank</span>
        </div>
      </div>

      {/* Dataset heatmap ribbon */}
      <div className="cockpit-heatmap">
        <div className="cockpit-sub">
          <Icon name="table" size={14} />
          <span>
            Dataset health map · every pixel is {profile.strip_scale > 1
              ? `${profile.strip_scale} rows`
              : "one row"}
          </span>
          <span className="heatmap-legend">
            <i style={{ background: "var(--green)" }} /> clean
            <i style={{ background: "var(--amber)" }} /> fixed
            <i style={{ background: "var(--red)" }} /> error
          </span>
        </div>
        <Heatmap strip={profile.row_strip} scale={profile.strip_scale} />
      </div>

      {/* Per-column health */}
      <div className="cockpit-cols">
        <div className="cockpit-sub">
          <Icon name="search" size={14} />
          <span>Column health</span>
        </div>
        <div className="col-health">
          {worstColumns.map((c) => {
            const pct = Math.round(c.completeness * 100);
            return (
              <button
                key={c.name}
                className="col-row"
                onClick={() => c.errors > 0 && onPickColumn?.(c)}
                title={
                  c.top_values.length
                    ? "Top values: " +
                      c.top_values.map(([v, n]) => `${v} (${n})`).join(", ")
                    : ""
                }
              >
                <span className="col-name">{c.name}</span>
                <span className="col-bar">
                  <span
                    className="col-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background:
                        c.errors > 0 ? "var(--amber)" : "var(--green)",
                    }}
                  />
                </span>
                <span className="col-meta muted small">
                  {pct}% filled · {c.distinct.toLocaleString()} distinct
                  {c.errors > 0 && (
                    <b className="col-err"> · {c.errors} flagged</b>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
