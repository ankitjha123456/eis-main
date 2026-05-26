`http://10.177.44.180:8443/${brokerPath}/servers/${integrationServer}?tab=contents&q=${apiName}`
this is the url when i click on api its redirect on this url on another tab

ApiSearch.jsx: 

import React, { useState, useMemo, useEffect } from "react";
import "./ApiSearch.css";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "EISUAT@1801";

const getLastOctet = (ip) => {
  if (!ip || typeof ip !== "string") return "";
  const parts = ip.split(".");
  return parts[parts.length - 1];
};

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
  const [downloadingValidations, setDownloadingValidations] = useState(new Set());
  const [expandedServers, setExpandedServers] = useState(new Set());
  const [serviceActionMap, setServiceActionMap] = useState({});
  const [toasts, setToasts] = useState([]);

  const [modal, setModal] = useState({
    open: false,
    action: null,
    item: null,
    username: "",
    password: "",
    showPassword: false,
    error: ""
  });

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

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

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

  const downloadBarFile = async (apiName, integrationServer, integrationNode, serverIP) => {
    const lastOctet = getLastOctet(serverIP);
    const brokerPath = `${integrationNode}${lastOctet}`;
    
    const downloadUrl = `http://10.177.44.180:8443/${brokerPath}/apiv2/servers/${integrationServer}?application=${apiName}&referenced_app_domains=true&referenced_policy_projects=true&exclude_source=true&depth=4`;

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

  const downloadValidationFiles = async (apiName, integrationNode, serverIP, integrationServer) => {
    const key = `${apiName}-${integrationServer}`;
    setDownloadingValidations(prev => new Set(prev).add(key));

    try {
      const response = await fetch("http://10.177.44.58:4423/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: serverIP,
          brokerName: integrationNode,
          egName: integrationServer,
          apiName: apiName
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");

      const error = xmlDoc.querySelector("error");
      if (error) {
        addToast(`Validation error: ${error.textContent}`, "error");
        return;
      }

      const validationFiles = xmlDoc.querySelector("validationFiles");
      if (!validationFiles) {
        addToast("No validation files found in response.", "error");
        return;
      }

      const apiNodes = validationFiles.children;
      if (apiNodes.length === 0) {
        addToast("No files returned from server.", "error");
        return;
      }

      let downloadCount = 0;
      Array.from(apiNodes).forEach((node) => {
        const fileName = node.querySelector("fileName")?.textContent?.trim();
        let fileContent = node.querySelector("fileContent")?.innerHTML?.trim();
        fileContent = fileContent.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
        if (!fileName || fileContent === undefined) return;

        const downloadName = `${apiName}(${fileName}).txt`;
        const blob = new Blob([fileContent], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", downloadName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        downloadCount++;
      });

      addToast(`✅ Downloaded ${downloadCount} validation file${downloadCount > 1 ? "s" : ""} for ${apiName}`, "success");
    } catch (error) {
      console.error("Validation download failed:", error);
      addToast(`Failed to download validation files for ${apiName}: ${error.message}`, "error");
    } finally {
      setDownloadingValidations(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const openModal = (action, item) => {
    setModal({ open: true, action, item, username: "", password: "", showPassword: false, error: "" });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, open: false, error: "" }));
  };

  const confirmAction = async () => {
    const { action, item, username, password } = modal;
    if (!username.trim() || !password.trim()) {
      setModal(prev => ({ ...prev, error: "Username and password are required." }));
      return;
    }
    if (username.trim() !== DEFAULT_USERNAME || password !== DEFAULT_PASSWORD) {
      setModal(prev => ({ ...prev, error: "Password not match. Please check your credentials." }));
      return;
    }
    closeModal();
    await handleServiceAction(action, item, username, password);
  };

  const handleServiceAction = async (action, item, username, password) => {
    const key = `${item.ApiName}-${item.IntegrationServer}`;
    const actionLabel = action === "start" ? "Starting" : "Stopping";
    const doneLabel = action === "start" ? "started" : "stopped";

    setServiceActionMap(prev => ({ ...prev, [key]: action === "start" ? "starting" : "stopping" }));

    const lastOctet = getLastOctet(item.ServerIP);
    const brokerPath = `${item.IntegrationNode}${lastOctet}`;
    const endpoint = action === "start" ? "start" : "teardown";
    const url = `http://10.177.44.180:8443/${brokerPath}/apiv2/servers/${item.IntegrationServer}/rest-apis/${item.ApiName}/${endpoint}`;
    const basicAuth = btoa(`${username}:${password}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Basic ${basicAuth}` },
      });

      const responseText = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText} — ${responseText}`);

      setData(prev =>
        prev.map(d =>
          d.ApiName === item.ApiName
            ? { ...d, ApiState: action === "start" ? "running" : "stopped" }
            : d
        )
      );

      addToast(`✅ ${item.ApiName} ${doneLabel} successfully`, "success");
      await fetchData(endpoints[activeEnv].refresh);
    } catch (err) {
      console.error(`${actionLabel} failed:`, err);
      addToast(`Failed to ${action} ${item.ApiName}: ${err.message}`, "error");
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
    setDownloadingValidations(new Set());
    setServiceActionMap({});
  };

  const isDownloading = (apiName, integrationServer) => downloadingApis.has(`${apiName}-${integrationServer}`);
  const isDownloadingValidation = (apiName, integrationServer) => downloadingValidations.has(`${apiName}-${integrationServer}`);
  const getServiceAction = (apiName, integrationServer) => serviceActionMap[`${apiName}-${integrationServer}`] || null;

  return (
    <div className="app-container">

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

      {/* Credential Modal */}
      {modal.open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className={`modal-header1 ${modal.action === "start" ? "modal-header-start" : "modal-header-stop"}`}>
              <div className="modal-header-icon">
                {modal.action === "start" ? "▶" : "⏹"}
              </div>
              <div>
                <h3 className="modal-title">
                  {modal.action === "start" ? "Start API" : "Stop API"}
                </h3>
                <p className="modal-subtitle">{modal.item?.ApiName}</p>
              </div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="modal-body">
              <p className="modal-info">
                Enter credentials to {modal.action === "start" ? "start" : "stop"} this API on <strong>{modal.item?.IntegrationServer}</strong>
              </p>

              {modal.error && (
                <div className="modal-error">⚠ {modal.error}</div>
              )}

              <div className="modal-field">
                <label>Username</label>
                <input
                  type="text"
                  value={modal.username}
                  onChange={e => setModal(prev => ({ ...prev, username: e.target.value, error: "" }))}
                  placeholder="Enter username"
                  autoFocus
                />
              </div>

              <div className="modal-field">
                <label>Password</label>
                <div className="modal-password-wrapper">
                  <input
                    type={modal.showPassword ? "text" : "password"}
                    value={modal.password}
                    onChange={e => setModal(prev => ({ ...prev, password: e.target.value, error: "" }))}
                    placeholder="Enter password"
                    onKeyDown={e => e.key === "Enter" && confirmAction()}
                  />
                  <button
                    className="toggle-password"
                    onClick={() => setModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                    type="button"
                  >
                    {modal.showPassword
                      ? (<i className="fa fa-eye-slash" aria-hidden="true"></i>)
                      : (<i className="fa fa-eye" aria-hidden="true"></i>)
                    }
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={closeModal}>Cancel</button>
              <button
                className={`modal-confirm-btn ${modal.action === "start" ? "confirm-start" : "confirm-stop"}`}
                onClick={confirmAction}
              >
                {modal.action === "start" ? "▶ Start API" : "⏹ Stop API"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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

      {/* Filters */}
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
            </div>

            <div className="filter-group tertiary-filter">
              <label>Integration Server</label>
              <select value={filters.integrationServer} onChange={(e) => handleFilterChange("integrationServer", e.target.value)}>
                <option value="">All Integration Servers</option>
                {uniqueValues.integrationServers.map(server => <option key={server} value={server}>{server}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>API Name</label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Search API name..."
                  value={filters.apiName}
                  onChange={(e) => handleFilterChange("apiName", e.target.value)}
                />
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

      {/* Servers Grid */}
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
                            <th style={{ textAlign: "center" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serverData.items.map((item, index) => {
                            const downloading = isDownloading(item.ApiName, item.IntegrationServer);
                            const downloadingValidation = isDownloadingValidation(item.ApiName, item.IntegrationServer);
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

                                {/* ── Centralized Action Toolbar ── */}
                                <td>
                                  <div className="action-toolbar">

                                    {/* Download BAR */}
                                    <div className="toolbar-btn-wrap">
                                      <button
                                        className={`toolbar-btn btn-bar ${downloading ? "btn-loading" : ""}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          downloadBarFile(item.ApiName, item.IntegrationServer, item.IntegrationNode, item.ServerIP);
                                        }}
                                        disabled={downloading}
                                        aria-label="Download BAR file"
                                      >
                                        {downloading
                                          ? <span className="btn-spin"></span>
                                          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        }
                                      </button>
                                      <span className="toolbar-tooltip">Download BAR</span>
                                    </div>

                                    {/* Download Validation */}
                                    <div className="toolbar-btn-wrap">
                                      <button
                                        className={`toolbar-btn btn-validate ${downloadingValidation ? "btn-loading" : ""}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          downloadValidationFiles(item.ApiName, item.IntegrationNode, item.ServerIP, item.IntegrationServer);
                                        }}
                                        disabled={downloadingValidation}
                                        aria-label="Download Validation"
                                      >
                                        {downloadingValidation
                                          ? <span className="btn-spin"></span>
                                          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                        }
                                      </button>
                                      <span className="toolbar-tooltip">Validation</span>
                                    </div>

                                    {/* Divider */}
                                    <div className="toolbar-divider"></div>

                                    {/* Start / Stop */}
                                    {!running ? (
                                      <div className="toolbar-btn-wrap">
                                        <button
                                          className={`toolbar-btn btn-start ${serviceAction === "starting" ? "btn-loading" : ""}`}
                                          onClick={(e) => { e.stopPropagation(); openModal("start", item); }}
                                          disabled={isActionInProgress}
                                          aria-label="Start API"
                                        >
                                          {serviceAction === "starting"
                                            ? <span className="btn-spin"></span>
                                            : <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                          }
                                        </button>
                                        <span className="toolbar-tooltip">Start API</span>
                                      </div>
                                    ) : (
                                      <div className="toolbar-btn-wrap">
                                        <button
                                          className={`toolbar-btn btn-stop ${serviceAction === "stopping" ? "btn-loading" : ""}`}
                                          onClick={(e) => { e.stopPropagation(); openModal("stop", item); }}
                                          disabled={isActionInProgress}
                                          aria-label="Stop API"
                                        >
                                          {serviceAction === "stopping"
                                            ? <span className="btn-spin"></span>
                                            : <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                                          }
                                        </button>
                                        <span className="toolbar-tooltip">Stop API</span>
                                      </div>
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

export default ApiSearch;

