/**
 * Create a messaging client that talks to the Service Worker via MessageChannel.
 *
 * The returned object exposes high-level helpers for DIDComm-style packing, sending,
 * feature discovery, and app-intents. All calls are forwarded to the SW using
 * a simple RPC pattern over a transient MessageChannel.
 *
 * Error handling:
 * - Throws if Service Workers are unsupported, registration fails, or a controller
 *   does not become available within the readiness timeout.
 * - RPC calls include a safety timeout and will reject if no response arrives.
 *
 * @param {string} [swUrl='/public/worker/sw.js'] URL of the Service Worker script.
 * @returns {Promise<{
 *   getDID: () => Promise<any>,
 *   pack: (dest: string, type: string, body: any, sign?: boolean, encrypt?: boolean) => Promise<any>,
 *   unpack: (raw: any) => Promise<any>,
 *   register: (did: string) => Promise<boolean>,
 *   send: (dest: string, packed: any) => Promise<boolean>,
 *   discover: (matchers: string[]|string, timeout?: number) => Promise<any>,
 *   advertise: (featureType: string, id: string, roles?: string[]) => Promise<boolean>,
 *   onMessage: (cb: (raw: any) => void) => () => void,
 *   intentAdvertise: (actionOrRequestType: string, roles?: string[]) => Promise<boolean>,
 *   intentDiscover: (matchers?: string[]|string, timeout?: number) => Promise<any>,
 *   intentRequest: (dest: string, requestBody: any, opts?: { waitForResult?: boolean, timeout?: number }) => Promise<any>
 * }>} Resolves with the client API.
 */
export async function connectMessenger(swUrl = '/public/worker/sw.js') {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this environment.');
  }

  // 1) Register Service Worker and wait for an active controller with a timeout.
  const readinessTimeoutMs = 8000;

  let registration;
  try {
    registration = await navigator.serviceWorker.register(swUrl, { type: 'module' });
  } catch (err) {
    throw new Error(`Failed to register Service Worker at "${swUrl}": ${(err && err.message) || err}`);
  }

  const swRef = await waitForControllerOrActive(registration, readinessTimeoutMs);

  // 2) Generic RPC helper using MessageChannel with response timeout and cleanup.
  function rpc(kind, data, timeoutMs = 60000) {
    if (!kind) {
      return Promise.reject(new Error('RPC kind is required.'));
    }
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();

      let settled = false;
      const done = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };

      const onMessage = (event) => done(resolve, event.data);
      const onMessageError = () => done(reject, new Error(`RPC "${kind}" failed to deserialize message.`));

      const timeoutId = setTimeout(() => {
        done(reject, new Error(`RPC "${kind}" timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeoutId);
        channel.port1.onmessage = null;
        channel.port1.onmessageerror = null;
        try { channel.port1.close(); } catch (_) {}
        try { channel.port2.close(); } catch (_) {}
      };

      channel.port1.onmessage = onMessage;
      channel.port1.onmessageerror = onMessageError;

      try {
        swRef.postMessage({ kind, data, port: channel.port2 }, [channel.port2]);
      } catch (err) {
        done(reject, new Error(`Failed to post RPC "${kind}": ${(err && err.message) || err}`));
      }
    });
  }

  // 3) Public API
  return {
    /**
     * Retrieve the agent's DID controlled by the Service Worker.
     * @returns {Promise<any>}
     */
    getDID: () => rpc('getDID'),

    /**
     * Pack a DIDComm message for a destination DID.
     * @param {string} dest Destination DID
     * @param {string} type Protocol message type URI
     * @param {any} body Plain JSON body to include in the message
     * @param {boolean} [sign] Whether to sign the message
     * @param {boolean} [encrypt] Whether to encrypt the message
     * @returns {Promise<any>} Pack result including `message` and metadata
     */
    pack: (dest, type, body, sign, encrypt) =>
      rpc('packMessage', { dest, type, body, sign, encrypt }),

    /**
     * Pack a DIDComm message with full parameter surface (attachments, reply_to).
     * Mirrors the IDL: packMessage(dest_did, message_type, body_json, attachments, reply_to)
     */
    packFull: (dest, type, bodyJson, attachments = [], replyTo = "") =>
      rpc('packMessageFull', { dest: dest, type: type, body: bodyJson, attachments: attachments, replyTo: replyTo }),

    /**
     * Unpack a DIDComm message into headers and body.
     * @param {any} raw Raw envelope
     * @returns {Promise<any>} Unpacked result
     */
    unpack: (raw) => rpc('unpackMessage', { raw }),

    /**
     * Register a DID with the Service Worker routing.
     * @param {string} did
     * @returns {Promise<boolean>} True if registration succeeded
     */
    register: (did) => rpc('register', { did }).then((r) => Boolean(r && r.ok)),

    /**
     * Send a previously packed message to a destination DID.
     * @param {string} dest
     * @param {any} packed
     * @returns {Promise<boolean>} True if send succeeded
     */
    send: (dest, packed) => rpc('send', { dest, packed }).then((r) => Boolean(r && r.ok)),

    /**
     * Attempt to send a raw string directly to the Router (bypassing queue).
     * Returns { ok: boolean, result?: string, error?: string }
     */
    sendRaw: (dest, packed) => rpc('sendRaw', { dest, packed }),

    /**
     * Discover advertised features.
     * See https://didcomm.org/discover-features/2.0/.
     * @param {string[]|string} matchers Filter by feature types; '*' for all
     * @param {number} [timeout=400] Discovery window in milliseconds
     * @returns {Promise<any>} Feature map keyed by peer DID
     */
    discover: (matchers, timeout = 400) => rpc('discover', { matchers, timeout }),

    /**
     * Advertise a feature.
     * See https://didcomm.org/discover-features/2.0/.
     * @param {string} featureType Feature type identifier (e.g., 'protocol' or 'goal-code')
     * @param {string} id Feature identifier (e.g., protocol PIURI or goal-code string)
     * @param {string[]} [roles=[]] Roles supported by this feature
     * @returns {Promise<boolean>} True if advertisement succeeded
     */
    advertise: (featureType, id, roles = []) =>
      rpc('advertise', { featureType, id, roles }).then((r) => Boolean(r && r.ok)),

    /**
     * Subscribe to incoming raw envelopes arriving via the Service Worker.
     * Returns an unsubscribe function to remove the listener.
     * @param {(raw: any) => void} cb Callback invoked with raw envelope
     * @returns {() => void}
     */
    onMessage: (cb) => {
      if (typeof cb !== 'function') {
        throw new TypeError('onMessage callback must be a function.');
      }
      const handler = (e) => {
        if (e && e.data && e.data.kind === 'incoming') {
          cb(e.data.raw);
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    },

    // ───── App-Intents helpers (RPC to SW) ─────

    /**
     * Advertise an app-intent by action or full request message type.
     * @param {string} actionOrRequestType Action code (e.g., 'share') or full request type PIURI
     * @param {string[]} [roles=['provider']] Roles supported for this intent
     * @returns {Promise<boolean>} True if advertisement succeeded
     */
    intentAdvertise: (actionOrRequestType, roles = ['provider']) => {
      const arg = String(actionOrRequestType || '');
      const isType = arg.includes('://');
      const payload = isType
        ? { requestType: arg, roles }
        : { action: arg, roles };
      return rpc('intentAdvertise', payload).then((r) => Boolean(r && r.ok));
    },

    /**
     * Discover providers for specific intents.
     * @param {string[]|string} [matchers=['*']] Intent action codes (or PIURIs) to match; '*' for all
     * @param {number} [timeout=600] Discovery window in milliseconds
     * @returns {Promise<any>} Feature map keyed by peer DID
     */
    intentDiscover: (matchers = ['*'], timeout = 600) =>
      rpc('intentDiscover', { matchers, timeout }),

    /**
     * Request an intent from a destination provider.
     * @param {string} dest Destination DID of the provider
     * @param {any} requestBody Request payload
     * @param {{ waitForResult?: boolean, timeout?: number }} [opts]
     * @returns {Promise<any>} Intent result or acknowledgement
     */
    intentRequest: (dest, requestBody, opts = {}) =>
      rpc('intentRequest', {
        dest,
        requestBody,
        waitForResult: opts.waitForResult !== false,
        timeout: opts.timeout || 15000,
        requestType: opts.requestType,
      }),

    // ───── DIDComm Permission helpers (RPC to SW) ─────

    /**
     * Check if a specific DIDComm protocol + message-type pair is permitted.
     * @param {string} protocolUri
     * @param {string} messageTypeUri Full message type URI
     * @returns {Promise<boolean>}
     */
    checkDidcommPermission: (protocolUri, messageTypeUri) =>
      rpc('checkDidcommPermission', { protocolUri: protocolUri, messageTypeUri: messageTypeUri }),

    /**
     * Check multiple DIDComm protocol + message-type pairs.
     * @param {string[]} protocolUris
     * @param {string[]} messageTypeUris Full message type URIs
     * @returns {Promise<boolean[]>}
     */
    checkMultipleDidcommPermissions: (protocolUris, messageTypeUris) =>
      rpc('checkMultipleDidcommPermissions', { protocolUris: protocolUris, messageTypeUris: messageTypeUris }),

    /**
     * Request DIDComm permissions for one or more protocol + message-types.
     * @param {{ protocolUri: string, protocolName?: string, description?: string, messageTypes?: { typeUri: string, description?: string }[], requireAllMessageTypes?: boolean }[]} requests
     * @returns {Promise<any>} ProtocolPermissionResult
     */
    requestDidcommPermissions: (requests) =>
      rpc('requestDidcommPermissions', { requests }),

    /**
     * List granted DIDComm permissions for the specified protocols.
     * @param {string[]} protocolUris
     * @returns {Promise<any[]>} DIDCommProtocolPermission[]
     */
    listGrantedDidcommPermissions: (protocolUris) =>
      rpc('listGrantedDidcommPermissions', { protocolUris: protocolUris }),
  };
}

/**
 * Wait for an active Service Worker capable of receiving messages.
 * Resolves with a ServiceWorker that supports postMessage.
 * @param {ServiceWorkerRegistration} registration
 * @param {number} timeoutMs
 * @returns {Promise<ServiceWorker>}
 */
async function waitForControllerOrActive(registration, timeoutMs) {
  // Fast paths: active worker on registration, or an existing controller.
  const active = registration && registration.active;
  if (active) return active;
  if (navigator.serviceWorker.controller) return navigator.serviceWorker.controller;

  const controllerPromise = new Promise((resolve) => {
    const onChange = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.removeEventListener('controllerchange', onChange);
        resolve(navigator.serviceWorker.controller);
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
  });

  const timeoutPromise = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Service Worker did not gain control within ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  return Promise.race([controllerPromise, timeoutPromise]);
}
