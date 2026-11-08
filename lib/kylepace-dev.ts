// Settings shared by kylepace.dev and every experiment on it. Absolute URLs, because
// each experiment runs on its own Worker under a path of the hub's domain.
export const DEV_ANALYTICS = {
  // The kylepace.dev Amplitude project (902556), shared by the hub and its experiments.
  apiKey: '15494c5b9d8a36939245949ac59554ee',
  liveHosts: ['kylepace.dev'],
};

// The way back to kylepace.net is the site switch beside the wordmark (lib/sites.ts).
export const DEV_NAV = [
  { href: 'https://kylepace.dev/', label: 'Labs' },
  { href: 'https://kylepace.dev/apps/', label: 'Apps' },
  { href: 'https://kylepace.dev/how-i-build/', label: 'How I build' },
];

export const DEV_FOOTER = [
  { href: 'https://kylepace.net/', label: 'kylepace.net' },
  { href: 'https://kylepace.net/about/', label: 'About Kyle' },
  { href: 'https://kylepace.net/now/', label: 'Now' },
  { href: 'https://github.com/kyle-pace', label: 'GitHub' },
  { href: 'mailto:mail@kylepace.net', label: 'Email' },
  { href: 'https://kylepace.dev/how-i-build/', label: 'How I build' },
  { href: 'https://kylepace.dev/accessibility/', label: 'Accessibility' },
  { href: 'https://kylepace.dev/privacy/', label: 'Privacy' },
  { href: 'https://kylepace.dev/connections/', label: 'Connections' },
];
