import { useState, useRef } from "react";
import "./Connection.css";

const BACKEND = "http://10.177.44.58:4423";

export default function Connection() {
  const [sourceIp, setSourceIp] = useState("");
  const [targetIp, setTargetIp] = useState("");
  const [port, setPort]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState("");
  const resultRef               = useRef(null);

  const QUICK_PORTS = [22, 80, 443, 5001, 9001, 8523, 8524, 3001];

  async function handleCheck() {
    if (!sourceIp.trim()) {
      setError("Please enter the Source IP.");
      return;
    }
    if (!targetIp.trim()) {
      setError("Please enter the Target IP.");
      return;
    }
    if (!port.trim()) {
      setError("Please enter the Port.");
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
          source_ip: sourceIp.trim(),
          target_ip: targetIp.trim(),
          port:      port.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      setResult(data);
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
    setSourceIp("");
    setTargetIp("");
    setPort("");
    setResult(null);
    setError("");
  }

  return (
    <div className="page">
      <div className="bg-grid" />

      {/* Header */}
      <div className="header fade-up">
        <h1 className="title">
          Connection <span className="accent">Checker</span>
        </h1>
      </div>

      {/* Input Card */}
      <div className="card fade-up delay-1">

        {/* Source IP + Target IP row */}
        <div className="input-row">

          {/* Source IP */}
          <div className="input-group input-group--grow">
            <label className="label">
              <span className="label-icon">⌖</span> Source IP (nc runs FROM here)
            </label>
            <input
              type="text"
              value={sourceIp}
              onChange={e => setSourceIp(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="10.177.44.51"
              className="inp"
              spellCheck={false}
            />
          </div>

          {/* Target IP */}
          <div className="input-group input-group--grow">
            <label className="label">
              <span className="label-icon">◈</span> Target IP (nc checks TO here)
            </label>
            <input
              type="text"
              value={targetIp}
              onChange={e => setTargetIp(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="10.177.44.67"
              className="inp"
              spellCheck={false}
            />
          </div>

          {/* Port */}
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

        {/* SSH hint */}
        {sourceIp.trim() && (
          <div className="source-hint">
            {sourceIp.trim() === "10.177.44.58"
              ? `▶  nc will run directly on ${sourceIp} (no SSH needed)`
              : `▶  10.177.44.58  →  SSH  →  ${sourceIp}  →  nc -vz  →  ${targetIp || "target"}:${port || "port"}`
            }
          </div>
        )}

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

        {/* Buttons */}
        <div className="btn-row">
          <button
            onClick={handleCheck}
            disabled={loading}
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

      {/* Result Card */}
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

          {/* Output */}
          <div className="section section--last">
            <div className="section-label">Raw Output</div>
            <div className={`output-box ${result.success ? "output-box--open" : "output-box--closed"}`}>
              {result.output || "No output received"}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}