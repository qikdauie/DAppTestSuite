export function toJsonSafe(root) {
  const ancestors = new WeakSet();
  function sanitize(value) {
    if (typeof value === 'bigint') return value.toString();
    if (value == null) return value;
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') return value;
    if (t === 'function' || t === 'symbol') return undefined;
    if (value instanceof Date) return value.toISOString();
    if (t === 'object') {
      if (ancestors.has(value)) return undefined; // drop only true cycles
      ancestors.add(value);
      try {
        if (Array.isArray(value)) {
          const arr = value.map(sanitize);
          return arr;
        }
        const out = {};
        for (const [k, v] of Object.entries(value)) {
          const s = sanitize(v);
          if (s !== undefined) out[k] = s;
        }
        return out;
      } finally {
        ancestors.delete(value);
      }
    }
    try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
  }
  return sanitize(root);
}


