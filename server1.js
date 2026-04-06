import { useState, useRef } from "react";
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

export default function Connection() {
  const [ip, setIp]           = useState("");
  const [port, setPort]       = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const resultRef             = useRef(null);

  const QUICK_PORTS = [22, 80, 443, 3306, 5432, 6379, 8080, 27017];

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
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ip: ip.trim(), port: port.trim() }),
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
    <div className="page">

      {/* Background grid */}
      <div className="bg-grid" />

      {/* Header */}
      <div className="header fade-up">
        <div className="pill">Network Diagnostic Tool</div>
        <h1 className="title">
          Connection <span className="accent">Checker</span>
        </h1>
        <p className="subtitle">
          Check TCP connectivity using{" "}
          <code className="inline-code">nc -vz</code> from server{" "}
          <span className="server-tag">10.177.44.58</span>
        </p>
      </div>

      {/* Input Card */}
      <div className="card fade-up delay-1">

        {/* IP + Port Row */}
        <div className="input-row">
          <div className="input-group input-group--grow">
            <label className="label">
              <span className="label-icon">⌖</span> Target IP / Host
            </label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="192.168.1.100"
              className="inp"
              spellCheck={false}
            />
          </div>

          <div className="input-group input-group--port">
            <label className="label">
              <span className="label-icon">◈</span> Port
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

        {/* Error */}
        {error && (
          <div className="error-box">
            <span className="error-icon">⚠</span> {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="btn-row">
          <button
            onClick={handleCheck}
            disabled={loading}
            className="check-btn"
          >
            {loading ? (
              <><span className="spinner" /> Checking…</>
            ) : (
              <><span className="btn-icon">⚡</span> Check Connection</>
            )}
          </button>

          {result && (
            <button onClick={handleReset} className="reset-btn">
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Result Card — only shown after check */}
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
                  {result.source_ip || "10.177.44.58"} → {result.target_ip || result.ip}:{result.port}
                </div>
              </div>
            </div>
            <div className="timestamp">
              {new Date(result.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* Data Grid */}
          <div className="data-grid">
            <DataRow label="Source IP"  value={result.source_ip || "10.177.44.58"} />
            <DataRow label="Target IP"  value={result.target_ip || result.ip} />
            <DataRow label="Port"       value={result.port} />
            <DataRow label="Status"     value={result.success ? "✅ Open" : "❌ Closed"} />
          </div>

          {/* Command */}
          <div className="section">
            <div className="section-label">Command Executed</div>
            <div className="command-box">
              <span className="prompt">$</span>
              <span className="command-text">{result.command}</span>
            </div>
          </div>

          {/* Output */}
          <div className="section section--last">
            <div className="section-label">Output</div>
            <div className={`output-box ${result.success ? "output-box--open" : "output-box--closed"}`}>
              {result.output || "No output received"}
            </div>
          </div>

          {/* Raw JSON */}
          <details className="details">
            <summary className="summary">View Raw JSON Response</summary>
            <pre className="json-pre">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>

        </div>
      )}
    </div>
  );
}
