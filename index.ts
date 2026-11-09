// Components. Styles are imported as CSS: `import 'kp-design/global.css'` (sites) or
// `kp-design/lab.css` (standalone labs, which LabLayout imports for you).
export { default as Header } from './components/Header.astro';
export { default as Footer } from './components/Footer.astro';
export { default as DisplaySettings } from './components/DisplaySettings.astro';
export { default as DisplaySettingsInit } from './components/DisplaySettingsInit.astro';
export { default as StatusBadge } from './components/StatusBadge.astro';
export { default as SocialBadges } from './components/SocialBadges.astro';
export { default as DevLayout } from './layouts/DevLayout.astro';
export { default as LabLayout } from './layouts/LabLayout.astro';
export { startAnalytics, isOptedOut, setOptOut, track } from './lib/analytics';
export { DEV_ANALYTICS, DEV_NAV, DEV_FOOTER } from './lib/kylepace-dev';
export { sitesFor, type SiteKey } from './lib/sites';
