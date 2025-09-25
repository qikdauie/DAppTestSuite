import { getReadyDecentClient} from 'decent_app_sdk';

export async function peerDidSameTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}

  // First call
  const first = await msgr.getDID();
  // Second call
  const second = await msgr.getDID();

  const pass = first.did === second.did;

  return {
    pass,
    first,
    second,
  };
} 