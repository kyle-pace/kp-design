// Amplitude analytics, set up the private way every one of Kyle's sites uses:
// autocapture, no IP address, an ID kept in localStorage (no cookies), off for Global
// Privacy Control, Do Not Track or the site's opt-out, and only on the live domain.
// Automated browsers and crawlers send nothing, and Kyle's own browsers are tagged
// `internal_user: true` (open any page with ?internal=on once) so charts can leave them out.
// Page addresses are recorded without their query string or fragment, so a search someone
// typed ("/?q=…") never leaves the browser (lib/analytics-urls.ts).
// Clicks are recorded without the labels, titles and data-* values of the elements around
// them, which is where a page writes what was typed ("Remove no cilantro").
// Session Replay records a small share of sessions with all text and inputs masked and
// addresses cleaned the same way, and its code only loads for those sessions.
//
// Each site calls startAnalytics() with its own project's browser key and live hosts.
// This file is small on purpose: it decides whether analytics runs, and only then, once
// the page is idle, loads Amplitude's code (lib/analytics-sdk.ts) as a separate file. So
// the SDK never counts against a page's JavaScript budget or delays its first paint.
// These two files are the only code that talks to Amplitude, so switching tools means
// changing them.

type Sdk = typeof import('./analytics-sdk');

export interface AnalyticsOptions {
  /** The Amplitude project's browser API key. Public by design (every page sends it). */
  apiKey: string;
  /** Hostnames analytics runs on. Anywhere else (localhost, previews) sends nothing. */
  liveHosts: string[];
  /** Share of sessions recorded as a masked Session Replay. 0 turns it off. Default 0.05. */
  replayRate?: number;
}

const OPT_OUT_KEY = 'kp-analytics-opt-out';
const REPLAY_KEY = 'kp-replay';
const INTERNAL_KEY = 'kp-internal';

/**
 * Headless and automated browsers: Playwright, Puppeteer and Selenium set navigator.webdriver;
 * headless Chrome, Lighthouse and crawlers name themselves in the user agent.
 */
export function isAutomated(): boolean {
  if (navigator.webdriver === true) return true;
  return /HeadlessChrome|Lighthouse|bot\/|crawl|spider|slurp|facebookexternalhit/i.test(navigator.userAgent || '');
}

/**
 * Reads ?internal=on or ?internal=off, remembers the answer in this browser and removes the
 * parameter from the address. Returns whether this browser is marked as one of Kyle's own.
 */
export function isInternalBrowser(): boolean {
  try {
    const url = new URL(location.href);
    const flag = url.searchParams.get('internal');
    if (flag === 'on') localStorage.setItem(INTERNAL_KEY, '1');
    if (flag === 'off') localStorage.removeItem(INTERNAL_KEY);
    if (flag !== null) {
      url.searchParams.delete('internal');
      history.replaceState(history.state, '', url);
    }
    return localStorage.getItem(INTERNAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function isOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setOptOut(optOut: boolean) {
  try {
    if (optOut) localStorage.setItem(OPT_OUT_KEY, '1');
    else localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // Storage can be unavailable (private modes); nothing to remember then.
  }
  if (optOut) {
    // Nothing waiting is sent, and Amplitude's code is not loaded if it hasn't been yet.
    waiting.length = 0;
    if (state !== 'on') state = 'off';
  }
  sdk?.setOptOut(optOut);
}

function browserSaysNo(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1';
}

function inReplaySample(rate: number): boolean {
  if (rate <= 0) return false;
  try {
    let pick = sessionStorage.getItem(REPLAY_KEY);
    if (pick === null) {
      pick = Math.random() < rate ? '1' : '0';
      sessionStorage.setItem(REPLAY_KEY, pick);
    }
    return pick === '1';
  } catch {
    return false;
  }
}

// 'idle': startAnalytics hasn't run yet. 'waiting': it will load when the page is idle.
// 'loading': Amplitude's code is on its way. 'on': events go straight to it. 'off':
// nothing is sent on this page.
let state: 'idle' | 'waiting' | 'loading' | 'on' | 'off' = 'idle';
let sdk: Sdk | null = null;
let load: (() => Promise<void>) | null = null;
let loaded: Promise<void> | null = null;
// Custom events tracked before Amplitude's code has loaded, with the time they happened.
const waiting: { event: string; properties?: Record<string, unknown>; time: number }[] = [];
const MAX_WAITING = 50;

function whenIdle(run: () => void) {
  const idle = () => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 3000 });
    else setTimeout(run, 300);
  };
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}

function loadNow(): Promise<void> {
  if (loaded) return loaded;
  if (!load || state !== 'waiting') return Promise.resolve();
  state = 'loading';
  loaded = load().catch(() => {
    // Offline, or a blocker stopped the file: no analytics on this page.
    state = 'off';
    waiting.length = 0;
  });
  return loaded;
}

/**
 * Decides whether analytics runs here and, if it does, loads Amplitude once the page is
 * idle (or at the first custom event, whichever comes first). The promise settles when
 * analytics is running or has been ruled out.
 */
export function startAnalytics({ apiKey, liveHosts, replayRate = 0.05 }: AnalyticsOptions): Promise<void> {
  if (state !== 'idle') return loaded ?? Promise.resolve();
  // Runs first everywhere, so ?internal=on is remembered and tidied away even where nothing is sent.
  const internal = isInternalBrowser();
  if (!apiKey || !liveHosts.includes(location.hostname) || browserSaysNo() || isOptedOut() || isAutomated()) {
    state = 'off';
    waiting.length = 0;
    return Promise.resolve();
  }
  state = 'waiting';
  load = async () => {
    const module = await import('./analytics-sdk');
    // The opt-out may have been switched on while the page sat idle.
    if (state === 'off' || isOptedOut()) {
      state = 'off';
      return;
    }
    await module.start(apiKey, { internal, replay: inReplaySample(replayRate) });
    sdk = module;
    state = 'on';
    for (const { event, properties, time } of waiting.splice(0)) module.track(event, properties, time);
  };
  return new Promise((resolve) => {
    whenIdle(() => void loadNow().then(resolve));
    if (waiting.length) void loadNow().then(resolve);
  });
}

/** Custom events, in Title Case, past-tense verb first ("Clicked Resume"). */
export function track(event: string, properties?: Record<string, unknown>) {
  if (state === 'off') return;
  if (sdk && state === 'on') {
    sdk.track(event, properties);
    return;
  }
  // Held until Amplitude's code arrives. Someone is using the page, so fetch it now
  // instead of waiting for an idle moment.
  if (waiting.length < MAX_WAITING) waiting.push({ event, properties, time: Date.now() });
  void loadNow();
}
