// DIDComm Permissions API tests
import { connectMessenger } from '../sdk/messenger-client.js';

const SAMPLE_PROTOCOL = 'https://didcomm.org/basicmessage/2.0';
const SAMPLE_PROTOCOL_NAME = 'DEV-Basic Message';
const SAMPLE_PROTOCOL_DESCRIPTION = 'DEV-Send a basic message to a DID';
const SAMPLE_MESSAGE_TYPE = 'https://didcomm.org/basicmessage/2.0/send-message';
const SAMPLE_MESSAGE_TYPE_DESCRIPTION = 'DEV-Send a basic message to a DID';

export async function checkDidcommPermissionTest(protocol = SAMPLE_PROTOCOL, messageTypeUri = SAMPLE_MESSAGE_TYPE) {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.checkDidcommPermission !== 'function') {
    throw new Error('checkDidcommPermission RPC not available via messenger client.');
  }
  let result, error = null;
  try {
    result = await msgr.checkDidcommPermission(protocol, messageTypeUri);
  } catch (err) {
    error = err;
  }
  const pass = error === null && typeof result === 'boolean';
  return { pass, request: { protocol, messageTypeUri }, response: result, error: error ? String(error) : null };
}

export async function checkMultipleDidcommPermissionsTest(protocols = ['https://didcomm.org/app-intent/1.0'], messageTypeUris = [SAMPLE_MESSAGE_TYPE, 'https://didcomm.org/app-intent/1.0/pick-datetime-request', 'https://didcomm.org/app-intent/1.0/compose-email-request']) {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.checkMultipleDidcommPermissions !== 'function') {
    throw new Error('checkMultipleDidcommPermissions RPC not available via messenger client.');
  }
  let result, error = null;
  try {
    result = await msgr.checkMultipleDidcommPermissions(protocols, messageTypeUris);
  } catch (err) {
    error = err;
  }
  const pass = error === null && Array.isArray(result) && result.every(v => typeof v === 'boolean');
  return { pass, request: { protocols, messageTypeUris }, response: result, error: error ? String(error) : null };
}

export async function requestDidcommPermissionsTest(requests = [
  { protocolUri: 'https://didcomm.org/app-intent/1.0', protocolName: 'DEV-App Intent', description: 'DEV-App like inter-site functionality',
    messageTypes: [
        { typeUri: 'https://didcomm.org/app-intent/1.0/share-response', description: 'DEV-Share result (response)' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-datetime-request', description: 'DEV-Pick a date/time (request)' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-datetime-response', description: 'DEV-Pick a date/time result (response)' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/compose-email-request', description: 'DEV-Compose email (request)' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/compose-email-response', description: 'DEV-Compose email result (response)' },
  ], requireAllMessageTypes: false },
  { protocolUri: 'https://didcomm.org/trust-ping/2.0', protocolName: 'DEV-Trust Ping', description: 'DEV-Ping a DID to check if it is online',
      messageTypes: [
        { typeUri: 'https://didcomm.org/trust-ping/2.0/ping', description: 'DEV-Ping a DID to check if it is online' },
        { typeUri: 'https://didcomm.org/trust-ping/2.0/ping-response', description: 'DEV-Ping response' }],
    requireAllMessageTypes: false },
  { protocolUri: 'https://didcomm.org/basicmessage/2.0', protocolName: 'DEV-Basic Message', description: 'DEV-Send a basic message to a DID', messageTypes: [
    { typeUri: 'https://didcomm.org/basicmessage/2.0/send-message', description: 'DEV-Send a basic message to a DID' }], requireAllMessageTypes: false },
  ]) {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.requestDidcommPermissions !== 'function') {
    throw new Error('requestDidcommPermissions RPC not available via messenger client.');
  }
  let result, error = null;
  try {
    result = await msgr.requestDidcommPermissions(requests);
  } catch (err) {
    error = err;
  }
  const pass = error === null && result && typeof result === 'object';
  return { pass, request: { requests }, response: result, error: error ? String(error) : null };
}

export async function listGrantedDidcommPermissionsTest(protocols = [SAMPLE_PROTOCOL, 'https://didcomm.org/trust-ping/2.0', 'https://didcomm.org/basicmessage/2.0']) {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.listGrantedDidcommPermissions !== 'function') {
    throw new Error('listGrantedDidcommPermissions RPC not available via messenger client.');
  }
  let result, error = null;
  try {
    result = await msgr.listGrantedDidcommPermissions(protocols);
  } catch (err) {
    error = err;
  }
  const pass = error === null && Array.isArray(result);
  return { pass, request: { protocols }, response: result, error: error ? String(error) : null };
}


// Request every known DIDComm permission from the protocol registry to verify UI rendering
export async function requestAllDidcommPermissionsTest() {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.requestDidcommPermissions !== 'function') {
    throw new Error('requestDidcommPermissions RPC not available via messenger client.');
  }

  const requests = [
    {
      protocolUri: 'https://didcomm.org/basicmessage/2.0',
      protocolName: 'Basic Messaging',
      description: 'DEV-Exchange text messages',
      messageTypes: [
        { typeUri: 'https://didcomm.org/basicmessage/2.0/message', description: 'DEV-Send text message' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/present-proof/2.0',
      protocolName: 'Credential Verification',
      description: 'DEV-Share and verify digital credentials',
      messageTypes: [
        { typeUri: 'https://didcomm.org/present-proof/2.0/propose-presentation', description: 'DEV-Suggest credential to share' },
        { typeUri: 'https://didcomm.org/present-proof/2.0/request-presentation', description: 'DEV-Request credential verification' },
        { typeUri: 'https://didcomm.org/present-proof/2.0/presentation', description: 'DEV-Share credential proof' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/issue-credential/2.0',
      protocolName: 'Credential Issuance',
      description: 'DEV-Receive and manage digital credentials',
      messageTypes: [
        { typeUri: 'https://didcomm.org/issue-credential/2.0/propose-credential', description: 'DEV-Request specific credential' },
        { typeUri: 'https://didcomm.org/issue-credential/2.0/offer-credential', description: 'DEV-Receive credential offer' },
        { typeUri: 'https://didcomm.org/issue-credential/2.0/request-credential', description: 'DEV-Accept credential offer' },
        { typeUri: 'https://didcomm.org/issue-credential/2.0/issue-credential', description: 'DEV-Store issued credential' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/trust-ping/2.0',
      protocolName: 'Connection Test',
      description: 'DEV-Test secure connections',
      messageTypes: [
        { typeUri: 'https://didcomm.org/trust-ping/2.0/ping', description: 'DEV-Test connection' },
        { typeUri: 'https://didcomm.org/trust-ping/2.0/ping-response', description: 'DEV-Respond to connection test' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/discover-features/2.0',
      protocolName: 'Feature Discovery',
      description: 'DEV-Discover available features',
      messageTypes: [
        { typeUri: 'https://didcomm.org/discover-features/2.0/queries', description: 'DEV-Query supported features' },
        { typeUri: 'https://didcomm.org/discover-features/2.0/disclose', description: 'DEV-Share supported features' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/out-of-band/2.0',
      protocolName: 'Connection Invites',
      description: 'DEV-Share invitation links and QR codes',
      messageTypes: [
        { typeUri: 'https://didcomm.org/out-of-band/2.0/invitation', description: 'DEV-Share invitation' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/report-problem/2.0',
      protocolName: 'Error Reporting',
      description: 'DEV-Report errors and issues',
      messageTypes: [
        { typeUri: 'https://didcomm.org/report-problem/2.0/problem-report', description: 'DEV-Send error report' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/action-menu/1.0',
      protocolName: 'Interactive Menus',
      description: 'DEV-Display and interact with action menus',
      messageTypes: [
        { typeUri: 'https://didcomm.org/action-menu/1.0/menu-request', description: 'DEV-Request action menu' },
        { typeUri: 'https://didcomm.org/action-menu/1.0/menu', description: 'DEV-Display action menu' },
        { typeUri: 'https://didcomm.org/action-menu/1.0/perform', description: 'DEV-Execute menu action' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/user-profile/1.0',
      protocolName: 'Profile Sharing',
      description: 'DEV-Share basic profile information',
      messageTypes: [
        { typeUri: 'https://didcomm.org/user-profile/1.0/request-profile', description: 'DEV-Request profile information' },
        { typeUri: 'https://didcomm.org/user-profile/1.0/profile', description: 'DEV-Share profile information' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/didexchange/1.1',
      protocolName: 'Connection Setup',
      description: 'DEV-Establish secure connections',
      messageTypes: [
        { typeUri: 'https://didcomm.org/didexchange/1.1/request', description: 'DEV-Request new connection' },
        { typeUri: 'https://didcomm.org/didexchange/1.1/response', description: 'DEV-Accept connection request' },
        { typeUri: 'https://didcomm.org/didexchange/1.1/complete', description: 'DEV-Finalize connection' },
        { typeUri: 'https://didcomm.org/didexchange/1.1/problem_report', description: 'DEV-Report connection error' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/share-media/1.0',
      protocolName: 'File Sharing',
      description: 'DEV-Share files and media securely',
      messageTypes: [
        { typeUri: 'https://didcomm.org/share-media/1.0/share-media', description: 'DEV-Share files and media' },
        { typeUri: 'https://didcomm.org/share-media/1.0/request-media', description: 'DEV-Request shared files' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: 'https://didcomm.org/app-intent/1.0',
      protocolName: 'App Actions',
      description: 'DEV-Perform actions through other apps',
      messageTypes: [
        // Control
        { typeUri: 'https://didcomm.org/app-intent/1.0/decline', description: 'DEV-Provider refusal with reason' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/progress', description: 'DEV-Optional progress updates' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/cancel', description: 'DEV-Caller cancellation while in-flight' },
        // Content and communication
        { typeUri: 'https://didcomm.org/app-intent/1.0/share-request', description: 'DEV-Share text/URLs/small files' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/share-response', description: 'DEV-Response to share request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/compose-email-request', description: 'DEV-Compose or send an email' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/compose-email-response', description: 'DEV-Response to compose email request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/dial-call-request', description: 'DEV-Initiate a phone/VoIP call' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/dial-call-response', description: 'DEV-Response to dial call request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/open-url-request', description: 'DEV-Open a URL to view or edit' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/open-url-response', description: 'DEV-Response to open URL request' },
        // File and data selection
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-file-request', description: 'DEV-User picks file(s)' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-file-response', description: 'DEV-Response to pick file request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-contact-request', description: 'DEV-User picks contact(s)' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-contact-response', description: 'DEV-Response to pick contact request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-datetime-request', description: 'DEV-User picks a date/time or range' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-datetime-response', description: 'DEV-Response to pick datetime request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-location-request', description: 'DEV-User picks a geographic location' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pick-location-response', description: 'DEV-Response to pick location request' },
        // Media capture
        { typeUri: 'https://didcomm.org/app-intent/1.0/capture-photo-request', description: 'DEV-Capture a still photo' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/capture-photo-response', description: 'DEV-Response to capture photo request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/capture-video-request', description: 'DEV-Capture video' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/capture-video-response', description: 'DEV-Response to capture video request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/capture-audio-request', description: 'DEV-Record audio' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/capture-audio-response', description: 'DEV-Response to capture audio request' },
        // Scanning and recognition
        { typeUri: 'https://didcomm.org/app-intent/1.0/scan-qr-request', description: 'DEV-Scan QR/Barcode' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/scan-qr-response', description: 'DEV-Response to scan QR request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/scan-document-request', description: 'DEV-Scan/deskew document' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/scan-document-response', description: 'DEV-Response to scan document request' },
        // Navigation and location
        { typeUri: 'https://didcomm.org/app-intent/1.0/open-map-navigation-request', description: 'DEV-Launch navigation' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/open-map-navigation-response', description: 'DEV-Response to open map navigation request' },
        // Calendar and contact management
        { typeUri: 'https://didcomm.org/app-intent/1.0/add-calendar-event-request', description: 'DEV-Add/update a calendar event' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/add-calendar-event-response', description: 'DEV-Response to add calendar event request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/add-contact-request', description: 'DEV-Add/update a contact' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/add-contact-response', description: 'DEV-Response to add contact request' },
        // File operations
        { typeUri: 'https://didcomm.org/app-intent/1.0/save-to-request', description: 'DEV-Save bytes to a location' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/save-to-response', description: 'DEV-Response to save to request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/print-request', description: 'DEV-Print via a provider' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/print-response', description: 'DEV-Response to print request' },
        // Text processing
        { typeUri: 'https://didcomm.org/app-intent/1.0/translate-request', description: 'DEV-Translate text or a document' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/translate-response', description: 'DEV-Response to translate request' },
        // Financial and security
        { typeUri: 'https://didcomm.org/app-intent/1.0/pay-request', description: 'DEV-Authorize/execute a payment' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/pay-response', description: 'DEV-Response to pay request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/sign-request', description: 'DEV-Produce a digital signature' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/sign-response', description: 'DEV-Response to sign request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/verify-signature-request', description: 'DEV-Verify a signature' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/verify-signature-response', description: 'DEV-Response to verify signature request' },
        // Crypto operations
        { typeUri: 'https://didcomm.org/app-intent/1.0/encrypt-request', description: 'DEV-Encrypt a payload' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/encrypt-response', description: 'DEV-Response to encrypt request' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/decrypt-request', description: 'DEV-Decrypt a payload' },
        { typeUri: 'https://didcomm.org/app-intent/1.0/decrypt-response', description: 'DEV-Response to decrypt request' },
      ],
      requireAllMessageTypes: false,
    },
  ];

  let result, error = null;
  try {
    result = await msgr.requestDidcommPermissions(requests);
  } catch (err) {
    error = err;
  }

  const pass = error === null && result && typeof result === 'object';
  return { pass, request: { requests }, response: result, error: error ? String(error) : null };
}


