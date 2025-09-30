import React, { useMemo, useState } from 'react';
import { toJsonSafe } from '../utils';

export default function PreWithCopy({ data, maxHeight }) {
  const [copied, setCopied] = useState(false);
  function safeStringify(value) {
    try {
      return typeof value === 'string' ? value : JSON.stringify(toJsonSafe(value), null, 2);
    } catch {
      try { return JSON.stringify(value, null, 2); } catch { return String(value); }
    }
  }

  const text = useMemo(() => (
    typeof data === 'string' ? data : safeStringify(data)
  ), [data]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }

  return (
    <div className="pre-with-copy">
      <button className={`btn btn-secondary btn-copy ${copied ? 'is-copied' : ''}`} onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="pre-block" style={{ maxHeight: maxHeight, overflow: maxHeight ? 'auto' : undefined }}>
        {text || '—'}
      </pre>
    </div>
  );
}



