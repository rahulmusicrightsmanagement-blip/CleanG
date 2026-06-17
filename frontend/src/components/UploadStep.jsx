import { useRef, useState } from "react";
import { getToken } from "../api/client.js";
import Icon from "./Icon.jsx";

const MAX_BYTES = 20 * 1024 * 1024; // keep in sync with the backend cap
const ACCEPT = [".xlsx", ".xlsm"];

function formatBytes(n) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export default function UploadStep({ branchId, existing, onUploaded }) {
  const inputRef = useRef(null);
  const xhrRef = useRef(null);
  // phase: "" | "uploading" | "processing"
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const busy = phase !== "";

  function validate(f) {
    const ok = ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) return "That's not an Excel file. Please choose a .xlsx or .xlsm file.";
    if (f.size > MAX_BYTES)
      return `That file is ${formatBytes(f.size)} — the limit is 20 MB.`;
    if (f.size === 0) return "That file is empty.";
    return "";
  }

  function upload(f) {
    if (!f || busy) return;
    // Instant client-side checks — no wasted round-trip on obviously bad files.
    const problem = validate(f);
    if (problem) {
      setError(problem);
      setFile(null);
      return;
    }

    setError("");
    setFile(f);
    setProgress(0);
    setLoaded(0);
    setPhase("uploading");

    const form = new FormData();
    form.append("file", f);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `/api/branches/${branchId}/files`);
    xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);

    // Real byte-for-byte upload progress.
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setLoaded(e.loaded);
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    // Bytes are up — the server is now validating + auto-mapping.
    xhr.upload.onload = () => {
      setProgress(100);
      setPhase("processing");
    };

    xhr.onload = () => {
      xhrRef.current = null;
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onUploaded(data);
        return;
      }
      const detail = data.detail;
      setError(
        typeof detail === "object" && detail?.message
          ? detail.message
          : detail || `Upload failed (${xhr.status})`
      );
      setPhase("");
    };
    xhr.onerror = () => {
      xhrRef.current = null;
      setError("Network error during upload. Please try again.");
      setPhase("");
    };
    xhr.onabort = () => {
      xhrRef.current = null;
      setPhase("");
      setProgress(0);
    };

    xhr.send(form);
  }

  function cancel(e) {
    e.stopPropagation();
    xhrRef.current?.abort();
  }

  function openPicker() {
    if (!busy) inputRef.current?.click();
  }

  return (
    <div>
      <h1>Upload input file</h1>
      <p className="muted">
        Upload the Excel file you want to clean. We check it for problems and map
        the columns for you before you continue.
      </p>

      {existing && !busy && (
        <div className="warn">
          <Icon name="alert" size={16} />
          This workspace already has <strong>&nbsp;{existing.original_name}</strong>.
          Uploading a new file replaces it and restarts the steps.
        </div>
      )}

      {error && (
        <div className="alert">
          <Icon name="alert" size={16} />
          {error}
        </div>
      )}

      <div
        className={`dropzone ${dragOver ? "over" : ""} ${busy ? "busy" : ""}`}
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-label="Upload an Excel file"
        aria-busy={busy}
        onDragOver={(e) => {
          if (busy) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files[0]);
        }}
        onClick={openPicker}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy) {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          hidden
          onChange={(e) => upload(e.target.files[0])}
        />
        {busy ? (
          <div className="dz-progress">
            <div className="dz-file">
              <span className="dz-file-ico">
                <Icon name="file" size={20} />
              </span>
              <div className="dz-file-meta">
                <strong>{file?.name}</strong>
                <span className="muted small">
                  {phase === "uploading"
                    ? `${formatBytes(loaded)} of ${formatBytes(file?.size || 0)}`
                    : "Reading headers and matching to the master format…"}
                </span>
              </div>
              {phase === "uploading" && (
                <button className="btn sm dz-cancel" onClick={cancel} type="button">
                  Cancel
                </button>
              )}
            </div>
            <p className="dz-title">
              {phase === "uploading" ? "Uploading…" : "Validating & auto-mapping…"}
            </p>
            <div className={`progress ${phase === "processing" ? "indeterminate" : ""}`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="muted small">
              {phase === "uploading"
                ? `${progress}%`
                : "Almost there — preparing your columns"}
            </p>
          </div>
        ) : (
          <>
            <div className="dz-icon">
              <Icon name="upload" size={26} />
            </div>
            <p className="dz-title">Drop your Excel file here, or click to browse</p>
            <p className="muted small">
              .xlsx / .xlsm · up to 20&nbsp;MB · we check it and map the columns for you
            </p>
          </>
        )}
      </div>

      <ul className="checklist">
        <li>
          <Icon name="check" size={15} /> File size up to 20 MB
        </li>
        <li>
          <Icon name="check" size={15} /> Opens as a valid .xlsx (not corrupted)
        </li>
        <li>
          <Icon name="check" size={15} /> Contains at least one data row
        </li>
        <li>
          <Icon name="check" size={15} /> No merged cells in the header row
        </li>
      </ul>
    </div>
  );
}
