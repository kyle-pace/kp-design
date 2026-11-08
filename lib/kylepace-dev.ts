// Settings shared by kylepace.dev and every experiment on it. Absolute URLs, because
// each experiment runs on its own Worker under a path of the hub's domain.
export const DEV_ANALYTICS = {
  // The kylepace.dev Amplitude project (902556), shared by the hub and its experiments.
  apiKey: '15494c5b9d8a36939245949ac59554ee',
  liveHosts: ['kylepace.dev'],
};

export const DEV_NAV = [
  { href: 'https://kylepace.dev/', label: 'Experiments' },
  { href: 'https://kylepace.dev/how-i-build/', label: 'How I build' },
  { href: 'https://kylepace.net/', label: 'kylepace.net', emphasis: true },
];

export const DEV_FOOTER = [
  { href: 'https://kylepace.net/', label: 'kylepace.net' },
  { href: 'https://kylepace.net/about/', label: 'About Kyle' },
  { href: 'https://github.com/kyle-pace', label: 'GitHub' },
  { href: 'mailto:mail@kylepace.net', label: 'Email' },
  { href: 'https://kylepace.dev/how-i-build/', label: 'How I build' },
  { href: 'https://kylepace.dev/accessibility/', label: 'Accessibility' },
  { href: 'https://kylepace.dev/privacy/', label: 'Privacy' },
  { href: 'https://kylepace.dev/connections/', label: 'Connections' },
];
