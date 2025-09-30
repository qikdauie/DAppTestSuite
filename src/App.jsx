import React, { useState, useEffect } from 'react';
import { PreWithCopy, UnifiedTestRunner } from './components';
import { getStatusColor } from './utils';
import Messenger from './Messenger';
import IntentLab from './IntentLab';


export default function App() {
  const [activeTab, setActiveTab] = useState('tests');
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'light'; } catch { return 'light'; }
  });
  useEffect(() => {
    try { document.documentElement.setAttribute('data-theme', theme); } catch {}
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <div className="flex items-center justify-between">
        <h1 className="mb-0">qikfox Decentralized App Test Suite</h1>
        <button className="btn btn-outline" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="tab-nav">
        <button className={`tab-button ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>All Tests</button>
        <button className={`tab-button ${activeTab === 'messenger' ? 'active' : ''}`} onClick={() => setActiveTab('messenger')}>Messenger</button>
        <button className={`tab-button ${activeTab === 'intentlab' ? 'active' : ''}`} onClick={() => setActiveTab('intentlab')}>Intent Lab</button>
        {/* Security Lab removed; advanced security lives in All Tests */}
      </div>

      {/* Tab Content */}
      {activeTab === 'tests' && (
        <UnifiedTestRunner />
      )}
      
      {activeTab === 'messenger' && (
        <Messenger />
      )}

      {activeTab === 'intentlab' && (
        <IntentLab />
      )}

      {/* Security Lab removed */}
    </div>
  );
} 