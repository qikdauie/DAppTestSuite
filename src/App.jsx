import React, { useState } from 'react';
import { peerDidSameTest } from './tests/peerDidSame';
import { packMessageTest } from './tests/packMessage';
import { 
  unpackMessageTest, 
  unpackMessagePlainTest, 
  unpackMessageSignedTest, 
  unpackMessageEncryptedTest, 
  unpackMessageSignedEncryptedTest 
} from './tests/unpackMessage';
import { discoverFeaturesTest } from './tests/discoverFeatures';
import {
  attachmentsAllTest,
  attachmentsInlineTest,
  attachmentsExternalTest,
  attachmentsMultipleTest
} from './tests/attachments';
import {
  checkDidcommPermissionTest,
  checkMultipleDidcommPermissionsTest,
  requestDidcommPermissionsTest,
  listGrantedDidcommPermissionsTest,
  requestAllDidcommPermissionsTest
} from './tests/protocolPermissions';
import Messenger from './Messenger';
import IntentLab from './IntentLab';
import SecurityLab from './SecurityLab';

// App-intents basic tests removed; use IntentLab for interactive flows via SDK

const tests = [
  {
    id: 'sameDid',
    label: 'Two calls return same DID',
    execute: peerDidSameTest,
  },
  {
    id: 'packMessage',
    label: 'packMessage',
    execute: packMessageTest
  },
  {
    id: 'unpackMessage',
    label: 'pack/unpack roundtrip - All Scenarios',
    execute: unpackMessageTest,
    scenarios: [
      { id: 'unpackPlain', label: 'Plain', execute: unpackMessagePlainTest },
      { id: 'unpackSigned', label: 'Signed', execute: unpackMessageSignedTest },
      { id: 'unpackEncrypted', label: 'Encrypted', execute: unpackMessageEncryptedTest },
      { id: 'unpackSignedEncrypted', label: 'Signed+Encrypted', execute: unpackMessageSignedEncryptedTest },
    ]
  },
  {
    id: 'attachments',
    label: 'attachments: pack/unpack with attachments',
    execute: attachmentsAllTest,
    scenarios: [
      { id: 'attInline', label: 'Inline (base64)', execute: attachmentsInlineTest },
      { id: 'attExternal', label: 'External (URL)', execute: attachmentsExternalTest },
      { id: 'attMultiple', label: 'Multiple', execute: attachmentsMultipleTest },
    ]
  },
  {
    id: 'discoverFeatures',
    label: 'discoverFeatures broadcast',
    execute: discoverFeaturesTest,
  },
  // App-intents tests are exercised via IntentLab
  {
    id: 'didcommPermissions',
    label: 'permissions: DIDComm permission APIs',
    execute: async () => ({ pass: true }),
    scenarios: [
      { id: 'checkSingle', label: 'checkDidcommPermission', execute: checkDidcommPermissionTest },
      { id: 'checkMultiple', label: 'checkMultipleDidcommPermissions', execute: checkMultipleDidcommPermissionsTest },
      { id: 'request', label: 'requestDidcommPermissions', execute: requestDidcommPermissionsTest },
      { id: 'requestAll', label: 'requestAllDidcommPermissions (ALL)', execute: requestAllDidcommPermissionsTest },
      { id: 'listGranted', label: 'listGrantedDidcommPermissions', execute: listGrantedDidcommPermissionsTest },
    ],
  },
];

// Helper component that renders JSON data and provides a copy-to-clipboard button
function PreWithCopy({ data }) {
  const [copied, setCopied] = useState(false);
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }

  return (
    <div style={{ position: 'relative', marginTop: '1rem' }}>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          right: '0.5rem',
          top: '0.5rem',
          padding: '0.2rem 0.6rem',
          fontSize: '0.8rem',
          cursor: 'pointer'
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre
        style={{
          background: '#f7f7f7',
          padding: '0.5rem',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}
      >
        {text}
      </pre>
    </div>
  );
}

function TestCase({ test }) {
  const [result, setResult] = useState(null);
  const [scenarioResults, setScenarioResults] = useState({});

  // Utility to clear all results at once
  function clearAll() {
    setResult(null);
    setScenarioResults({});
  }

  // Remove a single scenario's result
  function clearScenario(id) {
    setScenarioResults(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function run() {
    setResult({ status: 'running' });
    setScenarioResults({});
    try {
      const res = await test.execute();
      setResult({ status: res.pass ? 'pass' : 'fail', details: res });
    } catch (err) {
      setResult({ status: 'error', details: err.message });
    }
  }

  async function runScenario(scenario) {
    setScenarioResults(prev => ({ ...prev, [scenario.id]: { status: 'running' } }));
    try {
      const res = await scenario.execute();
      setScenarioResults(prev => ({ 
        ...prev, 
        [scenario.id]: { status: res.pass ? 'pass' : 'fail', details: res } 
      }));
    } catch (err) {
      setScenarioResults(prev => ({ 
        ...prev, 
        [scenario.id]: { status: 'error', details: err.message } 
      }));
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', marginBottom: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{test.label}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={run}>Run All</button>
          <button onClick={clearAll}>Clear</button>
        </div>
      </div>
      
      {test.scenarios && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Individual Scenarios:</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {test.scenarios.map((scenario) => (
              <button 
                key={scenario.id}
                onClick={() => runScenario(scenario)}
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem',
                  backgroundColor: scenarioResults[scenario.id]?.status === 'pass' ? '#d4edda' : 
                                 scenarioResults[scenario.id]?.status === 'fail' ? '#f8d7da' :
                                 scenarioResults[scenario.id]?.status === 'error' ? '#f8d7da' :
                                 scenarioResults[scenario.id]?.status === 'running' ? '#fff3cd' : '#e9ecef'
                }}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <PreWithCopy data={result} />
      )}

      {Object.keys(scenarioResults).length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Scenario Results:</h3>
          {Object.entries(scenarioResults).map(([id, res]) => (
            <details key={id} style={{ marginBottom: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>{test.scenarios.find(s => s.id === id)?.label}: {res.status}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); clearScenario(id); }}
                  style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}
                >
                  Clear
                </button>
              </summary>
              <PreWithCopy data={res.details} />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('tests');

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Peer DID Test Suite</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc' }}>
        <button 
          onClick={() => setActiveTab('tests')}
          style={{
            padding: '0.5rem 1rem',
            marginRight: '0.5rem',
            border: 'none',
            background: activeTab === 'tests' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'tests' ? 'white' : '#333',
            cursor: 'pointer'
          }}
        >
          Tests
        </button>
        <button 
          onClick={() => setActiveTab('messenger')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: activeTab === 'messenger' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'messenger' ? 'white' : '#333',
            cursor: 'pointer'
          }}
        >
          Messenger
        </button>
        <button 
          onClick={() => setActiveTab('intentlab')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: activeTab === 'intentlab' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'intentlab' ? 'white' : '#333',
            cursor: 'pointer'
          }}
        >
          Intent Lab
        </button>
        <button 
          onClick={() => setActiveTab('securitylab')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: activeTab === 'securitylab' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'securitylab' ? 'white' : '#333',
            cursor: 'pointer'
          }}
        >
          Security Lab
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tests' && (
        <div>
          <h2>Peer DID Manual Tests</h2>
          {tests.map((t) => (
            <TestCase key={t.id} test={t} />
          ))}
        </div>
      )}
      
      {activeTab === 'messenger' && (
        <Messenger />
      )}

      {activeTab === 'intentlab' && (
        <IntentLab />
      )}

      {activeTab === 'securitylab' && (
        <SecurityLab />
      )}
    </div>
  );
} 