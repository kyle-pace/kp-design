// Run with `npm test` (Node 23.6 or newer, which reads TypeScript files directly).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanReplayBody, cleanUrl, scrubEvent } from '../lib/analytics-urls.ts';

const TYPED = 'what+can+i+make+with+onions+and+fish';

test('cleanUrl drops the query string and the fragment', () => {
  assert.equal(cleanUrl(`https://findish.now/?q=${TYPED}`), 'https://findish.now/');
  assert.equal(cleanUrl('https://findish.now/about/#how'), 'https://findish.now/about/');
  assert.equal(cleanUrl('https://findish.now/?q=a#b?c'), 'https://findish.now/');
  assert.equal(cleanUrl('/creators/?q=tofu'), '/creators/');
  assert.equal(cleanUrl('https://findish.now/about/'), 'https://findish.now/about/');
  assert.equal(cleanUrl(''), '');
});

test('cleanUrl works on an address the SDK has already decoded', () => {
  assert.equal(cleanUrl('https://findish.now/?q=what can i make with onions&time=30'), 'https://findish.now/');
});

test('cleanUrl keeps campaign tags and nothing else', () => {
  assert.equal(
    cleanUrl(`https://findish.now/?utm_source=news&q=${TYPED}&utm_medium=email&time=30#top`),
    'https://findish.now/?utm_source=news&utm_medium=email',
  );
  // A name that only starts like a campaign tag is not one.
  assert.equal(cleanUrl('https://findish.now/?utm=1&utmost=2&q=utm_source=x'), 'https://findish.now/');
});

test('scrubEvent cleans every address on a page view', () => {
  const event = scrubEvent({
    event_type: '[Amplitude] Page Viewed',
    event_properties: {
      '[Amplitude] Page Domain': 'findish.now',
      '[Amplitude] Page Location': `https://findish.now/?q=${TYPED}`,
      '[Amplitude] Page Path': '/',
      '[Amplitude] Page Title': 'Findish',
      '[Amplitude] Page URL': 'https://findish.now/#results',
      '[Amplitude] Previous Page Location': `https://findish.now/?q=${TYPED}&cuisine=thai`,
      '[Amplitude] Element Href': `https://findish.now/?q=${TYPED}`,
      referrer: `https://findish.now/?q=${TYPED}`,
      utm_source: 'news',
      results: 12,
    },
  });
  assert.ok(!JSON.stringify(event).includes('onions'));
  assert.equal(event.event_properties['[Amplitude] Page Location'], 'https://findish.now/');
  assert.equal(event.event_properties['[Amplitude] Page URL'], 'https://findish.now/');
  assert.equal(event.event_properties['[Amplitude] Page Title'], 'Findish');
  assert.equal(event.event_properties.utm_source, 'news');
  assert.equal(event.event_properties.results, 12);
});

test('scrubEvent cleans user properties inside their operations', () => {
  const event = scrubEvent({
    event_type: '$identify',
    user_properties: {
      $set: { referrer: `https://findish.now/?q=${TYPED}`, referring_domain: 'findish.now', internal_user: false },
      $setOnce: { initial_referrer: `https://findish.now/?q=${TYPED}#x`, initial_utm_source: 'news' },
      $unset: { gclid: '-' },
    },
  });
  assert.ok(!JSON.stringify(event).includes('onions'));
  assert.equal(event.user_properties.$set.referrer, 'https://findish.now/');
  assert.equal(event.user_properties.$set.internal_user, false);
  assert.equal(event.user_properties.$setOnce.initial_utm_source, 'news');
});

test('scrubEvent cleans a failed request and any value that is an address', () => {
  const event = scrubEvent({
    event_type: '[Amplitude] Network Request',
    event_properties: {
      '[Amplitude] URL': `https://findish.now/api/ask?q=${TYPED}`,
      '[Amplitude] URL Query': `q=${TYPED}&utm_campaign=fall`,
      '[Amplitude] URL Fragment': 'typed',
      somewhere_else: `https://example.com/page?q=${TYPED}`,
      list: [`https://example.com/?q=${TYPED}`],
      '[Amplitude] Element Hierarchy': [{ tag: 'a', attrs: { href: `/?q=${TYPED}`, title: 'why? #1' } }, { tag: 'body' }],
      note: 'is this ok? yes #1',
    },
  });
  assert.ok(!JSON.stringify(event).includes('onions'));
  assert.equal(event.event_properties['[Amplitude] URL'], 'https://findish.now/api/ask');
  assert.equal(event.event_properties['[Amplitude] URL Query'], 'utm_campaign=fall');
  assert.equal(event.event_properties['[Amplitude] URL Fragment'], '');
  assert.equal(event.event_properties.note, 'is this ok? yes #1');
  assert.deepEqual(event.event_properties['[Amplitude] Element Hierarchy'][0].attrs, { href: '/', title: 'why? #1' });
});

test('scrubEvent leaves an event with no properties alone', () => {
  assert.deepEqual(scrubEvent({ event_type: 'session_start' }), { event_type: 'session_start' });
});

test("scrubEvent leaves a site's own properties alone unless the value is an address", () => {
  const event = scrubEvent({
    event_type: 'Picked Store',
    event_properties: { location: 'Ballard #2', url_kind: 'short?', href: 'https://example.com/a?b=c' },
  });
  assert.deepEqual(event.event_properties, { location: 'Ballard #2', url_kind: 'short?', href: 'https://example.com/a' });
});

test('cleanReplayBody cleans the page address and link hrefs in a replay upload', () => {
  const meta = { type: 4, data: { href: `https://findish.now/?q=${TYPED}`, width: 320, height: 600 } };
  const moved = { type: 6, data: { plugin: 'amplitude/url-tracking@1', payload: { href: `https://findish.now/?q=${TYPED}#x`, title: '' } } };
  const snapshot = {
    type: 2,
    data: { node: { childNodes: [{ tagName: 'a', attributes: { href: `/?q=${TYPED}`, class: 'row' } }, { tagName: 'img', attributes: { src: 'https://img.example/a.jpg?w=300' } }] } },
  };
  const body = JSON.stringify({ version: 1, events: [meta, moved, snapshot].map((event) => JSON.stringify(event)) });
  const clean = cleanReplayBody(body);
  assert.ok(!clean.includes('onions'));
  const events = JSON.parse(clean).events.map((event) => JSON.parse(event));
  assert.equal(events[0].data.href, 'https://findish.now/');
  assert.equal(events[0].data.width, 320);
  assert.equal(events[1].data.payload.href, 'https://findish.now/');
  assert.deepEqual(events[2].data.node.childNodes[0].attributes, { href: '/', class: 'row' });
  // A photo's address is not something typed, and the replay needs it to show the photo.
  assert.equal(events[2].data.node.childNodes[1].attributes.src, 'https://img.example/a.jpg?w=300');
});

test('cleanReplayBody leaves out what it cannot read', () => {
  assert.equal(cleanReplayBody('not json'), null);
  assert.equal(cleanReplayBody('{"events":"nope"}'), null);
  const clean = cleanReplayBody(JSON.stringify({ version: 1, events: ['{"type":4,"data":{"href":"/a?q=x"}}', '{broken'] }));
  assert.deepEqual(JSON.parse(clean).events, ['{"type":4,"data":{"href":"/a"}}']);
});
