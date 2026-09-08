// tests/fixtures/cities/load.ts
/*
 * City documents that exist ONLY for tests.
 *
 * They used to live in content/ and be read through getCity(), which made
 * production content load-bearing for the suite: neither testville nor miami
 * could be removed from the operator's site list without breaking three test
 * files. Testville was never a city at all — it is a rendering target that
 * ended up in the city table — and miami was a half-migrated real city whose
 * research predates the rework.
 *
 * What each one proves, so a future reader knows what they would lose:
 *
 *   testville  a city with hasSuburbPages: false — ServiceArea must render
 *              every area name and link none of them.
 *   miami      researched areas with NO generated suburb copy, which is the
 *              only fixture exercising src/data/suburb.ts's template
 *              fallback. That fallback is what stops Minneapolis's live area
 *              pages throwing, so it has to stay covered.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { validateCityContent } from '../../../src/content/validate'
import type { CityContent } from '../../../src/content/types'

export async function loadCityFixture(name: string): Promise<CityContent> {
  const file = path.join(process.cwd(), 'tests/fixtures/cities', `${name}.json`)
  return validateCityContent(JSON.parse(await readFile(file, 'utf-8')))
}
