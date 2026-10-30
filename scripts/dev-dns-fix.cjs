/**
 * Dev-only DNS workaround — loaded via NODE_OPTIONS=--require by scripts/run-dev.js.
 *
 * Some ISPs/networks intercept DNS and return a bogus address for *.supabase.co,
 * which makes every database call fail locally ("fetch failed") even though the
 * Supabase project is fine. For *.supabase.co only, this resolves the hostname via
 * DNS-over-HTTPS (Cloudflare) instead, and falls back to the normal resolver if
 * that lookup fails. It never runs in production (Vercel does not use run-dev.js).
 */
const dns = require('dns');

const originalLookup = dns.lookup;
const cache = new Map(); // host -> { addrs: string[], expires: number }

async function resolveViaDoh(host) {
  const hit = cache.get(host);
  if (hit && hit.expires > Date.now()) return hit.addrs;
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${host}&type=A`, {
    headers: { accept: 'application/dns-json' },
  });
  const json = await res.json();
  const addrs = (json.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data);
  if (!addrs.length) throw new Error('no A records');
  cache.set(host, { addrs, expires: Date.now() + 5 * 60 * 1000 });
  return addrs;
}

dns.lookup = function patchedLookup(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  if (typeof options === 'number') options = { family: options };
  options = options || {};

  if (typeof hostname === 'string' && hostname.endsWith('.supabase.co')) {
    resolveViaDoh(hostname).then(
      (addrs) => {
        if (options.all) callback(null, addrs.map((address) => ({ address, family: 4 })));
        else callback(null, addrs[Math.floor(Math.random() * addrs.length)], 4);
      },
      () => originalLookup.call(dns, hostname, options, callback),
    );
    return;
  }
  return originalLookup.call(dns, hostname, options, callback);
};
