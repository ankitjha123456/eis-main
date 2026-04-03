import { useState, useRef } from "react";

const BACKEND = "http://10.177.44.58:4423";

export default function Connection() {
  const [ip, setIp]       = useState("");
  const [port, setPort]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const resultRef = useRef(null);

  async function handleCheck() {
    if (!ip.trim() || !port.trim()) {
      setError("Please enter both IP address and Port.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: ip.trim(), port: port.trim() }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Server error");

      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(
        e.message.includes("Failed to fetch")
          ? `Cannot reach backend at ${BACKEND}. Make sure the server is running.`
          : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleCheck();
  }

  function handleReset() {
    setIp("");
    setPort("");
    setResult(null);
    setError("");
  }

  return (
    <div style={styles.page}>
      <style>{css}</style>

      {/* Background grid */}
      <div style={styles.grid} />

      {/* Header */}
      <div className="fade-up" style={styles.header}>
        <div style={styles.pill}>Network Diagnostic Tool</div>
        <h1 style={styles.title}>
          Connection <span style={styles.accent}>Checker</span>
        </h1>
        <p style={styles.subtitle}>
          Check TCP connectivity using <code style={styles.code}>nc -vz</code> from server&nbsp;
          <span style={styles.serverTag}>10.177.44.58</span>
        </p>
      </div>

      {/* Card */}
      <div className="fade-up delay-1" style={styles.card}>

        {/* Inputs Row */}
        <div style={styles.inputRow}>

          {/* IP Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>⌖</span> Target IP / Host
            </label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="192.168.1.100"
              style={styles.input}
              className="inp"
              spellCheck={false}
            />
          </div>

          {/* Port Input */}
          <div style={{ ...styles.inputGroup, flex: "0 0 140px" }}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>◈</span> Port
            </label>
            <input
              type="number"
              value={port}
              onChange={e => setPort(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="443"
              min={1}
              max={65535}
              style={styles.input}
              className="inp"
            />
          </div>
        </div>

        {/* Quick port buttons */}
        <div style={styles.quickRow}>
          <span style={styles.quickLabel}>Quick ports:</span>
          {[22, 80, 443, 3306, 5432, 6379, 8080, 27017].map(p => (
            <button
              key={p}
              onClick={() => setPort(String(p))}
              style={{
                ...styles.quickBtn,
                ...(port === String(p) ? styles.quickBtnActive : {}),
              }}
              className="qbtn"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠</span> {error}
          </div>
        )}

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button
            onClick={handleCheck}
            disabled={loading}
            style={styles.checkBtn}
            className="check-btn"
          >
            {loading ? (
              <><span className="spinner" /> Checking…</>
            ) : (
              <><span style={{ fontSize: 16 }}>⚡</span> Check Connection</>
            )}
          </button>

          {result && (
            <button onClick={handleReset} style={styles.resetBtn} className="reset-btn">
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="fade-up" ref={resultRef} style={styles.resultCard}>

          {/* Status Banner */}
          <div style={{
            ...styles.statusBanner,
            background: result.success
              ? "linear-gradient(135deg, #052e16, #064e3b)"
              : "linear-gradient(135deg, #1c0a0a, #2d1515)",
            borderColor: result.success ? "#16a34a" : "#dc2626",
          }}>
            <div style={styles.statusLeft}>
              <div style={{
                ...styles.statusDot,
                background: result.success ? "#4ade80" : "#f87171",
                boxShadow: `0 0 12px ${result.success ? "#4ade80" : "#f87171"}`,
              }} className="dot-pulse" />
              <div>
                <div style={{
                  ...styles.statusText,
                  color: result.success ? "#4ade80" : "#f87171",
                }}>
                  {result.success ? "PORT OPEN" : "PORT CLOSED / UNREACHABLE"}
                </div>
                <div style={styles.statusSub}>
                  {result.source_ip || "10.177.44.58"} → {result.target_ip || result.ip}:{result.port}
                </div>
              </div>
            </div>
            <div style={styles.timestamp}>
              {new Date(result.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* Data Rows */}
          <div style={styles.dataGrid}>
            <DataRow label="Source IP" value={result.source_ip || "10.177.44.58"} />
            <DataRow label="Target IP" value={result.target_ip || result.ip} />
            <DataRow label="Port" value={result.port} />
            <DataRow label="Status" value={result.success ? "✅ Open" : "❌ Closed"} />
          </div>

          {/* Command */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Command Executed</div>
            <div style={styles.commandBox}>
              <span style={styles.prompt}>$</span>
              <span style={styles.commandText}>{result.command}</span>
            </div>
          </div>

          {/* Output */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Output</div>
            <div style={{
              ...styles.outputBox,
              borderColor: result.success ? "#16a34a50" : "#dc262650",
              color: result.success ? "#86efac" : "#fca5a5",
            }}>
              {result.output || "No output received"}
            </div>
          </div>

          {/* Raw JSON toggle */}
          <details style={styles.details}>
            <summary style={styles.summary}>View Raw JSON Response</summary>
            <pre style={styles.json}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div style={styles.dataRow}>
      <span style={styles.dataLabel}>{label}</span>
      <span style={styles.dataValue}>{value}</span>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "#04080f",
    color: "#cbd5e1",
    fontFamily: "'IBM Plex Mono', monospace",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "52px 16px 80px",
    position: "relative",
    overflow: "hidden",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
    zIndex: 0,
  },
  header: {
    textAlign: "center",
    marginBottom: 40,
    maxWidth: 580,
    position: "relative",
    zIndex: 1,
  },
  pill: {
    display: "inline-block",
    background: "#0c1a2e",
    border: "1px solid #0e7490",
    color: "#22d3ee",
    fontSize: 11,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    padding: "4px 14px",
    borderRadius: 999,
    marginBottom: 16,
    fontWeight: 600,
  },
  title: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "clamp(28px, 5vw, 44px)",
    fontWeight: 700,
    color: "#f1f5f9",
    margin: "0 0 12px",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
  },
  accent: {
    color: "#22d3ee",
  },
  subtitle: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.7,
    margin: 0,
  },
  code: {
    background: "#0f172a",
    color: "#7dd3fc",
    padding: "1px 7px",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  serverTag: {
    color: "#22d3ee",
    fontWeight: 700,
  },
  card: {
    width: "100%",
    maxWidth: 620,
    background: "#070e1a",
    border: "1px solid #0f2744",
    borderRadius: 16,
    padding: "28px 28px 24px",
    boxShadow: "0 0 60px #06b6d410, 0 24px 80px #00000080",
    position: "relative",
    zIndex: 1,
  },
  inputRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
  },
  inputGroup: {
    flex: 1,
    minWidth: 160,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 11,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#334155",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  labelIcon: {
    color: "#22d3ee",
    fontSize: 14,
  },
  input: {
    width: "100%",
    background: "#030810",
    border: "1px solid #0f2744",
    borderRadius: 8,
    padding: "13px 16px",
    color: "#e2e8f0",
    fontSize: 15,
    fontFamily: "'IBM Plex Mono', monospace",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
    letterSpacing: "0.02em",
  },
  quickRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    marginTop: 16,
  },
  quickLabel: {
    fontSize: 10,
    color: "#334155",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginRight: 4,
  },
  quickBtn: {
    background: "#0a1628",
    border: "1px solid #0f2744",
    color: "#475569",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "all 0.15s",
  },
  quickBtnActive: {
    background: "#0c2a4a",
    border: "1px solid #0e7490",
    color: "#22d3ee",
  },
  errorBox: {
    marginTop: 14,
    background: "#0f0505",
    border: "1px solid #7f1d1d",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#fca5a5",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  errorIcon: { fontSize: 16 },
  btnRow: {
    display: "flex",
    gap: 12,
    marginTop: 20,
  },
  checkBtn: {
    flex: 1,
    background: "linear-gradient(135deg, #0e4f6b, #0891b2)",
    border: "1px solid #0e7490",
    borderRadius: 10,
    padding: "14px",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.04em",
    transition: "all 0.2s",
  },
  resetBtn: {
    background: "#0a1628",
    border: "1px solid #0f2744",
    borderRadius: 10,
    padding: "14px 20px",
    color: "#475569",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "all 0.15s",
  },
  resultCard: {
    width: "100%",
    maxWidth: 620,
    marginTop: 20,
    background: "#070e1a",
    border: "1px solid #0f2744",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 24px 80px #00000060",
    position: "relative",
    zIndex: 1,
  },
  statusBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 24px",
    borderBottom: "1px solid",
    flexWrap: "wrap",
    gap: 12,
  },
  statusLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusText: {
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: "0.1em",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  statusSub: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  timestamp: {
    fontSize: 11,
    color: "#334155",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  dataGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 0,
    borderBottom: "1px solid #0f2744",
  },
  dataRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "14px 24px",
    borderBottom: "1px solid #0a1628",
    borderRight: "1px solid #0a1628",
  },
  dataLabel: {
    fontSize: 10,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#334155",
    fontWeight: 700,
  },
  dataValue: {
    fontSize: 14,
    color: "#94a3b8",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  section: {
    padding: "18px 24px 0",
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#334155",
    fontWeight: 700,
    marginBottom: 10,
  },
  commandBox: {
    background: "#030810",
    border: "1px solid #0f2744",
    borderRadius: 8,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  prompt: {
    color: "#0e7490",
    fontWeight: 700,
    fontSize: 15,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  commandText: {
    color: "#fbbf24",
    fontSize: 13,
    fontFamily: "'IBM Plex Mono', monospace",
    wordBreak: "break-all",
  },
  outputBox: {
    background: "#030810",
    border: "1px solid",
    borderRadius: 8,
    padding: "14px 16px",
    fontSize: 13,
    fontFamily: "'IBM Plex Mono', monospace",
    whiteSpace: "pre-wrap",
    lineHeight: 1.8,
    minHeight: 56,
    wordBreak: "break-all",
  },
  details: {
    margin: "18px 24px 20px",
    borderRadius: 8,
    overflow: "hidden",
  },
  summary: {
    fontSize: 11,
    color: "#334155",
    cursor: "pointer",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: 700,
    padding: "6px 0",
    userSelect: "none",
  },
  json: {
    background: "#030810",
    border: "1px solid #0f2744",
    borderRadius: 8,
    padding: "14px 16px",
    fontSize: 11,
    color: "#475569",
    fontFamily: "'IBM Plex Mono', monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    marginTop: 8,
    lineHeight: 1.8,
    overflow: "auto",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .inp:focus {
    border-color: #0e7490 !important;
    box-shadow: 0 0 0 3px #0e749018 !important;
  }
  .inp::placeholder { color: #1e3a5f; }

  .check-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #155e75, #0ea5e9) !important;
    box-shadow: 0 0 24px #06b6d430;
    transform: translateY(-1px);
  }
  .check-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .check-btn:active:not(:disabled) { transform: translateY(0); }

  .reset-btn:hover { color: #94a3b8 !important; border-color: #1e3a5f !important; }

  .qbtn:hover {
    background: #0c2a4a !important;
    border-color: #0e7490 !important;
    color: #22d3ee !important;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }

  .fade-up  { animation: fadeUp 0.4s ease forwards; }
  .delay-1  { animation-delay: 0.1s; opacity: 0; }

  .spinner {
    display: inline-block;
    width: 15px; height: 15px;
    border: 2px solid #ffffff30;
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .dot-pulse { animation: pulse 1.8s ease-in-out infinite; }

  details summary::-webkit-details-marker { display: none; }
  details summary::before { content: '▸ '; }
  details[open] summary::before { content: '▾ '; }
`;