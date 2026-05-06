import React, { useState, useEffect, useRef } from 'react';
import './CacheHit.css';

const BASE_URL = 'http://10.177.44.180:8443/UAT/cachehit';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatus = (server) => {
  if (server._loading) return 'loading';
  if (!server._loaded) return 'idle';
  return server.CACHE_RESPONSE === 'CACHE HIT SUCCESS' ? 'success' : 'error';
};

const StatusIcon = ({ status }) => {
  if (status === 'loading') return <div className="mini-spinner" />;
  if (status === 'success') return '✓';
  if (status === 'error')   return '✗';
  return '—';
};

// ─── Component ────────────────────────────────────────────────────────────────
const CacheHitUAT = () => {
  const [servers, setServers]        = useState([]);
  const [initialLoading, setInitial] = useState(true);
  const [globalError, setGlobalError]= useState(null);
  const [bulkRunning, setBulkRunning]= useState(false);

  // ── Fetch server list on mount ───────────────────────────────────────────────
  const fetchServerList = async () => {
    setInitial(true);
    setGlobalError(null);
    try {
      const res = await fetch(BASE_URL + '/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // show all cards immediately; mark as loaded-but-stale
      setServers(data.map(s => ({ ...s, _loaded: true, _loading: false })));
    } catch (e) {
      setGlobalError('Could not reach the cache server. Please try again.');
    } finally {
      setInitial(false);
    }
  };

  useEffect(() => { fetchServerList(); }, []);

  // ── Single server refresh ────────────────────────────────────────────────────
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

  // ── Bulk sequential refresh (one-by-one reveal) ──────────────────────────────
  const runAllSequential = async () => {
    if (bulkRunning) return;
    setBulkRunning(true);

    // reset all cards to pending
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

      // mark current as loading
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

      // small delay so each card reveal is visible
      await new Promise(r => setTimeout(r, 120));
    }

    setBulkRunning(false);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const loaded   = servers.filter(s => s._loaded && !s._loading);
  const success  = loaded.filter(s => s.CACHE_RESPONSE === 'CACHE HIT SUCCESS').length;
  const failed   = loaded.filter(s => s.CACHE_RESPONSE !== 'CACHE HIT SUCCESS').length;
  const pending  = servers.filter(s => s._loading).length;
  const total    = servers.length;
  const progress = total ? Math.round((loaded.length / total) * 100) : 0;

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="cache-hit-container">
        <div className="cache-hit-inner">
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading cache servers data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────────
  if (globalError) {
    return (
      <div className="cache-hit-container">
        <div className="cache-hit-inner">
          <div className="error-message">
            <p>{globalError}</p>
            <button className="btn-refresh primary" onClick={fetchServerList}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="cache-hit-container">
      <div className="cache-hit-inner">

        {/* Header */}
        <div className="cache-hit-header">
          <div className="cache-hit-title-block">
            <div className="cache-hit-eyebrow">UAT Environment</div>
            <h2>Cache <span>Hit</span> Status</h2>
          </div>
          <div className="cache-hit-controls">
            <button
              className="btn-refresh"
              onClick={fetchServerList}
              disabled={bulkRunning}
            >
              Reset
            </button>
            <button
              className="btn-refresh primary"
              onClick={runAllSequential}
              disabled={bulkRunning}
            >
              {bulkRunning ? 'Running…' : 'Run All Cache Hit'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {(bulkRunning || loaded.length > 0) && (
          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-label">{loaded.length}/{total} done</div>
          </div>
        )}

        {/* Stats */}
        <div className="cache-stats">
          <div className="cache-stat">
            <div className="stat-dot success" />
            <span style={{ color: 'var(--success)' }}>{success} Success</span>
          </div>
          <div className="cache-stat">
            <div className="stat-dot error" />
            <span style={{ color: 'var(--error)' }}>{failed} Failed</span>
          </div>
          {pending > 0 && (
            <div className="cache-stat">
              <div className="stat-dot pending" />
              <span style={{ color: 'var(--pending)' }}>{pending} Running</span>
            </div>
          )}
          <div className="cache-stat">
            <div className="stat-dot idle" />
            <span style={{ color: 'var(--sub)' }}>{total} Total</span>
          </div>
        </div>

        {/* Server Cards Grid */}
        <div className="servers-grid1">
          {servers.map((server, idx) => {
            const status = getStatus(server);
            return (
              <div
                key={server.server}
                className={`server-card1 ${status}`}
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={() => !bulkRunning && status !== 'loading' && refreshOne(server.server)}
              >
                {/* Top row: icon + refresh button */}
                <div className="server-card-top">
                  <div className="server-status">
                    <span className={`status-icon ${status}`}>
                      <StatusIcon status={status} />
                    </span>
                  </div>
                  <div className="server-action">
                    <button
                      className={`btn-single-refresh ${status === 'loading' ? 'spinning' : ''}`}
                      onClick={e => { e.stopPropagation(); refreshOne(server.server); }}
                      disabled={status === 'loading' || bulkRunning}
                    >
                      ↻
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="server-content">
                  <div className="server-ip">{server.server}</div>
                  <div className={`server-response ${status}`}>
                    {status === 'idle'    && 'PENDING'}
                    {status === 'loading' && 'CHECKING…'}
                    {status === 'success' && 'HIT SUCCESS'}
                    {status === 'error'   && (server.CACHE_RESPONSE || 'FAILED')}
                  </div>
                  {server._ts && (
                    <div className="server-updated">
                      Updated: {new Date(server._ts).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default CacheHitUAT;
