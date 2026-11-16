// Kyle's two sites, for the switch in the header. Pass the one the page is on.
// kylepace.net: <Header ... sites={sitesFor('net')} />; DevLayout uses sitesFor('dev').
export type SiteKey = 'net' | 'dev';

// `about` is the few words shown on hover or keyboard focus, and read by screen readers,
// so a first-time visitor knows what's on the other side.
const SITES: Record<SiteKey, { href: string; label: string; name: string; about: string }> = {
  net: { href: 'https://kylepace.net/', label: '.net', name: 'kylepace.net', about: 'About me, my work and writing' },
  dev: { href: 'https://kylepace.dev/', label: '.dev', name: 'kylepace.dev', about: 'Labs and apps I build' },
};

export function sitesFor(current: SiteKey) {
  return (Object.keys(SITES) as SiteKey[]).map((key) => ({ ...SITES[key], current: key === current }));
}
