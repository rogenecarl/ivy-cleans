'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FormType, LeadQuery } from '@/server/leads/types'
import { filterHref } from './logic'

// Client component for the Selects; the filters still live in the URL through filterHref. Status moved to the chips
// above the table. Radix forbids an empty-string value, hence the ALL sentinel.
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
        // a lead's city can outlive the city (logic.ts cityDisplayName); keep the trigger from rendering blank
        options={
          query.city && !cities.some((c) => c.key === query.city)
            ? [...cities.map((c) => ({ value: c.key, label: c.city })), { value: query.city, label: query.city }]
            : cities.map((c) => ({ value: c.key, label: c.city }))
        }
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
    </div>
  )
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
