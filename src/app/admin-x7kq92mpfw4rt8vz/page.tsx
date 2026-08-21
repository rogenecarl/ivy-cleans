import Link from 'next/link'
import domainsJson from '../../../content/_domains.json'
import { listCities, type CityRow } from '@/pipeline/admin-logic'
import { STAGE_IDS } from '@/pipeline/stages'
import { leadQueryToSearch } from '@/leads/filters'
import { domainFor, siteReadiness, type DomainsIndex } from '@/leads/readiness'
import { getSiteSettingsMany, leadCountsByCity } from '@/leads/store'
import { ADMIN_BASE } from './base'
import { BTN, BTN_PRIMARY, ReadinessChips, StatusChip } from './ui'

/*
 * Dashboard. Reads the store directly (server component) rather than calling
 * listCitiesAction — an action is an RPC endpoint for the browser; on the
 * server the same work is a plain function call.
 *
 * force-dynamic because the whole list comes off disk and changes whenever the
 * operator does anything: a cached dashboard would show a city as GENERATING
 * after it went live.
 */
export const dynamic = 'force-dynamic'

/** Where the primary action for each row leads. */
function primaryLink(row: CityRow): { href: string; label: string } {
  if (row.status === 'generating') {
    return { href: `${ADMIN_BASE}/generate/${row.key}`, label: 'Resume' }
  }
  if (row.status === 'draft-unfinalized') {
    return { href: `${ADMIN_BASE}/generate/${row.key}`, label: 'Finish' }
  }
  return { href: `${ADMIN_BASE}/review/${row.key}`, label: 'Review' }
}

export default async function AdminDashboard() {
  const [rows, counts] = await Promise.all([listCities(), leadCountsByCity()])
  // One query for every row's settings, not one query per row (was N+1).
  const settingsByCity = await getSiteSettingsMany(rows.map((row) => row.key))
  const domains = domainsJson as DomainsIndex

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight">Cities</h1>
          <p className="mt-1 text-[0.85rem] text-[#6b7680]">
            {rows.length} {rows.length === 1 ? 'site' : 'sites'} in the manager.
          </p>
        </div>
        <Link href={`${ADMIN_BASE}/new`} className={BTN_PRIMARY}>
          + New City
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#d8dde2] bg-white">
        <table className="w-full border-collapse text-[0.9rem]">
          <thead>
            <tr className="border-b border-[#d8dde2] bg-[#f2f4f6] text-left text-[0.75rem] uppercase tracking-wide text-[#6b7680]">
              <th className="px-4 py-2.5 font-semibold">City</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Domain</th>
              <th className="px-4 py-2.5 font-semibold">Leads</th>
              <th className="px-4 py-2.5 font-semibold">Config</th>
              <th className="px-4 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#6b7680]">
                  No cities yet. Start with “+ New City”.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const primary = primaryLink(row)
              const previewable = row.status === 'live' || row.status === 'draft'
              const domain = domainFor(row.key, domains)
              const cityCounts = counts[row.key] ?? { total: 0, unworked: 0, emailFailed: 0 }
              const readiness = siteReadiness({
                isLive: row.status === 'live',
                domain,
                notifyEmails: settingsByCity[row.key]?.notifyEmails ?? [],
                counts: cityCounts,
              })
              return (
                <tr key={row.key} className="border-b border-[#e6eaee] last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{row.city}</span>
                    <span className="ml-2 text-[0.75rem] text-[#8a949d]">/{row.key}</span>
                    {row.error && (
                      <span className="ml-2 text-[0.75rem] text-[#a11212]">{row.error}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={row.status} />
                    {row.status === 'generating' && (
                      <span className="ml-2 text-[0.75rem] text-[#6b7680]">
                        {row.doneCount ?? 0}/{STAGE_IDS.length} stages
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[0.8rem]">
                    {domain ?? <span className="text-[#8a949d]">not attached</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${ADMIN_BASE}/leads?${leadQueryToSearch({
                        city: row.key,
                        status: null,
                        formType: null,
                        includeTest: false,
                      })}`}
                      className="font-medium"
                    >
                      {cityCounts.unworked}
                    </Link>
                    <span className="ml-1 text-[0.75rem] text-[#8a949d]">/ {cityCounts.total}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ReadinessChips readiness={readiness} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {previewable && (
                        <a
                          href={`/${row.key}`}
                          target="_blank"
                          rel="noreferrer"
                          className={BTN}
                        >
                          Preview ↗
                        </a>
                      )}
                      <Link href={primary.href} className={BTN}>
                        {primary.label}
                      </Link>
                      <Link href={`${ADMIN_BASE}/sites/${row.key}`} className={BTN}>
                        Settings
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[0.8rem] text-[#6b7680]">
        Preview opens the city at its internal <code>/&lt;key&gt;</code> path — that unguessable URL
        is the preview, no login required. A LIVE city also answers on its own domain.
      </p>
    </>
  )
}
