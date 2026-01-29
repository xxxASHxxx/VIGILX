import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import DeviceTab from './DeviceTab';
import MobileCamTab from './MobileCamTab';
import DashcamTab from './DashcamTab';
import '../../styles/Private.css';

const PrivateDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('device');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/private/${tab}`);
  };

  React.useEffect(() => {
    if (location.pathname === '/private' || location.pathname === '/private/') {
      navigate('/private/device', { replace: true });
      setActiveTab('device');
    } else {
      // Sync activeTab from URL path
      const pathParts = location.pathname.split('/');
      const currentTab = pathParts[pathParts.length - 1];
      if (['device', 'mobile', 'dashcam'].includes(currentTab)) {
        setActiveTab(currentTab);
      }
    }
  }, [location.pathname, navigate]);

  return (
    <div className="private-container">
      <div className="private-header">
        <div className="header-content">
          <div className="header-top">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h1 className="dashboard-title">VIGILX</h1>
            </Link>
            <span className="mode-badge-private">Private</span>
          </div>
          <p className="dashboard-subtitle">Personal Driver Monitoring</p>
        </div>
      </div>

      <div className="private-content">
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'device' ? 'active' : ''}`}
            onClick={() => handleTabChange('device')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Device
          </button>
          <button
            className={`tab-button ${activeTab === 'mobile' ? 'active' : ''}`}
            onClick={() => handleTabChange('mobile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            Mobile Cam
          </button>
          <button
            className={`tab-button ${activeTab === 'dashcam' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashcam')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            Dashcam
          </button>
        </div>

        <div className="tab-content">
          <Routes>
            <Route path="device" element={<DeviceTab />} />
            <Route path="mobile" element={<MobileCamTab />} />
            <Route path="dashcam" element={<DashcamTab />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default PrivateDashboard;
