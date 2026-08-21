/*
 * Pins the exported VALUES of every data module being refactored. Snapshots
 * are captured while the modules are still hardcoded; after the refactor the
 * same values must be reproduced from content/minneapolis.json + tokens.
 * If a snapshot ever needs --update during this plan, the refactor changed
 * user-visible copy — that is a bug, not a snapshot to accept.
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
