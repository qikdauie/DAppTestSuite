import React, { useState, useEffect } from 'react';
import { getReadyDecentClient} from 'decent_app_sdk';

export default function Messenger() {
  const [msgr, setMsgr]   = useState(null);
  const [myDid, setMyDid] = useState('');
  const [dest, setDest]   = useState('');
  const [text, setText]   = useState('');
  const [log,  setLog]    = useState([]);  // {dir,text,peer,ts}[]

  // boot once
  useEffect(() => {
    let unsubscribe;
    let cancelled = false;

    (async () => {
      const app = await getReadyDecentClient();
      setMsgr(app);

      const { did } = await app.getDID();
      setMyDid(did);

      try {
        await app.protocols.refresh();
      } catch (e) {
        console.warn('protocols.refresh failed', e);
      }

      if (cancelled) return;

      unsubscribe = app.onMessage(async raw => {
        console.log('raw', raw);
        const up = await app.unpack(raw);
        if (!up.success) return;
        const body = JSON.parse(up.message);
        push('in', body.body?.text || '[no text]', body.from);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // helper to add to chat log
  const push = (dir, txt, peer) =>
    setLog(l => [...l, { dir: dir, text: txt, peer, ts: Date.now() }]);

  // send button
  async function send() {
    if (!msgr || !dest || !text) return;

    try {
      const body   = { text };
      const packed = await msgr.pack(
        dest,
        'https://didcomm.org/basicmessage/2.0/message',
        JSON.stringify(body),
        [],
        "");

      if (!packed?.success) {
        console.error('pack failed', packed);
        return;
      }

      const ok = await msgr.sendOk(dest, packed.message);
      if (ok) {
        console.log('sent', dest, packed.message);
        push('out', text, dest);
      }
    } catch (err) {
      console.error('send error', err);
    }

    setText('');
  }

  // ─ UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h2>DIDComm Messenger</h2>

      <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
        <strong>Your DID:</strong>
        <span style={{ marginLeft: 6, wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {myDid || '…'}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <input
          style={{ width: '60%', marginRight: 6 }}
          placeholder="Destination DID"
          value={dest}
          onChange={e => setDest(e.target.value)}
        />
        <button onClick={() => setDest('')}>Clear</button>
      </div>

      <div style={{ display: 'flex', marginBottom: 8 }}>
        <input
          style={{ flex: 1, marginRight: 6 }}
          placeholder="Message"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={send}>Send</button>
      </div>

      <div style={{ border: '1px solid #ccc', padding: 6, maxHeight: 260, overflowY: 'auto' }}>
        {log.map((m, i) => (
          <div key={i} style={{ textAlign: m.dir === 'out' ? 'right' : 'left', margin: '4px 0' }}>
            <span style={{
              background: m.dir === 'out' ? '#d4edda' : '#f1f1f1',
              padding: '2px 6px', borderRadius: 4, display: 'inline-block'
            }}>
              {m.text}
            </span>
            <div style={{ fontSize: '0.7rem', color: '#666' }}>
              {m.dir === 'out' ? `To: ${m.peer}` : `From: ${m.peer}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
