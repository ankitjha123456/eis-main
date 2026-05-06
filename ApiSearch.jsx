import React, { useState, useEffect, useRef } from 'react';

const BASE_URL = 'http://10.177.44.180:8443/UAT/cachehit';

// ─── Inline styles ────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');

  :root {
    --bg:        #0a0c10;
    --surface:   #111318;
    --border:    #1e2230;
    --muted:     #2a2f40;
    --text:      #e8eaf0;
    --sub:       #5a6070;
    --success:   #00e5a0;
    --success-bg:#001f17;
    --error:     #ff4060;
    --error-bg:  #1f0010;
    --pending:   #4a90ff;
    --pending-bg:#0a1230;
    --accent:    #f0c060;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .ch-root {
    min-height: 100vh;
    background: var(--bg);
    font-family: 'Syne', sans-serif;
    color: var(--text);
    padding: 32px 24px 64px;
    position: relative;
    overflow-x: hidden;
  }

  /* animated grid bg */
  .ch-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 48px 48px;
    opacity: .35;
    pointer-events: none;
    z-index: 0;
  }

  .ch-inner { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; }

  /* ── Header ── */
  .ch-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .ch-title-block {}

  .ch-eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--sub);
    margin-bottom: 4px;
  }

  .ch-title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1;
  }

  .ch-title span { color: var(--accent); }

  .ch-controls { display: flex; gap: 10px; align-items: center; }

  .ch-btn {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 10px 20px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    border-radius: 4px;
    transition: all .2s;
    position: relative;
    overflow: hidden;
  }
  .ch-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--accent);
    opacity: 0;
    transition: opacity .2s;
  }
  .ch-btn:hover { border-color: var(--accent); color: var(--accent); }
  .ch-btn:disabled { opacity: .4; cursor: not-allowed; }
  .ch-btn.primary {
    background: var(--accent);
    color: #0a0c10;
    border-color: var(--accent);
    font-weight: 700;
  }
  .ch-btn.primary:hover { background: #f8d47a; }
  .ch-btn.primary:disabled { background: var(--muted); border-color: var(--muted); color: var(--sub); }

  /* ── Progress bar ── */
  .ch-progress-wrap {
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .ch-progress-bar {
    flex: 1;
    height: 3px;
    background: var(--muted);
    border-radius: 2px;
    overflow: hidden;
  }
  .ch-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--success), var(--accent));
    border-radius: 2px;
    transition: width .4s ease;
  }
  .ch-progress-label {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--sub);
    min-width: 80px;
    text-align: right;
  }

  /* ── Stats row ── */
  .ch-stats {
    display: flex;
    gap: 24px;
    margin-bottom: 32px;
    flex-wrap: wrap;
  }
  .ch-stat {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
  }
  .ch-stat-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  .ch-stat-dot.success { background: var(--success); }
  .ch-stat-dot.error   { background: var(--error); }
  .ch-stat-dot.pending { background: var(--pending); }
  .ch-stat-dot.idle    { background: var(--muted); animation: none; }

  @keyframes pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: .5; transform: scale(1.3); }
  }

  /* ── Grid ── */
  .ch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  /* ── Card ── */
  .ch-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px 18px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: border-color .25s, transform .25s, box-shadow .25s;
    animation: cardAppear .4s ease both;
  }
  .ch-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
  }

  @keyframes cardAppear {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* card state colours */
  .ch-card.success {
    border-color: var(--success);
    background: linear-gradient(135deg, var(--success-bg) 0%, var(--surface) 100%);
    animation: successReveal .5s cubic-bezier(.22,1,.36,1) both;
  }
  .ch-card.error {
    border-color: var(--error);
    background: linear-gradient(135deg, var(--error-bg) 0%, var(--surface) 100%);
  }
  .ch-card.loading {
    border-color: var(--pending);
    cursor: default;
  }
  .ch-card.idle { border-color: var(--border); }

  @keyframes successReveal {
    0%   { opacity: 0; transform: scale(.95) translateY(6px); box-shadow: 0 0 0 0 var(--success); }
    60%  { box-shadow: 0 0 0 8px rgba(0,229,160,.12); }
    100% { opacity: 1; transform: scale(1) translateY(0); box-shadow: 0 0 0 0 rgba(0,229,160,0); }
  }

  /* shimmer for skeleton */
  .ch-card.skeleton {
    cursor: default;
    pointer-events: none;
  }
  .ch-skeleton-line {
    height: 10px;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--muted) 25%, var(--border) 50%, var(--muted) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    margin-bottom: 8px;
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* card glow sweep on success */
  .ch-card.success::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0,229,160,.08), transparent);
    animation: glowSweep .6s ease forwards;
  }
  @keyframes glowSweep {
    to { left: 150%; }
  }

  /* ── Card internals ── */
  .ch-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .ch-card-icon {
    width: 32px; height: 32px;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .ch-card-icon.success { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }
  .ch-card-icon.error   { background: var(--error-bg);   color: var(--error);   border: 1px solid var(--error); }
  .ch-card-icon.loading { background: var(--pending-bg); color: var(--pending); border: 1px solid var(--pending); }
  .ch-card-icon.idle    { background: var(--muted);      color: var(--sub);     border: 1px solid var(--border); }

  .ch-refresh-btn {
    width: 28px; height: 28px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--sub);
    cursor: pointer;
    font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    transition: all .2s;
    flex-shrink: 0;
  }
  .ch-refresh-btn:hover { border-color: var(--accent); color: var(--accent); }
  .ch-refresh-btn:disabled { opacity: .3; cursor: not-allowed; }
  .ch-refresh-btn.spinning { animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .ch-card-ip {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 6px;
    letter-spacing: .5px;
  }

  .ch-card-response {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 3px;
    display: inline-block;
    margin-bottom: 8px;
  }
  .ch-card-response.success { background: var(--success-bg); color: var(--success); }
  .ch-card-response.error   { background: var(--error-bg);   color: var(--error); }
  .ch-card-response.loading { background: var(--pending-bg); color: var(--pending); }
  .ch-card-response.idle    { background: var(--muted);      color: var(--sub); }

  .ch-card-time {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: var(--sub);
  }

  /* ── Mini spinner ── */
  .mini-spin {
    width: 14px; height: 14px;
    border: 2px solid var(--pending-bg);
    border-top-color: var(--pending);
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }

  /* ── Error / loading states ── */
  .ch-full-center {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    text-align: center;
  }
  .ch-big-spinner {
    width: 48px; height: 48px;
    border: 3px solid var(--muted);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  .ch-error-box {
    border: 1px solid var(--error);
    background: var(--error-bg);
    border-radius: 8px;
    padding: 20px 28px;
    color: var(--error);
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    max-width: 480px;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatus = (server) => {
  if (!server._loaded) return 'idle';
  if (server._loading) return 'loading';
  return server.CACHE_RESPONSE === 'CACHE HIT SUCCESS' ? 'success' : 'error';
};

const StatusIcon = ({ status }) => {
  if (status === 'loading') return <div className="mini-spin" />;
  if (status === 'success') return '✓';
  if (status === 'error')   return '✗';
  return '—';
};

// ─── Component ────────────────────────────────────────────────────────────────
const CacheHitUAT = () => {
  const [servers, setServers]         = useState([]);
  const [initialLoading, setInitial]  = useState(true);
  const [globalError, setGlobalError] = useState(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const abortRef = useRef(null);

  // ── initial fetch: get server list ──────────────────────────────────────────
  const fetchServerList = async () => {
    setInitial(true);
    setGlobalError(null);
    try {
      const res = await fetch(BASE_URL + '/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // mark all as "loaded but stale" so cards show immediately
      setServers(data.map(s => ({ ...s, _loaded: true, _loading: false })));
    } catch (e) {
      setGlobalError('Could not reach the cache server. Please try again.');
    } finally {
      setInitial(false);
    }
  };

  useEffect(() => { fetchServerList(); }, []);

  // ── single server refresh ────────────────────────────────────────────────────
  const refreshOne = async (serverIp) => {
    const num = serverIp.split('.').pop();
    setServers(prev => prev.map(s =>
      s.server === serverIp ? { ...s, _loading: true } : s
    ));
    try {
      const res = await fetch(`http://10.177.44.180:8443/UAT/cachehit1/${num}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setServers(prev => prev.map(s =>
        s.server === serverIp
          ? { ...s, ...data, _loaded: true, _loading: false, _ts: Date.now() }
          : s
      ));
    } catch {
      setServers(prev => prev.map(s =>
        s.server === serverIp
          ? { ...s, CACHE_RESPONSE: 'ERROR', _loaded: true, _loading: false, _ts: Date.now() }
          : s
      ));
    }
  };

  // ── bulk sequential refresh (one-by-one with reveal animation) ───────────────
  const runAllSequential = async () => {
    if (bulkRunning) return;
    setBulkRunning(true);

    // reset all to "pending" state
    setServers(prev => prev.map(s => ({
      ...s,
      _loading: false,
      _loaded: false,
      CACHE_RESPONSE: undefined,
      _ts: undefined,
    })));

    for (let i = 0; i < servers.length; i++) {
      const serverIp = servers[i].server;
      const num = serverIp.split('.').pop();

      // mark this one as loading
      setServers(prev => prev.map(s =>
        s.server === serverIp ? { ...s, _loading: true } : s
      ));

      try {
        const res = await fetch(`http://10.177.44.180:8443/UAT/cachehit1/${num}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setServers(prev => prev.map(s =>
          s.server === serverIp
            ? { ...s, ...data, _loaded: true, _loading: false, _ts: Date.now() }
            : s
        ));
      } catch {
        setServers(prev => prev.map(s =>
          s.server === serverIp
            ? { ...s, CACHE_RESPONSE: 'ERROR', _loaded: true, _loading: false, _ts: Date.now() }
            : s
        ));
      }

      // small delay so each reveal is visible
      await new Promise(r => setTimeout(r, 120));
    }

    setBulkRunning(false);
  };

  // ── derived stats ─────────────────────────────────────────────────────────
  const loaded  = servers.filter(s => s._loaded && !s._loading);
  const success = loaded.filter(s => s.CACHE_RESPONSE === 'CACHE HIT SUCCESS').length;
  const failed  = loaded.filter(s => s.CACHE_RESPONSE !== 'CACHE HIT SUCCESS').length;
  const pending = servers.filter(s => s._loading).length;
  const total   = servers.length;
  const progress = total ? Math.round((loaded.length / total) * 100) : 0;

  // ── render ────────────────────────────────────────────────────────────────
  if (initialLoading) return (
    <div className="ch-root">
      <style>{styles}</style>
      <div className="ch-inner">
        <div className="ch-full-center">
          <div className="ch-big-spinner" />
          <p style={{ fontFamily: "'Space Mono', monospace", color: 'var(--sub)', fontSize: 12 }}>
            LOADING SERVERS…
          </p>
        </div>
      </div>
    </div>
  );

  if (globalError) return (
    <div className="ch-root">
      <style>{styles}</style>
      <div className="ch-inner">
        <div className="ch-full-center">
          <div className="ch-error-box">{globalError}</div>
          <button className="ch-btn primary" onClick={fetchServerList}>Retry</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ch-root">
      <style>{styles}</style>
      <div className="ch-inner">

        {/* Header */}
        <div className="ch-header">
          <div className="ch-title-block">
            <div className="ch-eyebrow">UAT Environment</div>
            <div className="ch-title">Cache <span>Hit</span> Status</div>
          </div>
          <div className="ch-controls">
            <button className="ch-btn" onClick={fetchServerList} disabled={bulkRunning}>
              Reset
            </button>
            <button
              className="ch-btn primary"
              onClick={runAllSequential}
              disabled={bulkRunning}
            >
              {bulkRunning ? 'Running…' : 'Run All Cache Hit'}
            </button>
          </div>
        </div>

        {/* Progress */}
        {bulkRunning || loaded.length > 0 ? (
          <div className="ch-progress-wrap">
            <div className="ch-progress-bar">
              <div className="ch-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="ch-progress-label">{loaded.length}/{total} done</div>
          </div>
        ) : null}

        {/* Stats */}
        <div className="ch-stats">
          <div className="ch-stat">
            <div className="ch-stat-dot success" />
            <span style={{ color: 'var(--success)' }}>{success} Success</span>
          </div>
          <div className="ch-stat">
            <div className="ch-stat-dot error" />
            <span style={{ color: 'var(--error)' }}>{failed} Failed</span>
          </div>
          {pending > 0 && (
            <div className="ch-stat">
              <div className="ch-stat-dot pending" />
              <span style={{ color: 'var(--pending)' }}>{pending} Running</span>
            </div>
          )}
          <div className="ch-stat">
            <div className="ch-stat-dot idle" />
            <span style={{ color: 'var(--sub)' }}>{total} Total</span>
          </div>
        </div>

        {/* Grid */}
        <div className="ch-grid">
          {servers.map((server, idx) => {
            const status = getStatus(server);
            return (
              <div
                key={server.server}
                className={`ch-card ${status}`}
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={() => !bulkRunning && status !== 'loading' && refreshOne(server.server)}
              >
                <div className="ch-card-top">
                  <div className={`ch-card-icon ${status}`}>
                    <StatusIcon status={status} />
                  </div>
                  <button
                    className={`ch-refresh-btn ${status === 'loading' ? 'spinning' : ''}`}
                    onClick={e => { e.stopPropagation(); refreshOne(server.server); }}
                    disabled={status === 'loading' || bulkRunning}
                  >
                    ↻
                  </button>
                </div>

                <div className="ch-card-ip">{server.server}</div>

                <div className={`ch-card-response ${status}`}>
                  {status === 'idle'    && 'PENDING'}
                  {status === 'loading' && 'CHECKING…'}
                  {status === 'success' && 'HIT SUCCESS'}
                  {status === 'error'   && (server.CACHE_RESPONSE || 'FAILED')}
                </div>

                {server._ts && (
                  <div className="ch-card-time">
                    {new Date(server._ts).toLocaleTimeString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default CacheHitUAT;
