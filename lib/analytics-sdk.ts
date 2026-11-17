// The half of analytics that holds Amplitude's SDK. lib/analytics.ts loads this file with
// import() once the page is idle, and only where analytics is allowed to run, so nothing
// here is part of a page's first load. Don't import it from anywhere else.

import * as amplitude from '@amplitude/analytics-browser';
import { cleanReplayBody, scrubEvent } from './analytics-urls';

type Payload = { events?: Parameters<typeof scrubEvent>[0][] };
type Transport = { send: (serverUrl: string, payload: Payload, ...rest: unknown[]) => Promise<unknown> };

// Cleans each event's addresses as Amplitude's plugins hand it along. Amplitude runs
// plugins in the order they were added, and several of its own add the page's address,
// so this is added twice: before init (in place for the very first event) and after it
// (behind Amplitude's own plugins).
const cleanAddresses = (name: string, setup?: (config: unknown) => Promise<void>) => ({
  name,
  type: 'enrichment' as const,
  setup,
  execute: async <T extends Parameters<typeof scrubEvent>[0]>(event: T) => scrubEvent(event),
});

// The last gate: whatever is about to be sent, however it got there (an event Amplitude
// built during init, one saved from an earlier visit and retried), is cleaned again at the
// moment of sending. Amplitude swaps its transport when the page is closing, so this
// replaces the config's `transportProvider` with a property that always answers with the
// guarded one.
function guardTransport(config: { transportProvider: Transport }) {
  let inner = config.transportProvider;
  const guarded: Transport = {
    send(serverUrl, payload, ...rest) {
      payload?.events?.forEach(scrubEvent);
      return inner.send(serverUrl, payload, ...rest);
    },
  };
  Object.defineProperty(config, 'transportProvider', {
    configurable: true,
    enumerable: true,
    get: () => guarded,
    set: (next: Transport) => {
      inner = next;
    },
  });
}

const through = (data: BlobPart, stream: TransformStream<Uint8Array, Uint8Array>) =>
  new Response(new Blob([data]).stream().pipeThrough(stream));

// Session Replay masks all text and every input, but it records the page's address and
// each link's href as they are and has no setting to trim them. It does let a site send
// its uploads itself, so this unpacks each one, cleans the addresses and sends it on. If
// an upload can't be read it is not sent.
async function sendReplay(request: {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string | Uint8Array;
  keepalive: boolean;
}): Promise<Response> {
  const { url, method, headers, body, keepalive } = request;
  const zipped = typeof body !== 'string';
  const text = zipped ? await through(body as BlobPart, new DecompressionStream('gzip')).text() : body;
  const clean = cleanReplayBody(text);
  // Answering "accepted" stops the SDK retrying an upload that will never be sent.
  if (clean === null) return new Response('{}', { status: 200 });
  const out = zipped ? await through(clean, new CompressionStream('gzip')).arrayBuffer() : clean;
  return fetch(url, { method, headers, body: out, keepalive });
}

export async function start(apiKey: string, { internal, replay }: { internal: boolean; replay: boolean }) {
  // test/analytics-e2e.mjs checks all of this against the real SDK in a browser.
  amplitude.add(
    cleanAddresses('kp-private-urls', async (config) => guardTransport(config as { transportProvider: Transport })),
  );

  if (replay) {
    const { sessionReplayPlugin } = await import('@amplitude/plugin-session-replay-browser');
    amplitude.add(
      sessionReplayPlugin({
        sampleRate: 1,
        privacyConfig: { defaultMaskLevel: 'conservative' },
        handleSendEvents: sendReplay,
      }),
    );
  }

  await amplitude.init(apiKey, {
    // Everything `autocapture: true` turns on, spelled out so page views can be set:
    // 'pathOnly' counts a new page view when the path changes, not when only the query
    // string does (a search page rewriting its own address as someone types).
    autocapture: {
      attribution: true,
      pageViews: { trackHistoryChanges: 'pathOnly' },
      sessions: true,
      formInteractions: true,
      fileDownloads: true,
      elementInteractions: true,
      frustrationInteractions: true,
      networkTracking: true,
      webVitals: true,
      pageUrlEnrichment: true,
    },
    identityStorage: 'localStorage',
    trackingOptions: { ipAddress: false },
  }).promise;
  amplitude.add(cleanAddresses('kp-private-urls-last'));
  amplitude.identify(new amplitude.Identify().set('internal_user', internal));
}

/** `time` is when the event happened, for events held while this file was loading. */
export function track(event: string, properties?: Record<string, unknown>, time?: number) {
  amplitude.track(event, properties, time ? { time } : undefined);
}

export function setOptOut(optOut: boolean) {
  amplitude.setOptOut(optOut);
}
