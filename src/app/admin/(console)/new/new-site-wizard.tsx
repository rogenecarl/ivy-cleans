'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhotoDropzone } from '@/app/admin/_components/photo-dropzone'
import { SubmitButton } from '@/app/admin/_components/submit-button'
import { ADMIN_SITES } from '@/server/auth/admin-routes'
import { phoneDigitsFrom, phoneFields, resolveStateCode } from '@/server/pipeline/facts'
import { cn } from '@/lib/utils'
import { checkCityKeyAction, createDraftAction } from './actions'

// One form, three panels: nothing is created until Start, so leaving halfway leaves nothing behind. Hidden panels
// stay in the DOM (display:none) so every field and the photos still submit together.

const STEPS = ['City and contact', 'About Us', 'Check and start'] as const

type KeyStatus = { key: string; free: boolean; reason?: string } | null

export function NewSiteWizard() {
  const [step, setStep] = useState(0)
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [about, setAbout] = useState({ crewLead: '', servingSince: '', crewSize: '', homesCleaned: '' })
  const [keyStatus, setKeyStatus] = useState<KeyStatus>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const checkId = useRef(0)

  // debounced: one check after the operator stops typing; a failed check shows nothing and never blocks Start
  useEffect(() => {
    const name = city.trim()
    if (name === '') return
    const id = ++checkId.current
    const timer = setTimeout(() => {
      checkCityKeyAction(name)
        .then((status) => {
          if (id === checkId.current) setKeyStatus(status)
        })
        .catch(() => {
          if (id === checkId.current) setKeyStatus(null)
        })
    }, 400)
    return () => clearTimeout(timer)
  }, [city])

  const digits = phoneDigitsFrom(phone)
  const phoneShown = digits ? phoneFields(digits).phoneDisplay : null
  const stateCode = state.trim() ? resolveStateCode(state) : null

  function next() {
    if (step === 0) {
      if (city.trim() === '' || state.trim() === '' || phone.trim() === '') {
        setStepError('City, state and phone are needed to start.')
        return
      }
      if (stateCode === null) {
        setStepError('That state isn’t recognised — use a code like FL or a name like Florida.')
        return
      }
      if (digits === null) {
        setStepError('The phone number needs 10 digits.')
        return
      }
    }
    setStepError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        action={createDraftAction}
        className="flex min-w-0 flex-[999_1_480px] flex-col gap-6 rounded-lg border border-border bg-card p-6"
        data-role="new-site-form"
      >
        <ol aria-label="Steps" className="grid grid-cols-3 gap-3">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-col gap-2" aria-current={i === step ? 'step' : undefined}>
              <span className={cn('h-1 rounded-full', i <= step ? 'bg-foreground' : 'bg-muted')} />
              <span className={cn('text-[0.8rem]', i === step ? 'font-semibold' : 'text-muted-foreground')}>
                {i + 1} · {label}
                {i === 1 && <span className="font-normal"> (optional)</span>}
              </span>
            </li>
          ))}
        </ol>

        {/* step 1 */}
        <section className={cn('flex flex-col gap-5', step !== 0 && 'hidden')} aria-label={STEPS[0]}>
          <div>
            <h2 className="text-[1.25rem] font-semibold">Which city is this site for?</h2>
            <p className="mt-1 text-[0.85rem] text-muted-foreground">
              These are printed on every page, so they come from you, never from the AI.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="city" className="mb-1.5">
                City <span className="text-destructive">*</span>
              </Label>
              <Input id="city" name="city" required value={city} onChange={(e) => setCity(e.target.value)} className="min-h-11 sm:min-h-9" placeholder="Orlando" />
              {city.trim() !== '' && keyStatus && (
                <p className={cn('mt-1 text-[0.8rem]', keyStatus.free ? 'text-emerald-700' : 'text-destructive')} data-role="key-status">
                  {keyStatus.free
                    ? `Site address: /${keyStatus.key} — free`
                    : `${keyStatus.key ? `/${keyStatus.key}: ` : ''}${keyStatus.reason}`}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="state" className="mb-1.5">
                State <span className="text-destructive">*</span>
              </Label>
              <Input id="state" name="state" required maxLength={40} value={state} onChange={(e) => setState(e.target.value)} className="min-h-11 sm:min-h-9" placeholder="FL or Florida" />
              {state.trim() !== '' && (
                <p className={cn('mt-1 text-[0.8rem]', stateCode ? 'text-emerald-700' : 'text-destructive')}>
                  {stateCode ? `State: ${stateCode}` : 'Not a state we recognise'}
                </p>
              )}
            </div>
          </div>
          <div className="max-w-xs">
            <Label htmlFor="phone" className="mb-1.5">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input id="phone" name="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-11 sm:min-h-9" placeholder="(407) 555-0123" />
            {phone.trim() !== '' && (
              <p className={cn('mt-1 text-[0.8rem]', phoneShown ? 'text-emerald-700' : 'text-destructive')} data-role="phone-preview">
                {phoneShown ? `Shows as ${phoneShown}` : 'Needs 10 digits'}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="address" className="mb-1.5">
              Street address
            </Label>
            <Input id="address" name="address" value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-11 sm:min-h-9" placeholder="1200 Lake Ave, Orlando, FL 32801" />
            {address.trim() === '' && (
              <p className="mt-1 text-[0.8rem] text-amber-800" data-role="address-warning">
                You can add this later in Settings, but the site can’t go live without it.
              </p>
            )}
          </div>
        </section>

        {/* step 2 */}
        <section className={cn('flex flex-col gap-5', step !== 1 && 'hidden')} aria-label={STEPS[1]}>
          <div>
            <h2 className="text-[1.25rem] font-semibold">About Us (optional)</h2>
            <p className="mt-1 text-[0.85rem] text-muted-foreground">
              Printed on the About page as typed; the AI never writes these. Skip any you don’t know yet — reviews
              and more photos go in Settings later.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['crewLead', 'Crew lead', 'Maria', 'text'],
                ['servingSince', 'Serving since', '2024', 'text'],
                ['crewSize', 'Crew size', '4', 'numeric'],
                ['homesCleaned', 'Homes cleaned here', '340', 'numeric'],
              ] as const
            ).map(([name, label, placeholder, mode]) => (
              <div key={name}>
                <Label htmlFor={name} className="mb-1.5">
                  {label}
                </Label>
                <Input
                  id={name}
                  name={name}
                  inputMode={mode === 'numeric' ? 'numeric' : undefined}
                  value={about[name]}
                  onChange={(e) => setAbout((a) => ({ ...a, [name]: e.target.value }))}
                  className="min-h-11 sm:min-h-9"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <PhotoDropzone
                mode="form"
                name="crewPhoto"
                captionName="crewPhotoAlt"
                label="Crew photos"
                hint="The first photo leads the About page; the rest fill its gallery. Large phone photos are shrunk in your browser first."
                captionLabel="Caption for the crew photo"
                captionPlaceholder="The Orlando crew outside a Winter Park home"
              />
            </div>
          </div>
        </section>

        {/* step 3 */}
        <section className={cn('flex flex-col gap-4', step !== 2 && 'hidden')} aria-label={STEPS[2]}>
          <h2 className="text-[1.25rem] font-semibold">Check and start</h2>
          <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-[0.9rem]">
            <dt className="text-muted-foreground">City</dt>
            <dd>
              {city.trim()}
              {stateCode ? `, ${stateCode}` : ''} {keyStatus?.free && <span className="text-muted-foreground">(/{keyStatus.key})</span>}
            </dd>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{phoneShown ?? phone}</dd>
            <dt className="text-muted-foreground">Street address</dt>
            <dd className={address.trim() ? '' : 'text-amber-800'}>{address.trim() || 'Not yet — needed before it can go live'}</dd>
            <dt className="text-muted-foreground">About Us</dt>
            <dd>
              {Object.values(about).some((v) => v.trim() !== '')
                ? [about.crewLead && `crew lead ${about.crewLead}`, about.servingSince && `since ${about.servingSince}`, about.crewSize && `${about.crewSize} people`, about.homesCleaned && `${about.homesCleaned} homes`]
                    .filter(Boolean)
                    .join(' · ')
                : 'Nothing yet — add it any time in Settings'}
            </dd>
          </dl>
          {keyStatus && !keyStatus.free && (
            <p className="text-[0.85rem] text-destructive">{keyStatus.reason} — Start will be refused. Go back and change the city name.</p>
          )}
        </section>

        {stepError && (
          <p className="text-[0.85rem] text-destructive" role="alert">
            {stepError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          {step === 0 ? (
            <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
              <Link href={ADMIN_SITES}>Cancel</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" className="min-h-11 sm:min-h-9" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" className="min-h-11 sm:min-h-9" onClick={next} data-role="wizard-next">
              {step === 0 ? 'Continue to About Us →' : 'Continue →'}
            </Button>
          ) : (
            <SubmitButton pendingLabel="Starting…" className="sm:min-h-9">
              Start
            </SubmitButton>
          )}
        </div>
      </form>

      <aside className="flex flex-[1_1_280px] flex-col gap-4 rounded-lg border border-border bg-muted/30 p-5" aria-labelledby="next-title">
        <h2 id="next-title" className="text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
          What happens when you start
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-[0.85rem]">
          <li>
            <strong>Research</strong> — the web, for the city’s areas, neighbourhoods and local conditions. Every fact
            keeps the page it came from.
          </li>
          <li>
            <strong>Fact check</strong> — each fact against its source; ZIPs and places against public data. Anything
            unconfirmed waits for you.
          </li>
          <li>
            <strong>Writing</strong> — the front page, one page per area, a local section on each service.
          </li>
          <li>
            <strong>Your review</strong> — nothing goes live until you publish.
          </li>
        </ol>
        <div className="border-t border-border pt-4">
          <span className="text-[0.7rem] tracking-wider text-muted-foreground uppercase">Usually takes</span>
          <strong className="block text-[1.1rem]">30–45 min</strong>
        </div>
        <p className="text-[0.8rem] text-muted-foreground">
          Keep this tab open while it runs. If it stops, opening the city again resumes from the last finished step.
        </p>
      </aside>
    </div>
  )
}
