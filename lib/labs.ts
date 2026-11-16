// The labs on kylepace.dev, for the "More labs" strip at the end of each About page.
// Newest first. Keep the names and blurbs in step with the hub's src/data/projects.ts.
// `related` names the labs that pair naturally with this one; they're shown first.
export interface LabEntry {
  slug: string;
  name: string;
  blurb: string;
  related?: string[];
}

export const LABS: LabEntry[] = [
  { slug: 'live-earth', name: 'Live Earth', blurb: 'The whole planet, live, from five weather satellites.', related: ['world-transit'] },
  { slug: 'recipe-search', name: 'Recipe search', blurb: 'One search box for the recipe sites I trust.', related: ['world-cuisine'] },
  { slug: 'world-transit', name: 'World transit', blurb: 'Every transit route on Earth, on one globe, live.', related: ['live-earth'] },
  { slug: 'world-cuisine', name: 'World cuisine', blurb: 'The world’s cuisines and dishes on one globe.', related: ['recipe-search'] },
  { slug: 'skill-tree', name: 'Career skill tree', blurb: 'My career drawn as an RPG skill tree.' },
];

export const labHref = (slug: string) => `https://kylepace.dev/${slug}/`;

/** Up to `count` other labs for the lab at `slug`: its related ones first, then newest. */
export function otherLabs(slug: string, count = 3): LabEntry[] {
  const me = LABS.find((l) => l.slug === slug);
  const others = LABS.filter((l) => l.slug !== slug);
  const related = (me?.related ?? []).map((s) => others.find((l) => l.slug === s)).filter((l): l is LabEntry => !!l);
  return [...related, ...others.filter((l) => !related.includes(l))].slice(0, count);
}
