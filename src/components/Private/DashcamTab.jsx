import React, { useState } from 'react';

const DashcamTab = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, timestamp: '2026-01-29 11:30:15', status: 'Drowsiness Detected' },
    { id: 2, timestamp: '2026-01-29 11:05:48', status: 'Drowsiness Detected' },
    { id: 3, timestamp: '2026-01-29 10:38:22', status: 'Drowsiness Detected' },
    { id: 4, timestamp: '2026-01-29 10:12:55', status: 'Drowsiness Detected' },
  ]);

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  return (
    <div className="device-tab">
      <div className="device-header">
        <div className="device-status-card">
          <div className="status-row">
            <div className="status-info">
              <h3>Dashcam Feed</h3>
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            <button className="connect-btn" onClick={handleConnect}>
              {isConnected ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Disconnect
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Connect Dashcam
                </>
              )}
            </button>
          </div>
          
          <div className="dashcam-config">
            <div className="config-section">
              <h4>Dashcam Configuration</h4>
              <div className="config-options">
                <div className="config-item">
                  <span className="config-label">IP Address:</span>
                  <input 
                    type="text" 
                    className="config-input" 
                    placeholder="192.168.1.100"
                    disabled={isConnected}
                  />
                </div>
                <div className="config-item">
                  <span className="config-label">Port:</span>
                  <input 
                    type="text" 
                    className="config-input" 
                    placeholder="8080"
                    disabled={isConnected}
                  />
                </div>
                <div className="config-item">
                  <span className="config-label">Stream URL:</span>
                  <input 
                    type="text" 
                    className="config-input" 
                    placeholder="/stream"
                    disabled={isConnected}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="device-info">
            <div className="info-item">
              <span className="info-label">Connection Type</span>
              <span className="info-value">Dashcam</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className="info-value">{isConnected ? 'Active' : 'Offline'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Alerts</span>
              <span className="info-value">{logs.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="logs-section">
        <div className="section-header">
          <h3>Drowsiness Detection Log</h3>
          <div className="header-actions">
            <span className="log-count">{logs.length} alerts today</span>
            <button className="icon-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="logs-container">
          {logs.length > 0 ? (
            <div className="logs-list">
              {logs.map((log) => (
                <div key={log.id} className="log-item">
                  <div className="log-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <div className="log-details">
                    <p className="log-status">{log.status}</p>
                    <span className="log-timestamp">{log.timestamp}</span>
                  </div>
                  <div className="log-badge">Alert</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="logs-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <p>No alerts recorded</p>
              <span>Drowsiness detections will appear here with timestamps</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashcamTab;
