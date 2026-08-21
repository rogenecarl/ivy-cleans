/*
 * Pins the exported VALUES of every data module. The snapshots were captured
 * while the modules were still hardcoded, and the content refactor had to
 * reproduce them exactly from content/minneapolis.json + tokens.
 *
 * That refactor is finished, so a --update is no longer automatically a bug:
 * later plans legitimately ADD copy (post-submit result strings, for
 * instance), and the snapshot has been updated for exactly that twice. The
 * rule now is narrower and still worth enforcing by eye: an update that ADDS
 * a key is normal; an update that CHANGES or REMOVES an existing string means
 * a plan altered user-visible copy that was cloned from the live site, and
 * that still needs justifying before it is accepted.
 */
import { describe, expect, test } from 'vitest'
import { getDefaultCity } from '../src/content/store'
import { siteData } from '../src/data/site'
import { servicesData } from '../src/data/services'
import { homeData } from '../src/data/home'
import { packagesData } from '../src/data/packages'
import { areasData } from '../src/data/areas'
import { contactData } from '../src/data/contact'
import { deepCleaningData } from '../src/data/deep-cleaning'
import { moveOutData } from '../src/data/move-out'

const c = await getDefaultCity()
const modules = {
  site: siteData(c),
  services: servicesData(c),
  home: homeData(c),
  packages: packagesData(c),
  areas: areasData(c),
  contact: contactData(c),
  deep: deepCleaningData(c),
  moveOut: moveOutData(c),
}

describe('data module values are unchanged by the content-layer refactor', () => {
  for (const [name, mod] of Object.entries(modules)) {
    test(name, () => {
      expect(JSON.parse(JSON.stringify(mod))).toMatchSnapshot()
    })
  }
})
