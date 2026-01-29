import React, { useState } from 'react';

const MobileCamTab = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, timestamp: '2026-01-29 11:20:35', status: 'Drowsiness Detected' },
    { id: 2, timestamp: '2026-01-29 10:55:18', status: 'Drowsiness Detected' },
    { id: 3, timestamp: '2026-01-29 10:28:42', status: 'Drowsiness Detected' },
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
              <h3>Mobile Camera Feed</h3>
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
                  Connect Mobile
                </>
              )}
            </button>
          </div>
          
          <div className="connection-info">
            <div className="qr-section">
              <div className="qr-image-container">
                <img 
                  src={`${process.env.PUBLIC_URL}/qr-code.jpg.png`} 
                  alt="QR Code" 
                  className="qr-code-image"
                  onError={(e) => {
                    console.error('Image failed to load');
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <span className="qr-instruction">Scan with your mobile device to connect</span>
            </div>
            
            <div className="connection-steps">
              <h4>Connection Steps:</h4>
              <ol>
                <li>Open the mobile app</li>
                <li>Scan the QR code</li>
                <li>Grant camera permissions</li>
                <li>Start monitoring</li>
              </ol>
            </div>
          </div>

          <div className="device-info">
            <div className="info-item">
              <span className="info-label">Connection Type</span>
              <span className="info-value">Mobile Camera</span>
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

export default MobileCamTab;
