// Kyle's two sites, for the switch in the header. Pass the one the page is on.
// kylepace.net: <Header ... sites={sitesFor('net')} />; DevLayout uses sitesFor('dev').
export type SiteKey = 'net' | 'dev';

const SITES: Record<SiteKey, { href: string; label: string; name: string }> = {
  net: { href: 'https://kylepace.net/', label: '.net', name: 'kylepace.net' },
  dev: { href: 'https://kylepace.dev/', label: '.dev', name: 'kylepace.dev' },
};

export function sitesFor(current: SiteKey) {
  return (Object.keys(SITES) as SiteKey[]).map((key) => ({ ...SITES[key], current: key === current }));
}
