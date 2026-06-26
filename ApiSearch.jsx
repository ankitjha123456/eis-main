import { useState, useRef } from "react";
import "./Certificate.css";

const API_URL = "http://10.177.44.58:4423/deploy";

const ENV_RANGES = {
  UAT: "10.177.44.60 – 10.177.44.67",
  SIT: "10.177.44.34 – 10.177.44.41",
};

const CERT_PATHS = {
  RSAkeystore: "/opt/IBM/RSAkeystore",
  Endpoint: "/opt/IBM/EndPoint_Public",
};

export default function Certificate() {
  const [file, setFile]           = useState(null);
  const [environment, setEnv]     = useState("");
  const [certPath, setCertPath]   = useState("");
  const [dragging, setDragging]   = useState(false);
  const [status, setStatus]       = useState("idle"); // idle | deploying | done | error
  const [results, setResults]     = useState(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const inputRef = useRef();

  const handleFile = (f) => {
    setFile(f);
    setResults(null);
    setErrorMsg("");
    setStatus("idle");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const canDeploy = file && environment && certPath && status !== "deploying";

  const handleDeploy = async () => {
    if (!canDeploy) return;
    setStatus("deploying");
    setResults(null);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("certificate", file);
    formData.append("environment", environment);
    formData.append("certPath", certPath);

    try {
      const res  = await fetch(API_URL, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Deployment failed.");
        return;
      }

      setResults(data);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg("Cannot reach server: " + err.message);
    }
  };

  const reset = () => {
    setFile(null);
    setEnv("");
    setCertPath("");
    setStatus("idle");
    setResults(null);
    setErrorMsg("");
  };

  return (
    <div className="cert-page">
      <div className="cert-container">

        {/* ── Header ── */}
        <div className="cert-header">
          <div className="cert-header-icon">🔐</div>
          <div>
            <h1 className="cert-title">Certificate Deployment</h1>
            <p className="cert-subtitle">Deploy SSL certificates to UAT or SIT servers</p>
          </div>
        </div>

        {/* ── Main card ── */}
        <div className="cert-card">

          {/* ── Step 1: Environment ── */}
          <div className="cert-section">
            <div className="cert-step-label">
              <span className="cert-step-num">01</span>
              Select Environment
            </div>
            <div className="cert-env-grid">
              {Object.entries(ENV_RANGES).map(([env, range]) => (
                <button
                  key={env}
                  className={`cert-env-btn ${environment === env ? "active" : ""}`}
                  onClick={() => setEnv(env)}
                >
                  <span className="cert-env-name">{env}</span>
                  <span className="cert-env-range">{range}</span>
                  <span className="cert-env-count">8 servers</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Step 2: Certificate Path ── */}
          <div className="cert-section">
            <div className="cert-step-label">
              <span className="cert-step-num">02</span>
              Select Certificate Path
            </div>
            <div className="cert-path-grid">
              {Object.entries(CERT_PATHS).map(([key, val]) => (
                <button
                  key={key}
                  className={`cert-path-btn ${certPath === key ? "active" : ""}`}
                  onClick={() => setCertPath(key)}
                >
                  <span className="cert-path-name">{key}</span>
                  <span className="cert-path-val">{val}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Step 3: Drop Zone ── */}
          <div className="cert-section">
            <div className="cert-step-label">
              <span className="cert-step-num">03</span>
              Upload Certificate File
            </div>
            <div
              className={`cert-dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
              onClick={() => inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="cert-file-info">
                  <span className="cert-file-icon">📄</span>
                  <div>
                    <div className="cert-file-name">{file.name}</div>
                    <div className="cert-file-size">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button className="cert-file-clear" onClick={(e) => { e.stopPropagation(); setFile(null); setResults(null); }}>✕</button>
                </div>
              ) : (
                <div className="cert-drop-prompt">
                  <span className="cert-drop-icon">📂</span>
                  <div className="cert-drop-text">Drop certificate file here</div>
                  <div className="cert-drop-hint">or click to browse — .cer .crt .pem .key</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Deploy Summary ── */}
          {environment && certPath && file && (
            <div className="cert-summary-bar">
              <span>📋</span>
              <span>
                <b>{file.name}</b> → <b>{environment}</b> (8 servers) → <b>{CERT_PATHS[certPath]}</b>
              </span>
            </div>
          )}

          {/* ── Deploy Button ── */}
          <button
            className={`cert-deploy-btn ${!canDeploy ? "disabled" : ""} ${status === "deploying" ? "deploying" : ""}`}
            onClick={handleDeploy}
            disabled={!canDeploy}
          >
            {status === "deploying" ? (
              <><span className="cert-spinner" />  Deploying to 8 servers...</>
            ) : (
              "🚀  Deploy Certificate"
            )}
          </button>

          {/* ── Error ── */}
          {status === "error" && (
            <div className="cert-alert error">❌ {errorMsg}</div>
          )}
        </div>

        {/* ── Results ── */}
        {results && (
          <div className="cert-results-card">
            <div className="cert-results-header">
              <div>
                <h2 className="cert-results-title">Deployment Results</h2>
                <p className="cert-results-meta">
                  {results.environment} · {results.fileName} · {results.certPath}
                </p>
              </div>
              <div className="cert-summary-pills">
                <span className="pill success">{results.summary.success} succeeded</span>
                {results.summary.failed > 0 && (
                  <span className="pill failed">{results.summary.failed} failed</span>
                )}
              </div>
            </div>

            <div className="cert-results-table">
              <div className="cert-table-head">
                <span>Server IP</span>
                <span>Status</span>
                <span>Backup Created</span>
                <span>Error</span>
              </div>
              {results.results.map((r) => (
                <div key={r.ip} className={`cert-table-row ${r.status}`}>
                  <span className="cert-ip">{r.ip}</span>
                  <span className={`cert-status-badge ${r.status}`}>
                    {r.status === "success" ? "✅ Success" : "❌ Failed"}
                  </span>
                  <span className="cert-backup">
                    {r.backup ? (
                      <span className="cert-backup-name" title={r.backup}>
                        📦 {r.backup.split("/").pop()}
                      </span>
                    ) : (
                      <span className="cert-no-backup">—</span>
                    )}
                  </span>
                  <span className="cert-error-msg">
                    {r.error || "—"}
                  </span>
                </div>
              ))}
            </div>

            <div className="cert-results-footer">
              <button className="cert-reset-btn" onClick={reset}>
                ↩ Deploy Another Certificate
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
