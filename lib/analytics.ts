// Amplitude analytics, set up the private way every one of Kyle's sites uses:
// autocapture, no IP address, an ID kept in localStorage (no cookies), off for Global
// Privacy Control, Do Not Track or the site's opt-out, and only on the live domain.
// Automated browsers and crawlers send nothing, and Kyle's own browsers are tagged
// `internal_user: true` (open any page with ?internal=on once) so charts can leave them out.
// Session Replay records a small share of sessions with everything masked, and its code
// only loads for those sessions.
//
// Each site calls startAnalytics() with its own project's browser key and live hosts.
// This is the only code that talks to Amplitude, so switching tools means changing it.

import * as amplitude from '@amplitude/analytics-browser';

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
  amplitude.setOptOut(optOut);
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

export async function startAnalytics({ apiKey, liveHosts, replayRate = 0.05 }: AnalyticsOptions) {
  // Runs first everywhere, so ?internal=on is remembered and tidied away even where nothing is sent.
  const internal = isInternalBrowser();
  if (!apiKey) return;
  if (!liveHosts.includes(location.hostname)) return;
  if (browserSaysNo() || isOptedOut() || isAutomated()) return;

  if (inReplaySample(replayRate)) {
    const { sessionReplayPlugin } = await import('@amplitude/plugin-session-replay-browser');
    amplitude.add(sessionReplayPlugin({ sampleRate: 1, privacyConfig: { defaultMaskLevel: 'conservative' } }));
  }

  amplitude.init(apiKey, {
    autocapture: true,
    identityStorage: 'localStorage',
    trackingOptions: { ipAddress: false },
  });
  amplitude.identify(new amplitude.Identify().set('internal_user', internal));
}

/** Custom events, in Title Case, past-tense verb first ("Clicked Resume"). */
export function track(event: string, properties?: Record<string, unknown>) {
  amplitude.track(event, properties);
}
