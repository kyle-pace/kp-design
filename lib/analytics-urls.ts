// Keeps what people type out of analytics. A search page puts the search in its address
// ("/?q=what+can+i+make+with+onions"), and Amplitude copies the address onto every event:
// the page view's location, the page a click happened on, the referrer, a link's href.
// scrubEvent() runs on every event just before it is sent and cuts each address down to
// its host and path. Campaign tags (utm_source and friends) stay, because they come from
// the link someone followed, not from anything they typed.
//
// No imports, so `node --test` can run this file as it is.

/** "https://x.test/a?q=typed&utm_source=news#part" becomes "https://x.test/a?utm_source=news". */
export function cleanUrl(url: string): string {
  const hash = url.indexOf('#');
  const noHash = hash === -1 ? url : url.slice(0, hash);
  const mark = noHash.indexOf('?');
  if (mark === -1) return noHash;
  const kept = noHash
    .slice(mark + 1)
    .split('&')
    .filter((pair) => /^utm_[a-z0-9_]+=/i.test(pair));
  return noHash.slice(0, mark) + (kept.length ? `?${kept.join('&')}` : '');
}

// Amplitude's own properties that hold an address whatever the value looks like:
// "[Amplitude] Page Location", "[Amplitude] Page URL", "[Amplitude] Previous Page
// Location", "[Amplitude] Element Href", "[Amplitude] URL", "[Amplitude] Form Destination",
// and the referrer user properties. A site's own property called "location" is left alone
// unless its value is an address.
const URL_KEY = /^(\[Amplitude\] .*(location|url|href|destination)|(initial_)?referrer)$/i;
// A request's query string and fragment, sent on their own by network capture.
const QUERY_KEY = /^\[Amplitude\] .*(url query|url fragment)$/i;
// Inside one of Amplitude's own properties ("[Amplitude] Element Hierarchy" lists each
// element's attributes), the attributes that hold an address.
const URL_ATTRIBUTE = /^(href|src|action|formaction|url)$/i;
const LOOKS_LIKE_URL = /^(https?:)?\/\//i;

// `own` is true inside a property Amplitude itself filled in.
function scrubValue(key: string, value: unknown, depth: number, own: boolean): unknown {
  if (typeof value === 'string') {
    if (QUERY_KEY.test(key)) return cleanUrl(`?${value.replace(/^[?#]/, '')}`).slice(1);
    if (URL_KEY.test(key) || (own && URL_ATTRIBUTE.test(key)) || LOOKS_LIKE_URL.test(value)) return cleanUrl(value);
    return value;
  }
  if (depth >= 6) return value;
  if (Array.isArray(value)) return value.map((item) => scrubValue(key, item, depth + 1, own));
  if (value && typeof value === 'object') return scrubProperties(value as Record<string, unknown>, depth + 1, own);
  return value;
}

function scrubProperties(properties: Record<string, unknown>, depth = 0, own = false): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    out[key] = scrubValue(key, value, depth, own || key.startsWith('[Amplitude]'));
  }
  return out;
}

/**
 * Returns the event with every address in its event and user properties cleaned. User
 * properties arrive wrapped in operations ({ $set: { referrer: … }, $setOnce: { … } }),
 * which is why this walks nested objects.
 */
export function scrubEvent<T extends { event_properties?: unknown; user_properties?: unknown }>(event: T): T {
  for (const field of ['event_properties', 'user_properties'] as const) {
    const properties = event[field];
    if (properties && typeof properties === 'object') {
      (event as Record<string, unknown>)[field] = scrubProperties(properties as Record<string, unknown>);
    }
  }
  return event;
}

function scrubReplayNode(value: unknown, depth: number): unknown {
  if (depth > 200) return value;
  if (Array.isArray(value)) return value.map((item) => scrubReplayNode(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] =
      typeof item === 'string' && /^(href|action|formaction|url|pageUrl)$/.test(key)
        ? cleanUrl(item)
        : scrubReplayNode(item, depth + 1);
  }
  return out;
}

/**
 * Session Replay uploads `{ events: ["<one recorded event as JSON>", …] }`. Each event can
 * hold the page's address (when recording starts and whenever the address changes) and
 * the href of every link on the page. This cleans those and leaves the rest as it was.
 * An event that can't be read is left out rather than sent unchecked; a body that can't be
 * read at all returns null, and the caller sends nothing.
 */
export function cleanReplayBody(body: string): string | null {
  try {
    const payload = JSON.parse(body);
    if (!payload || !Array.isArray(payload.events)) return null;
    payload.events = payload.events.flatMap((event: unknown) => {
      try {
        const clean = scrubReplayNode(typeof event === 'string' ? JSON.parse(event) : event, 0);
        return [typeof event === 'string' ? JSON.stringify(clean) : clean];
      } catch {
        return [];
      }
    });
    return JSON.stringify(payload);
  } catch {
    return null;
  }
}
