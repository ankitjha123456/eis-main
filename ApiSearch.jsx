

import React, { useState, useEffect } from 'react';
import './CacheHit.css';

const CacheHitUAT = () => {
  const [cacheData, setCacheData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingServers, setLoadingServers] = useState(new Set());

  const BASE_URL = 'http://10.177.44.180:8443/UAT/cachehit';

  // Fetch all servers cache data
  const fetchAllCacheData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(BASE_URL + '/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      

      
      setCacheData(data);
    } catch (e) {
      console.error("Error fetching cache data:", e);
      setError('Someone already doing cache hit please wait and try Again!! ');
    } finally {
      setLoading(false);
    }
  };

  // Fetch cache for a specific server
  const fetchSingleServerCache = async (serverIp) => {
    const serverNumber = serverIp.split('.').pop(); 
    setLoadingServers(prev => new Set([...prev, serverIp]));
    
    try {
      const response = await fetch(`http://10.177.44.180:8443/UAT/cachehit1/${serverNumber}`);
      console.log(response);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Cache data for ${serverIp}:`, data);
      
      // Update the specific server in cacheData
      setCacheData(prevData => 
        prevData.map(server => 
          server.server === serverIp 
            ? { ...server, ...data }
            : server
        )
      );
      
    } catch (e) {
      console.error(`Error fetching cache for ${serverIp}:`, e);
      
    } finally {
      setLoadingServers(prev => {
        const newSet = new Set(prev);
        newSet.delete(serverIp);
        return newSet;
      });
    }
  };

  // Check if a server is currently being loaded
  const isServerLoading = (serverIp) => {
    return loadingServers.has(serverIp);
  };

  useEffect(() => {
    fetchAllCacheData();
  }, []);

  const getStatusColor = (status) => {
    return status === 'CACHE HIT SUCCESS' ? 'success' : 'error';
  };

  const getStatusIcon = (status) => {
    return status === 'CACHE HIT SUCCESS' ? '✓' : '✗';
  };

  const handleServerClick = (serverIp) => {
    if (!isServerLoading(serverIp)) {
      fetchSingleServerCache(serverIp);
    }
  };

  if (loading) {
    return (
      <div className="cache-hit-container">
        <div className="cache-hit-header">
          <h2>Cache Hit Status</h2>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading cache servers data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cache-hit-container">
        <div className="cache-hit-header">
          <h2>Cache Hit Status</h2>
          <button className="btn-refresh" onClick={fetchAllCacheData}>
            Retry
          </button>
        </div>
        <div className="error-message">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cache-hit-container">
      <div className="cache-hit-header">
        <h2>Cache Hit Status</h2>
        <button className="btn-refresh" onClick={fetchAllCacheData}>
          Reload All Cache
        </button>
      </div>

      <div className="servers-grid1">
        {cacheData.map((server, index) => {
          const isLoading = isServerLoading(server.server);
          return (
            <div 
              key={index} 
              className={`server-card1 ${getStatusColor(server.CACHE_RESPONSE)} ${isLoading ? 'loading' : ''}`}
              onClick={() => handleServerClick(server.server)}
            >
              <div className="server-status">
                {isLoading ? (
                  <span className="status-icon loading">
                    <div className="mini-spinner"></div>
                  </span>
                ) : (
                  <span className={`status-icon ${getStatusColor(server.CACHE_RESPONSE)}`}>
                    {getStatusIcon(server.CACHE_RESPONSE)}
                  </span>
                )}
              </div>
              <div className="server-content">
                <div className="server-ip">{server.server}</div>
                <div className="server-response">
                  {isLoading ? 'Loading...' : server.CACHE_RESPONSE}
                </div>
                {server.lastUpdated && (
                  <div className="server-updated">
                    Updated: {new Date(server.lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>
              <div className="server-action">
                <button 
                  className="btn-single-refresh"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleServerClick(server.server);
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? '...' : '↻'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CacheHitUAT;
