// Run with `npm test`. Browser names below are the ones seen in Kyle's Amplitude projects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { looksAutomated } from '../lib/automation.ts';

const people = {
  'iPhone Safari': ['Mozilla/5.0 (iPhone; CPU iPhone OS 27_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1', 'iPhone'],
  'iPhone Chrome': ['Mozilla/5.0 (iPhone; CPU iPhone OS 27_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/144.0.0.0 Mobile/15E148 Safari/604.1', 'iPhone'],
  'iPhone Firefox': ['Mozilla/5.0 (iPhone; CPU iPhone OS 27_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/153.0 Mobile/15E148 Safari/605.1.15', 'iPhone'],
  'Mac Safari': ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15', 'MacIntel'],
  'Mac Chrome': ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', 'MacIntel'],
  'Windows Chrome': ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36', 'Win32'],
  'Windows Edge': ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0', 'Win32'],
  'Windows Firefox': ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0', 'Win32'],
  'Android phone Chrome': ['Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36', 'Linux armv81'],
  'Chromebook': ['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36', 'Linux x86_64'],
};

const machines = {
  'webdriver flag': ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', 'MacIntel', true],
  'headless Chrome': ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36', 'Linux x86_64'],
  'agent browser on Linux': ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36', 'Linux x86_64'],
  'phone emulation on a desktop': ['Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36', 'Linux x86_64'],
  'Chrome 117 crawler': ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36', 'Win32'],
  'Chrome 79 crawler': ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36', 'Win32'],
  'legacy Edge': ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240', 'Win32'],
  'Firefox 109 crawler': ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0', 'Win32'],
  'Firefox 3': ['Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.2) Gecko/20100115 Firefox/3.6', ''],
  'Iceweasel': ['Mozilla/5.0 (X11; Linux i686; rv:19.0) Gecko/20100101 Iceweasel/19.0', ''],
  'Opera Mini': ['Opera/9.80 (Android; Opera Mini/7.5.33361/31.1448; U; en) Presto/2.8.119 Version/11.1010', ''],
  'Safari on Windows': ['Mozilla/5.0 (Windows NT 6.1) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Safari/536.26', 'Win32'],
  'Mobile Safari 5': ['Mozilla/5.0 (iPad; CPU OS 5_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9B176 Safari/7534.48.3', 'iPad'],
  'Sogou spider': ['Sogou web spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)', ''],
  'no user agent': ['', ''],
};

for (const [name, [ua, platform]] of Object.entries(people)) {
  test(`counts a person: ${name}`, () => assert.equal(looksAutomated(ua, platform), false));
}
for (const [name, [ua, platform, webdriver]] of Object.entries(machines)) {
  test(`skips a machine: ${name}`, () => assert.equal(looksAutomated(ua, platform, webdriver ?? false), true));
}
