'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LEAD_STATUSES, type FormType, type LeadQuery } from '@/leads/types'
import { filterHref } from './logic'

/*
 * Client component: a Select needs onValueChange, which a server component
 * cannot have. The filters themselves still live entirely in the URL (see
 * ../../../leads/filters.ts) -- this only translates a Select's change event
 * into a navigation, through the SAME `filterHref` the old link-based filter
 * row used and tests/leads-admin-ui.test.ts already covers, so "Miami,
 * contacted" stays bookmarkable and the URL shape does not change.
 *
 * Radix's Select.Item forbids an empty-string value (it's reserved to mean
 * "no selection"), so "All" is represented by the ALL sentinel below and
 * translated back to `null` before it ever reaches filterHref.
 */
const ALL = '__all__'

export function LeadFilters({
  query,
  cities,
}: {
  query: LeadQuery
  cities: { key: string; city: string }[]
}) {
  const router = useRouter()

  function go(key: 'city' | 'status' | 'form', value: string) {
    router.push(filterHref(query, key, value === ALL ? null : value))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        label="City"
        value={query.city ?? ALL}
        onValueChange={(v) => go('city', v)}
        // A lead's city can outlive the city itself -- see
        // ./logic.ts's cityDisplayName -- so `query.city` (any string
        // matching CITY_KEY in ../../../leads/filters.ts) is not guaranteed
        // to be one of today's cities. Without this, filtering to a since-
        // deleted city's key would leave the trigger showing no matching
        // option and rendering blank instead of that key.
        options={
          query.city && !cities.some((c) => c.key === query.city)
            ? [...cities.map((c) => ({ value: c.key, label: c.city })), { value: query.city, label: query.city }]
            : cities.map((c) => ({ value: c.key, label: c.city }))
        }
      />
      <FilterSelect
        label="Status"
        value={query.status ?? ALL}
        onValueChange={(v) => go('status', v)}
        options={LEAD_STATUSES.map((s) => ({ value: s, label: s }))}
        capitalize
      />
      <FilterSelect
        label="Form"
        value={query.formType ?? ALL}
        onValueChange={(v) => go('form', v)}
        options={
          [
            { value: 'booking', label: 'booking' },
            { value: 'contact', label: 'contact' },
          ] satisfies { value: FormType; label: string }[]
        }
        capitalize
      />

      {/*
       * The toggle spec 3.1 promised. Not a FilterSelect: this dimension has
       * two states, not "All plus some values", and calling the default
       * state "All" would read as "everything is shown" when it is exactly
       * the state that hides rows. Kept as plain links (not a Select) since
       * there is nothing to pick from a list here.
       */}
      <div className="flex min-h-11 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 sm:min-h-9">
        <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase">Test rows</span>
        <Link
          href={filterHref(query, 'test', null)}
          className={activeLinkClass(!query.includeTest)}
        >
          hidden
        </Link>
        <Link href={filterHref(query, 'test', '1')} className={activeLinkClass(query.includeTest)}>
          shown
        </Link>
      </div>
    </div>
  )
}

function activeLinkClass(active: boolean): string {
  return `min-h-11 cursor-pointer rounded-sm px-1 py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0 sm:py-0 ${
    active ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
  }`
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  capitalize,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  capitalize?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          size="sm"
          aria-label={label}
          className={`min-h-11 w-[8.5rem] sm:min-h-8 ${capitalize ? 'capitalize' : ''}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className={capitalize ? 'capitalize' : ''}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
