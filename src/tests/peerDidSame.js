import { connectMessenger } from '../sdk/messenger-client.js';

export async function peerDidSameTest() {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.getDID !== 'function') {
    throw new Error('Service worker getDID() is not available.');
  }

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