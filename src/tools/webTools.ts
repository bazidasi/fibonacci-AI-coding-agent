import type { ToolDefinition } from '../types';
import { schema } from '../core/toolRegistry';
import type { ToolRegistry } from '../core/toolRegistry';
import { lookup as dnsLookup } from 'node:dns/promises';

/**
 * Web tools:
 *  - web_fetch: fetch a URL and return cleaned text/markdown
 *  - web_search: web search (uses a configurable search backend)
 *
 * Both are read-only and auto-approved.
 */

export const webToolDefinitions: ToolDefinition[] = [
  {
    name: 'web_fetch',
    category: 'web',
    description:
      'Fetch a URL and return the response body as cleaned text. HTML pages are stripped to their text content with tags removed. JSON is returned as pretty-printed JSON. Other content types are returned as-is (truncated to max_length). Useful for reading documentation, API responses, or any public web page.',
    parameters: schema(
      {
        url: { type: 'string', description: 'The URL to fetch (http:// or https://)' },
        max_length: {
          type: 'number',
          description: 'Maximum characters to return (default: 20000)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 15000)',
        },
      },
      ['url']
    ),
    requiresApproval: false,
    readOnly: true,
    tags: ['web', 'read'],
  },
  {
    name: 'web_search',
    category: 'web',
    description:
      'Search the web for a query and return up to max_results results (title, URL, snippet). Useful for finding documentation, error messages, package info, or current information beyond your training cutoff.',
    parameters: schema(
      {
        query: { type: 'string', description: 'Search query' },
        max_results: {
          type: 'number',
          description: 'Maximum number of results (default: 5, max: 10)',
        },
      },
      ['query']
    ),
    requiresApproval: false,
    readOnly: true,
    tags: ['web', 'search'],
  },
];

export function registerWebTools(registry: ToolRegistry): void {
  registry.register(webToolDefinitions[0], async (args, ctx) => {
    const url = String(args.url);
    const maxLength = Number(args.max_length ?? 20000);
    const timeout = Number(args.timeout ?? 15000);

    if (!/^https?:\/\//i.test(url)) {
      return {
        ok: false,
        output: `Invalid URL: must start with http:// or https:// (got: ${url})`,
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const onAbort = () => controller.abort();
      ctx?.signal?.addEventListener('abort', onAbort, { once: true });

      // FIX (SSRF): follow redirects manually so every hop is re-validated,
      // and stream the body with a hard byte cap instead of buffering the
      // whole response via resp.text().
      let currentUrl = url;
      let resp: Response | null = null;
      const MAX_REDIRECTS = 3;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        await assertSafeUrl(currentUrl);
        resp = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: 'manual',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; FibonacciAgent/1.0; +https://fibonacci.monster)',
            Accept: 'text/html,application/json,text/plain,text/markdown,*/*',
          },
        });
        if (resp.status >= 300 && resp.status < 400) {
          const loc = resp.headers.get('location');
          const status = resp.status;
          // Drain and release the redirect body before hopping.
          await resp.body?.cancel().catch(() => {});
          resp = null;
          if (!loc) throw new Error(`Redirect ${status} without Location header`);
          if (hop === MAX_REDIRECTS) throw new Error('Too many redirects');
          currentUrl = new URL(loc, currentUrl).toString();
          continue;
        }
        break;
      }
      try {
        if (!resp || !resp.ok) {
          return {
            ok: false,
            output: `HTTP ${resp ? `${resp.status} ${resp.statusText}` : 'no response'} for ${currentUrl}`,
          };
        }

        const contentType = resp.headers.get('content-type') ?? '';
        // Hard cap on downloaded bytes — protects against multi-GB responses.
        const { text, byteTruncated } = await readBodyCapped(resp, 2_000_000);
        let cleaned: string;

        if (contentType.includes('application/json')) {
          try {
            cleaned = JSON.stringify(JSON.parse(text), null, 2);
          } catch {
            cleaned = text;
          }
        } else if (contentType.includes('text/html')) {
          cleaned = htmlToText(text);
        } else {
          cleaned = text;
        }

        const truncated = cleaned.length > maxLength || byteTruncated;
        const result = truncated ? cleaned.slice(0, maxLength) + '\n[...truncated...]' : cleaned;

        return {
          ok: true,
          output: `[${resp.status} ${contentType || 'unknown'}] ${currentUrl}\n\n${result}`,
          meta: {
            url: currentUrl,
            status: resp.status,
            contentType,
            length: cleaned.length,
            truncated,
          },
        };
      } finally {
        clearTimeout(timer);
        ctx?.signal?.removeEventListener('abort', onAbort);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, output: `Fetch failed for ${url}: ${msg}` };
    }
  });

  registry.register(webToolDefinitions[1], async (args, ctx) => {
    const query = String(args.query);
    const maxResults = Math.min(10, Math.max(1, Number(args.max_results ?? 5)));

    // We don't ship a search backend; instead, we use a public search API
    // (DuckDuckGo's HTML endpoint) and parse the results. This is a best-effort
    // implementation — for production use, configure a proper search API key.
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const onAbort = () => controller.abort();
      ctx?.signal?.addEventListener('abort', onAbort, { once: true });

      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      let resp: Response;
      try {
        resp = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; FibonacciAgent/1.0; +https://fibonacci.monster)',
          },
        });
        if (!resp.ok) {
          return {
            ok: false,
            output: `Search failed: HTTP ${resp.status} ${resp.statusText}`,
          };
        }

        const { text: html } = await readBodyCapped(resp, 2_000_000);
        const results = parseDuckDuckGoHtml(html, maxResults);

        if (results.length === 0) {
          return {
            ok: true,
            output: `No results found for: ${query}`,
          };
        }

        const lines = results.map(
          (r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`
        );
        return {
          ok: true,
          output: `[search: ${query}]\n\n${lines.join('\n\n')}`,
        };
      } finally {
        clearTimeout(timer);
        ctx?.signal?.removeEventListener('abort', onAbort);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, output: `Search error: ${msg}` };
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FIX (SSRF): validate a URL before fetching.
 * Blocks private/loopback/link-local targets including IP-literal tricks
 * (decimal/hex/octal IPv4, IPv4-mapped IPv6) AND hostnames that resolve to
 * private addresses (DNS-rebinding). Called for every redirect hop.
 */
async function assertSafeUrl(urlStr: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error(`Invalid URL: ${urlStr}`);
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error(`Blocked: only http/https protocols are allowed (got ${parsed.protocol})`);
  }

  let hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  // Strip trailing dot (FQDN form of localhost etc.)
  hostname = hostname.replace(/\.$/, '');
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error(`Blocked: requests to internal hosts are not allowed (${hostname})`);
  }

  if (isPrivateIpv4Literal(hostname)) {
    throw new Error(`Blocked: requests to private/internal addresses are not allowed (${hostname})`);
  }
  if (isPrivateIpv6Literal(hostname)) {
    throw new Error(`Blocked: requests to private/internal addresses are not allowed (${hostname})`);
  }

  // Resolve DNS and check every returned address (anti-rebinding).
  // Only hostnames that look like names (not raw IPs) need lookup.
  if (!/^[\d.]+$/.test(hostname) && hostname.includes(':') === false) {
    try {
      const addrs = await dnsLookup(hostname, { all: true, verbatim: true });
      for (const a of addrs) {
        if (a.family === 4 ? isPrivateIpv4Literal(a.address) : isPrivateIpv6Literal(a.address)) {
          throw new Error(
            `Blocked: "${hostname}" resolves to a private/internal address (${a.address})`
          );
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Blocked:')) throw err;
      // DNS failure will surface naturally from fetch itself
    }
  }
}

function ipv4ToInt(parts: number[]): number | null {
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/** True if the string is an IPv4 literal (incl. decimal/hex/octal encodings) in a blocked range. */
export function isPrivateIpv4Literal(host: string): boolean {
  let n: number | null = null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    n = ipv4ToInt(host.split('.').map((p) => parseInt(p, 10)));
  } else if (host.includes('.')) {
    // Mixed-radix forms like 0x7f.0.0.1 or 0177.0.0.1
    const parts = host.split('.').map((p) => parseInt(p, 0));
    n = ipv4ToInt(parts);
  } else if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    // Decimal integer form (e.g. 2130706433) or hex form (0x7f000001)
    const v = parseInt(host, 0);
    if (Number.isFinite(v) && v >= 0 && v <= 0xffffffff) n = v >>> 0;
  }
  if (n === null) return false;
  const a = (n >>> 24) & 0xff;
  const b = (n >>> 16) & 0xff;
  const c = (n >>> 12) & 0xff;
  const top4 = (n >>> 28) & 0xf;
  return (
    a === 0 ||                       // 0.0.0.0/8 "this network"
    a === 10 ||                      // 10/8 private
    a === 127 ||                     // loopback
    (a === 169 && b === 254) ||      // link-local 169.254/16
    (a === 172 && c >= 16 && c <= 31) || // 172.16/12 private
    (a === 192 && b === 168) ||      // 192.168/16 private
    (a === 100 && b >= 64 && b <= 127) || // 100.64/10 CGNAT
    top4 >= 14                       // 224/4 multicast + 240/4 reserved
  );
}

export function isPrivateIpv6Literal(host: string): boolean {
  const h = host.toLowerCase();
  if (h === '::' || h === '::1') return true;
  // IPv4-mapped / compatible (::ffff:127.0.0.1)
  const mapped = h.match(/^::ffff:(.+)$/);
  if (mapped) return isPrivateIpv4Literal(mapped[1]);
  if (/^f[cd]/.test(h)) return true;   // fc00::/7 unique-local
  if (/^fe[89ab]/.test(h)) return true; // fe80::/10 link-local
  if (/^ff/.test(h)) return true;       // multicast
  return false;
}

/** Stream-read a response body with a hard byte cap (no unbounded buffering). */
async function readBodyCapped(
  resp: Response,
  capBytes: number
): Promise<{ text: string; byteTruncated: boolean }> {
  if (!resp.body) return { text: '', byteTruncated: false };
  const reader = resp.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  let byteTruncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > capBytes) {
      byteTruncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(Buffer.from(value));
  }
  return { text: Buffer.concat(chunks).toString('utf-8'), byteTruncated };
}

/** Very simple HTML-to-text conversion: strip tags, decode entities, collapse whitespace. */
function htmlToText(html: string): string {
  // Remove script and style blocks entirely
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  // Replace block-level tags with newlines
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|br|hr|ul|ol|table)>/gi, '\n');
  s = s.replace(/<(br|hr)\s*\/?>/gi, '\n');
  // Strip all remaining tags
  s = s.replace(/<[^>]+>/g, '');
  // Decode common entities
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
  // Collapse whitespace
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function parseDuckDuckGoHtml(html: string, max: number): SearchResult[] {
  const results: SearchResult[] = [];
  // DuckDuckGo HTML results have anchors with class "result__a" and snippets
  // with class "result__snippet". We use regex (best-effort).
  const re =
    /<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && results.length < max) {
    const rawUrl = m[1];
    const title = stripTags(m[2]).trim();
    const snippet = stripTags(m[3]).trim();
    // DuckDuckGo redirects through /l/?uddg=...
    let url = rawUrl;
    const u = rawUrl.match(/uddg=([^&]+)/);
    if (u) {
      try {
        url = decodeURIComponent(u[1]);
      } catch {
        /* keep raw */
      }
    }
    if (title && url) {
      results.push({ title, url, snippet });
    }
  }
  return results;
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
