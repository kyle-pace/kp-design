// The page script test/analytics-e2e.mjs bundles: what a site's layout does.
import { startAnalytics, track } from '../lib/analytics';

declare global {
  interface Window {
    kpReady?: boolean;
    kpTrack?: typeof track;
    kpReplayRate?: number;
  }
}

// A custom event before startAnalytics has even run, like a page script that loads first.
track('Opened Test Page', { step: 1 });
window.kpTrack = track;
startAnalytics({ apiKey: 'test-key', liveHosts: ['kp.test'], replayRate: window.kpReplayRate ?? 0 }).then(() => {
  window.kpReady = true;
});
