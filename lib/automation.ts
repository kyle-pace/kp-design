// Decides whether a browser is almost certainly not a person, so analytics sends nothing.
// Kept apart from analytics.ts with no browser globals, so it can be tested in Node, and so
// Seattle Grocery Deals (which doesn't use kp-design) can keep a copy that matches.
//
// What a November 2026 look at every project's visitors turned up:
// - Agent and cloud browsers (screenshot and check runs) that don't set navigator.webdriver
//   and don't say "Headless": desktop Chrome on Linux, and phone emulation, which claims to be
//   Android while running on an x86 machine.
// - Crawlers wearing years-old browser names: Chrome 117 and older, legacy Edge, Firefox 3,
//   Iceweasel, Opera Mini, NetFront, Safari on Windows, Mobile Safari 5.
// The cost: the few real people browsing on desktop Linux aren't counted. ChromeOS and
// Android phones are.

/** Oldest major versions still treated as a person's everyday browser (2023 releases). */
export const OLDEST_CHROME = 120;
export const OLDEST_FIREFOX = 115;
export const OLDEST_IOS_SAFARI = 15;

const SELF_NAMED = /HeadlessChrome|Lighthouse|bot\/|bot;|crawl|spider|slurp|facebookexternalhit|Sogou/i;
const RETIRED = /Edge\/\d|Iceweasel|Opera Mini|NetFront|MSIE |Trident\//;

function major(ua: string, pattern: RegExp): number | null {
  const m = ua.match(pattern);
  return m ? Number(m[1]) : null;
}

/**
 * True for crawlers, automated and emulated browsers.
 * `ua` is navigator.userAgent; `platform` is navigator.platform (empty is fine).
 */
export function looksAutomated(ua: string, platform = '', webdriver = false): boolean {
  if (webdriver) return true;
  if (!ua) return true;
  if (SELF_NAMED.test(ua) || RETIRED.test(ua)) return true;

  const android = /Android/.test(ua);
  // Desktop Linux: in practice cloud and agent browsers. Android and ChromeOS also say Linux.
  if (/\bLinux\b/.test(ua) && !android && !/CrOS/.test(ua)) return true;
  // Phone emulation: an Android browser running on an Intel/AMD desktop.
  if (android && /x86|i686|Win|Mac/i.test(platform)) return true;

  const chrome = major(ua, /(?:Chrome|CriOS)\/(\d+)/);
  if (chrome !== null && chrome < OLDEST_CHROME) return true;
  const firefox = major(ua, /Firefox\/(\d+)/);
  if (firefox !== null && !/FxiOS/.test(ua) && firefox < OLDEST_FIREFOX) return true;
  // Safari only ever ran on Apple devices; on Windows it's a crawler.
  if (/Windows/.test(ua) && /Safari\//.test(ua) && !/Chrome|CriOS|Firefox|Edg/.test(ua)) return true;
  if (/iPhone|iPad|iPod/.test(ua)) {
    const ios = major(ua, /Version\/(\d+)/);
    if (ios !== null && ios < OLDEST_IOS_SAFARI) return true;
  }
  return false;
}
