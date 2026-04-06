

import { useState, useEffect, useRef } from "react";
import "./Connection.css";

const BACKEND = "http://10.177.44.58:4423";

function DataRow({ label, value }) {
  return (
    <div className="data-row">
      <span className="data-label">{label}</span>
      <span className="data-value">{value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function Connection() {
  const [sources, setSources]     = useState([]);           // source server list from /sources
  const [sourceIp, setSourceIp]   = useState("");           // selected source server IP
  const [targetIp, setTargetIp]   = useState("");           // target IP typed by user
  const [port, setPort]           = useState("");           // port typed by user
  const [loading, setLoading]     = useState(false);        // button loading state
  const [result, setResult]       = useState(null);         // response from /check
  const [error, setError]         = useState("");           // error message
  const [sourcesError, setSourcesError] = useState("");     
  const resultRef = useRef(null);

  const QUICK_PORTS = [22, 80, 443, 5001, 9001, 8523, 8524, 3001];


  useEffect(() => {
    fetch(`${BACKEND}/sources`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load sources");
        return res.json();
      })
      .then(data => {
        setSources(data);
        if (data.length > 0) setSourceIp(data[0].ip); // default to first server
      })
      .catch(() => {
        setSourcesError(`Cannot reach backend at ${BACKEND}. Is server running?`);
      });
  }, []);

  // ── Handle Check button click ─────────────────────────────
  async function handleCheck() {
    if (!sourceIp) {
      setError("Please select a source server.");
      return;
    }
    if (!targetIp.trim()) {
      setError("Please enter a target IP or hostname.");
      return;
    }
    if (!port.trim()) {
      setError("Please enter a port number.");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND}/check`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_ip: sourceIp,          // where nc runs FROM (via SSH)
          target_ip: targetIp.trim(),   // where nc checks TO
          port:      port.trim(),       // port to check
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      setResult(data);
      // Scroll to result after render
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    } catch (e) {
      setError(
        e.message.includes("Failed to fetch")
          ? `Cannot reach backend at ${BACKEND}. Make sure server is running.`
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
    setTargetIp("");
    setPort("");
    setResult(null);
    setError("");
  }

  // Find label for selected source
  const selectedSource = sources.find(s => s.ip === sourceIp);

  return (
    <div className="page">
      <div className="bg-grid" />

      {/* ── Header ── */}
      <div className="header fade-up">
        {/* <div className="pill">Multi-Source Network Diagnostic</div> */}
        <h1 className="title">
          Connection <span className="accent">Checker</span>
        </h1>
      </div>

      {/* ── Input Card ── */}
      <div className="card fade-up delay-1">

        {/* Source server load error */}
        {sourcesError && (
          <div className="error-box" style={{ marginBottom: 16 }}>
            <span className="error-icon">⚠</span> {sourcesError}
          </div>
        )}

        {/* Source Server Dropdown */}
        <div className="input-group" style={{ marginBottom: 16 }}>
          <label className="label">
            <span className="label-icon">⌖</span> Source Server (nc runs FROM here)
          </label>
          <select
            value={sourceIp}
            onChange={e => setSourceIp(e.target.value)}
            className="inp inp--select"
          >
            {sources.length === 0 && (
              <option value="">Loading servers…</option>
            )}
            {sources.map(srv => (
              <option key={srv.ip} value={srv.ip}>
                {srv.label}  —  {srv.ip}
              </option>
            ))}
          </select>
          {/* Hint showing SSH flow */}
          {/* {selectedSource && (
            <div className="source-hint">
              {sourceIp === "10.177.44.58"
                ? `▶  nc will run directly on ${sourceIp} (no SSH needed)`
                : `▶  10.177.44.58  →  SSH  →  ${sourceIp}  →  nc -vz`
              }
            </div>
          )} */}
        </div>

        {/* Target IP + Port row */}
        <div className="input-row">
          <div className="input-group input-group--grow">
            <label className="label">
              <span className="label-icon">◈</span> Target IP / Host (nc checks TO here)
            </label>
            <input
              type="text"
              value={targetIp}
              onChange={e => setTargetIp(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="192.168.1.100"
              className="inp"
              spellCheck={false}
            />
          </div>

          <div className="input-group input-group--port">
            <label className="label">
              <span className="label-icon">◉</span> Port
            </label>
            <input
              type="number"
              value={port}
              onChange={e => setPort(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="443"
              min={1}
              max={65535}
              className="inp"
            />
          </div>
        </div>

        {/* Quick Ports */}
        <div className="quick-row">
          <span className="quick-label">Quick ports:</span>
          {QUICK_PORTS.map(p => (
            <button
              key={p}
              onClick={() => setPort(String(p))}
              className={`qbtn${port === String(p) ? " qbtn--active" : ""}`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Validation Error */}
        {error && (
          <div className="error-box">
            <span className="error-icon">⚠</span> {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="btn-row">
          <button
            onClick={handleCheck}
            disabled={loading || sources.length === 0}
            className="check-btn"
          >
            {loading
              ? <><span className="spinner" /> Checking…</>
              : <><span className="btn-icon">⚡</span> Check Connection</>
            }
          </button>
          {result && (
            <button onClick={handleReset} className="reset-btn">↺ Reset</button>
          )}
        </div>
      </div>

      {/* ── Result Card — appears after check ── */}
      {result && (
        <div className="result-card fade-up" ref={resultRef}>

          {/* Status Banner */}
          <div className={`status-banner ${result.success ? "status-banner--open" : "status-banner--closed"}`}>
            <div className="status-left">
              <div className={`status-dot dot-pulse ${result.success ? "status-dot--open" : "status-dot--closed"}`} />
              <div>
                <div className={`status-text ${result.success ? "status-text--open" : "status-text--closed"}`}>
                  {result.success ? "PORT OPEN" : "PORT CLOSED / UNREACHABLE"}
                </div>
                <div className="status-sub">
                  {result.source_ip} → {result.target_ip}:{result.port}
                </div>
              </div>
            </div>
            <div className="timestamp">
              {new Date(result.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* Data Grid */}
          {/* <div className="data-grid">
            <DataRow label="Source IP (nc ran from)" value={result.source_ip} />
            <DataRow label="Target IP (checked to)"  value={result.target_ip} />
            <DataRow label="Port"                     value={result.port} />
            <DataRow label="Status"                   value={result.success ? "✅ Open" : "❌ Closed"} />
          </div> */}

          {/* Command */}
          {/* <div className="section">
            <div className="section-label">Command Executed on {result.source_ip}</div>
            <div className="command-box">
              <span className="prompt">$</span>
              <span className="command-text">{result.command}</span>
            </div>
          </div> */}

          {/* Output */}
          <div className="section section--last">
            <div className="section-label">Raw Output</div>
            <div className={`output-box ${result.success ? "output-box--open" : "output-box--closed"}`}>
              {result.output || "No output received"}
            </div>
          </div>

          {/* Raw JSON toggle */}
          {/* <details className="details">
            <summary className="summary">View Raw JSON Response</summary>
            <pre className="json-pre">{JSON.stringify(result, null, 2)}</pre>
          </details> */}

        </div>
      )}
    </div>
  );
}
