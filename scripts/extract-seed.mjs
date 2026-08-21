// scripts/extract-seed.mjs
// One-shot: builds content/minneapolis.json from the CURRENT hardcoded data.
// Run BEFORE the data files are refactored (they must still hold literals).
import fs from 'node:fs'

const services = await import('../src/data/services.ts')
const home = await import('../src/data/home.ts')
const deep = await import('../src/data/deep-cleaning.ts')
const areas = await import('../src/data/areas.ts')
const contact = await import('../src/data/contact.ts')
const site = await import('../src/data/site.ts')

const cardKeys = ['dusting', 'vacuuming', 'bathroom', 'window', 'upholstery']

const seed = {
  city: 'Minneapolis',
  state: 'MN',
  phone: site.site.phone,
  phoneHref: site.site.phoneHref,
  address: site.innerSite.address,
  status: 'live',
  research: {
    suburbs: areas.areas.map((a) => ({ name: a.name, slug: a.href.replace(/^\//, '') })),
    zips: [],
    landmarks: [],
    mapEmbedUrl: contact.contactMap.src,
  },
  sections: {
    'services.heroParagraphs': services.heroParagraphs,
    'services.serviceIntro': services.serviceIntro,
    ...Object.fromEntries(
      services.services.map((svc, i) => [`services.cards.${cardKeys[i]}`, svc.text]),
    ),
    'deep.whatIs': deep.whatIs.text,
    'home.zipParagraph': home.zipParagraph,
    'home.landmarksParagraph': home.landmarksParagraph,
  },
}

fs.mkdirSync('content', { recursive: true })
fs.writeFileSync('content/minneapolis.json', JSON.stringify(seed, null, 2) + '\n')
console.log('wrote content/minneapolis.json —', Object.keys(seed.sections).length, 'sections')
