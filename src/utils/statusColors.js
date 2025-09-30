// Consistent status color mapping for backgrounds and text

const COLORS = {
  pass: { bg: '#d4edda', text: '#155724', hoverBg: '#c3e6cb' },
  fail: { bg: '#f8d7da', text: '#721c24', hoverBg: '#f1c0c4' },
  error: { bg: '#f8d7da', text: '#721c24', hoverBg: '#f1c0c4' },
  running: { bg: '#fff3cd', text: '#856404', hoverBg: '#ffe8a1' },
  idle: { bg: '#e9ecef', text: '#495057', hoverBg: '#dee2e6' },
  primary: { bg: '#ff6a00', text: '#ffffff', hoverBg: '#e85d00' }
};

export function getStatusColor(status) {
  if (!status) return COLORS.idle;
  const key = String(status).toLowerCase();
  return COLORS[key] || COLORS.idle;
}

export function getButtonStyleForStatus(status) {
  const c = getStatusColor(status);
  return {
    backgroundColor: c.bg,
    color: c.text
  };
}


