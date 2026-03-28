import React, { useState, useMemo, useEffect } from "react";
import "./ApiSearch.css";

function ApiSearch() {
  const [activeEnv, setActiveEnv] = useState("UAT");
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    apiName: "",
    integrationNode: "",
    integrationServer: "",
    serverIP: "",
    state: "all"
  });
  const [loading, setLoading] = useState(true);
  const [downloadingApis, setDownloadingApis] = useState(new Set());
  const [expandedServers, setExpandedServers] = useState(new Set());

  // Track per-API action state: { "apiName-server": "starting" | "stopping" | null }
  const [serviceActionMap, setServiceActionMap] = useState({});

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // API endpoints for different environments
  const endpoints = {
    UAT: {
      search: "http://10.177.44.180:8443//UAT/duplicate/ApiSearch",
      refresh: "http://10.177.44.180:8443//UAT/duplicate/ApiUpdate",
    },
    SIT: {
      search: "http://10.177.44.180:8443//UAT/duplicate/ApiSearch/Sit",
      refresh: "http://10.177.44.180:8443//UAT/duplicate/ApiUpdate/Sit",
    },
    Preprod: {
      search: "http://10.177.44.180:8443//UAT/duplicate/ApiSearch/Preprod",
      refresh: "http://10.177.44.180:8443//UAT/duplicate/ApiUpdate/Preprod",
    },
  };

  // ─── Toast helpers ───────────────────────────────────────────────────────────
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // ─── Fetch data ───────────────────────────────────────────────────────────────
  const fetchData = async (url) => {
    setLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseText = await response.text();
      if (!responseText.trim()) throw new Error("Empty response received from server");

      let jsonData;
      try {
        const fixedResponseText = responseText.startsWith('[') ? responseText : `[${responseText}]`;
        jsonData = JSON.parse(fixedResponseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      if (!Array.isArray(jsonData)) {
        if (jsonData && typeof jsonData === 'object' && Array.isArray(jsonData.data)) {
          jsonData = jsonData.data;
        } else {
          throw new Error("Invalid response format: expected an array");
        }
      }

      const cleanedData = jsonData.map(item => ({
        ApiName: item.ApiName || 'Unknown',
        IntegrationNode: item.IntegrationNode || 'Unknown',
        IntegrationServer: item.IntegrationServer || 'Unknown',
        ServerIP: item.ServerIP || 'Unknown',
        ApiState: item.ApiState || 'unknown',
        DeployedDate: item.DeployedDate || null
      }));

      setData(cleanedData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Download BAR file ────────────────────────────────────────────────────────
  const downloadBarFile = async (apiName, integrationServer, integrationNode) => {
    const downloadUrl = `http://10.177.44.180:8443/${integrationNode}/apiv2/servers/${integrationServer}?application=${apiName}&referenced_app_domains=true&referenced_policy_projects=true&exclude_source=true&depth=4`;
    setDownloadingApis(prev => new Set(prev).add(`${apiName}-${integrationServer}`));
    try {
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/bar' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${apiName}.bar`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Failed to download BAR file for ${apiName}: ${error.message}`);
    } finally {
      setDownloadingApis(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${apiName}-${integrationServer}`);
        return newSet;
      });
    }
  };

  // ─── Start / Stop service ─────────────────────────────────────────────────────
  // FIX: Added response logging so you can see exactly what the server returns.
  //      The endpoint maps "start" -> "start" and anything else -> "teardown".
  const handleServiceAction = async (action, item) => {
    const key = `${item.ApiName}-${item.IntegrationServer}`;
    const actionLabel = action === "start" ? "Starting" : "Stopping";
    const doneLabel   = action === "start" ? "started"  : "stopped";

    // Mark in-progress
    setServiceActionMap(prev => ({ ...prev, [key]: action === "start" ? "starting" : "stopping" }));

    const endpoint = action === "start" ? "start" : "teardown";
    const url = `http://10.177.44.180:8443/ACCOUNT_EXP/apiv2/servers/${item.IntegrationServer}/rest-apis/${item.ApiName}/${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Log full server response so you can debug any issues
      const responseText = await response.text();
      console.log(`${actionLabel} response [${response.status}]:`, responseText);

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText} — ${responseText}`);

      // Optimistically update local state so badge flips immediately
      setData(prev =>
        prev.map(d =>
          d.ApiName === item.ApiName && d.IntegrationServer === item.IntegrationServer
            ? { ...d, ApiState: action === "start" ? "running" : "stopped" }
            : d
        )
      );

      addToast(`✅ ${item.ApiName} ${doneLabel} successfully`, "success");
    } catch (err) {
      console.error(`${actionLabel} failed:`, err);
      addToast(`❌ Failed to ${action} ${item.ApiName}: ${err.message}`, "error");
    } finally {
      setServiceActionMap(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  useEffect(() => {
    fetchData(endpoints[activeEnv].search);
  }, [activeEnv]);

  const handleRefresh = () => fetchData(endpoints[activeEnv].refresh);

  const isApiRunning = (apiState) => {
    if (!apiState || typeof apiState !== 'string') return false;
    return apiState.toLowerCase().includes('running');
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      if (filterName === "serverIP") {
        if (value && prev.integrationNode) {
          const filteredDataByIP = data.filter(item => item.ServerIP === value);
          const compatibleNodes = new Set(filteredDataByIP.map(item => item.IntegrationNode));
          if (!compatibleNodes.has(prev.integrationNode)) newFilters.integrationNode = "";
        }
        newFilters.integrationServer = "";
      }
      if (filterName === "integrationNode") {
        if (value && prev.integrationServer) {
          const filteredDataByNode = data.filter(item => item.IntegrationNode === value);
          const compatibleServers = new Set(filteredDataByNode.map(item => item.IntegrationServer));
          if (!compatibleServers.has(prev.integrationServer)) newFilters.integrationServer = "";
        } else if (!value) {
          newFilters.integrationServer = "";
        }
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({ apiName: "", integrationNode: "", integrationServer: "", serverIP: "", state: "all" });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesApiName = filters.apiName === "" || (item.ApiName && item.ApiName.toLowerCase().includes(filters.apiName.toLowerCase()));
      const matchesIntegrationNode = filters.integrationNode === "" || (item.IntegrationNode && item.IntegrationNode.toLowerCase().includes(filters.integrationNode.toLowerCase()));
      const matchesIntegrationServer = filters.integrationServer === "" || (item.IntegrationServer && item.IntegrationServer.toLowerCase().includes(filters.integrationServer.toLowerCase()));
      const matchesServerIP = filters.serverIP === "" || (item.ServerIP && item.ServerIP.includes(filters.serverIP));
      const matchesState = filters.state === "all" || (filters.state === "running" && isApiRunning(item.ApiState)) || (filters.state === "stopped" && !isApiRunning(item.ApiState));
      return matchesApiName && matchesIntegrationNode && matchesIntegrationServer && matchesServerIP && matchesState;
    });
  }, [data, filters]);

  const uniqueValues = useMemo(() => {
    let filteredDataForValues = data;
    if (filters.serverIP) filteredDataForValues = filteredDataForValues.filter(item => item.ServerIP === filters.serverIP);
    if (filters.serverIP && filters.integrationNode) filteredDataForValues = filteredDataForValues.filter(item => item.IntegrationNode === filters.integrationNode);

    const values = { integrationServers: new Set(), integrationNodes: new Set(), serverIPs: new Set(), apiNames: new Set() };
    filteredDataForValues.forEach(item => {
      if (item.IntegrationServer) values.integrationServers.add(item.IntegrationServer);
      if (item.IntegrationNode) values.integrationNodes.add(item.IntegrationNode);
      if (item.ServerIP) values.serverIPs.add(item.ServerIP);
      if (item.ApiName) values.apiNames.add(item.ApiName);
    });

    const allValues = { allIntegrationServers: new Set(), allIntegrationNodes: new Set(), allServerIPs: new Set() };
    data.forEach(item => {
      if (item.IntegrationServer) allValues.allIntegrationServers.add(item.IntegrationServer);
      if (item.IntegrationNode) allValues.allIntegrationNodes.add(item.IntegrationNode);
      if (item.ServerIP) allValues.allServerIPs.add(item.ServerIP);
    });

    return {
      integrationServers: Array.from(values.integrationServers).sort(),
      integrationNodes: Array.from(values.integrationNodes).sort(),
      serverIPs: Array.from(values.serverIPs).sort(),
      apiNames: Array.from(values.apiNames).sort(),
      allIntegrationServers: Array.from(allValues.allIntegrationServers).sort(),
      allIntegrationNodes: Array.from(allValues.allIntegrationNodes).sort(),
      allServerIPs: Array.from(allValues.allServerIPs).sort(),
    };
  }, [data, filters.serverIP, filters.integrationNode]);

  const groupedData = useMemo(() => {
    const groups = {};
    let dataToGroup = filteredData;
    if (filters.serverIP) dataToGroup = dataToGroup.filter(item => item.ServerIP === filters.serverIP);

    dataToGroup.forEach((item) => {
      const server = item.IntegrationServer || 'Unknown Server';
      if (!groups[server]) {
        groups[server] = { items: [], runningCount: 0, totalCount: 0, serverIP: item.ServerIP || 'Unknown', integrationNode: item.IntegrationNode || 'Unknown' };
      }
      groups[server].items.push(item);
      groups[server].totalCount++;
      if (isApiRunning(item.ApiState)) groups[server].runningCount++;
    });
    return groups;
  }, [filteredData, filters.serverIP]);

  const toggleServer = (serverName) => {
    setExpandedServers(prev => {
      const newSet = new Set(prev);
      newSet.has(serverName) ? newSet.delete(serverName) : newSet.add(serverName);
      return newSet;
    });
  };

  const toggleAllServers = () => {
    setExpandedServers(expandedServers.size === Object.keys(groupedData).length ? new Set() : new Set(Object.keys(groupedData)));
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key] !== "" && filters[key] !== "all");

  const handleEnvSwitch = (env) => {
    setActiveEnv(env);
    setData([]);
    clearFilters();
    setExpandedServers(new Set());
    setDownloadingApis(new Set());
    setServiceActionMap({});
  };

  const isDownloading = (apiName, integrationServer) => downloadingApis.has(`${apiName}-${integrationServer}`);
  const getServiceAction = (apiName, integrationServer) => serviceActionMap[`${apiName}-${integrationServer}`] || null;

  return (
    <div className="app-container">
      {/* ── Toast Container ── */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

      <header className="app-header">
        <h1>API Search</h1>
      </header>

      {/* Environment Tabs */}
      <div className="environment-tabs">
        {["UAT", "SIT", "Preprod"].map((env) => (
          <button
            key={env}
            className={`tab-button ${activeEnv === env ? "active" : ""}`}
            onClick={() => handleEnvSwitch(env)}
            disabled={loading && activeEnv === env}
          >
            {env}
            {loading && activeEnv === env && <span className="tab-spinner"></span>}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="controls-container">
        <div className="action-buttons">
          <button className="secondary-button" onClick={handleRefresh} disabled={loading || data.length === 0}>
            {loading ? (<><span className="spinner"></span> Refreshing...</>) : (<><span className="icon">🔄</span> Refresh Data</>)}
          </button>
        </div>
        <div className="environment-info">
          <span className="env-badge">{activeEnv} Environment</span>
          {loading && <span className="loading-text">Loading data...</span>}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner-large"></div>
          <h3>Loading {activeEnv} Data...</h3>
          <p>Please wait while we fetch the latest API information</p>
        </div>
      )}

      {/* Filters Section */}
      {!loading && (
        <div className="filters-section">
          <div className="filters-header">
            <h3>Filters</h3>
            <div className="filter-controls">
              {hasActiveFilters && (
                <span className="active-filters-badge">
                  {Object.values(filters).filter(val => val !== "" && val !== "all").length} active filters
                </span>
              )}
              <button className="clear-filters" onClick={clearFilters}>Clear All</button>
            </div>
          </div>

          <div className="filters-grid hierarchical-filters">
            <div className="filter-group primary-filter">
              <label>Server IP</label>
              <select value={filters.serverIP} onChange={(e) => handleFilterChange("serverIP", e.target.value)}>
                <option value="">All Server IPs</option>
                {uniqueValues.allServerIPs.map(ip => <option key={ip} value={ip}>{ip}</option>)}
              </select>
              <div className="filter-help">Select IP to filter available nodes</div>
            </div>

            <div className="filter-group secondary-filter">
              <label>Integration Node</label>
              <select value={filters.integrationNode} onChange={(e) => handleFilterChange("integrationNode", e.target.value)}>
                <option value="">All Integration Nodes</option>
                {uniqueValues.integrationNodes.map(node => <option key={node} value={node}>{node}</option>)}
              </select>
              {filters.serverIP && uniqueValues.integrationNodes.length === 0 && (
                <div className="filter-hint">No integration nodes available for selected IP</div>
              )}
            </div>

            <div className="filter-group tertiary-filter">
              <label>Integration Server</label>
              <select value={filters.integrationServer} onChange={(e) => handleFilterChange("integrationServer", e.target.value)}>
                <option value="">All Integration Servers</option>
                {uniqueValues.integrationServers.map(server => <option key={server} value={server}>{server}</option>)}
              </select>
              {(filters.serverIP || filters.integrationNode) && uniqueValues.integrationServers.length === 0 && (
                <div className="filter-hint">No integration servers available for selected filters</div>
              )}
            </div>

            <div className="filter-group">
              <label>API Name</label>
              <div className="search-input-wrapper">
                <input type="text" placeholder="Search API name..." value={filters.apiName} onChange={(e) => handleFilterChange("apiName", e.target.value)} />
                <span className="search-icon">🔍</span>
              </div>
            </div>

            <div className="filter-group">
              <label>API State</label>
              <select value={filters.state} onChange={(e) => handleFilterChange("state", e.target.value)}>
                <option value="all">All States</option>
                <option value="running">Running Only</option>
                <option value="stopped">Stopped Only</option>
              </select>
            </div>
          </div>

          <div className="filter-stats">
            <span className="results-count">
              Showing {filteredData.length} of {data.length} APIs
              {hasActiveFilters && " (filtered)"}
            </span>
            {filters.serverIP && (
              <span className="ip-filter-active">Filtered by IP: <strong>{filters.serverIP}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* Integration Servers Summary */}
      {!loading && Object.keys(groupedData).length > 0 && (
        <div className="servers-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Integration Servers</h2>
              <span className="server-count">{Object.keys(groupedData).length} servers</span>
            </div>
            <div className="section-actions">
              <button className="toggle-all" onClick={toggleAllServers}>
                {expandedServers.size === Object.keys(groupedData).length ? "Collapse All" : "Expand All"}
              </button>
            </div>
          </div>

          <div className="servers-grid">
            {Object.entries(groupedData).map(([serverName, serverData]) => (
              <div key={serverName} className="server-card">
                <div className="server-header" onClick={() => toggleServer(serverName)}>
                  <div className="server-info">
                    <h3>{serverName}</h3>
                    <div className="server-meta">
                      <span className="server-ip">IP: {serverData.serverIP}</span>
                      <span className="server-node">Node: {serverData.integrationNode}</span>
                    </div>
                    <div className="server-stats">
                      <span className="total">{serverData.totalCount} APIs</span>
                      <span className={`running ${serverData.runningCount === serverData.totalCount ? 'all-running' : ''}`}>
                        {serverData.runningCount} running
                      </span>
                      <span className="stopped">{serverData.totalCount - serverData.runningCount} stopped</span>
                    </div>
                  </div>
                  <div className="server-actions">
                    <span className={`expand-icon ${expandedServers.has(serverName) ? 'expanded' : ''}`}>▼</span>
                  </div>
                </div>

                {expandedServers.has(serverName) && (
                  <div className="server-content">
                    <div className="table-container">
                      <table className="server-table">
                        <thead>
                          <tr>
                            <th>API Name</th>
                            <th>Integration Node</th>
                            <th>Server IP</th>
                            <th>Deployment Date</th>
                            <th>State</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serverData.items.map((item, index) => {
                            const downloading = isDownloading(item.ApiName, item.IntegrationServer);
                            const serviceAction = getServiceAction(item.ApiName, item.IntegrationServer);
                            const running = isApiRunning(item.ApiState);
                            const isActionInProgress = !!serviceAction;

                            return (
                              <tr key={index}>
                                <td className="api-name">
                                  <div className="name">{item.ApiName}</div>
                                </td>
                                <td>{item.IntegrationNode}</td>
                                <td className="ip-address">{item.ServerIP}</td>
                                <td className="deployment-date">{formatDate(item.DeployedDate)}</td>
                                <td>
                                  <span className={`state-badge ${running ? "running" : "stopped"}`}>
                                    {running ? "● Running" : "● Stopped"}
                                  </span>
                                </td>

                                {/* ── Actions Column ── */}
                                <td>
                                  <div className="action-cell">
                                    {/* Download BAR */}
                                    <button
                                      className={`download-button ${downloading ? 'downloading' : ''}`}
                                      onClick={(e) => { e.stopPropagation(); downloadBarFile(item.ApiName, item.IntegrationServer, item.IntegrationNode); }}
                                      disabled={downloading}
                                      title="Download BAR file"
                                    >
                                      {downloading ? (<><span className="button-spinner"></span>Downloading...</>) : (<><span className="icon">⬇️</span>Download BAR</>)}
                                    </button>

                                    {/* ── Start Button — shown only when API is STOPPED ── */}
                                    {!running && (
                                      <button
                                        className={`service-btn start-btn ${serviceAction === "starting" ? "in-progress" : ""}`}
                                        onClick={(e) => { e.stopPropagation(); handleServiceAction("start", item); }}
                                        disabled={isActionInProgress}
                                        title={`Start ${item.ApiName}`}
                                      >
                                        {serviceAction === "starting" ? (
                                          <><span className="button-spinner"></span>Starting...</>
                                        ) : (
                                          <><span className="icon">▶</span>Start</>
                                        )}
                                      </button>
                                    )}

                                    {/* ── Stop Button — shown only when API is RUNNING ── */}
                                    {running && (
                                      <button
                                        className={`service-btn stop-btn ${serviceAction === "stopping" ? "in-progress" : ""}`}
                                        onClick={(e) => { e.stopPropagation(); handleServiceAction("stop", item); }}
                                        disabled={isActionInProgress}
                                        title={`Stop ${item.ApiName}`}
                                      >
                                        {serviceAction === "stopping" ? (
                                          <><span className="button-spinner"></span>Stopping...</>
                                        ) : (
                                          <><span className="icon">⏹</span>Stop</>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State - No Data */}
      {!loading && data.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Data Available</h3>
          <p>Unable to load data from the {activeEnv} environment. Please try refreshing.</p>
          <button className="primary-button" onClick={handleRefresh}>
            <span className="icon">🔄</span> Try Again
          </button>
        </div>
      )}

      {/* Empty State - No Results after Filtering */}
      {!loading && data.length > 0 && filteredData.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No APIs Match Your Filters</h3>
          <p>Try adjusting your filters to see more results</p>
          <button className="primary-button" onClick={clearFilters}>Clear Filters</button>
        </div>
      )}
    </div>
  );
}

export default ApiSearch