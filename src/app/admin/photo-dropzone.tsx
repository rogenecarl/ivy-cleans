'use client'

import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from 'react'
import Image from 'next/image'
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { MAX_PHOTO_BYTES, MAX_PHOTOS, PHOTO_TYPES } from '@/pipeline/photos'

/** What a camera file may be before shrinking; the server's MAX_PHOTO_BYTES applies to what is sent. */
const MAX_RAW_BYTES = 25 * 1024 * 1024
/** Longest edge kept when shrinking in the browser; the page never shows more than ~1200px. */
const CLIENT_EDGE = 2000
const CLIENT_QUALITY = 0.85
/** Files at or under this are sent as they are: already small, and the server normalises what it stores anyway. */
const SKIP_SHRINK_BYTES = 1024 * 1024

// Resize in the browser so a 12 MB phone photo leaves as a few hundred KB. Only pixels the page cannot show are lost.
async function shrinkInBrowser(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, CLIENT_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, CLIENT_QUALITY))
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/png' ? '.png' : '.jpg')
    return new File([blob], name, { type, lastModified: file.lastModified })
  } catch {
    return file
  }
}

// A drop zone with previews. Two modes: `form` keeps the chosen files inside a real <input name=…> so the page's own
// submit sends them; `upload` sends each file through `upload` as soon as the operator clicks the button, one at a
// time, and shows where the batch is.

type Picked = { id: string; file: File; url: string; problem: string | null; originalSize: number; shrinking: boolean }
type Status = 'queued' | 'uploading' | 'done' | 'failed'

export type UploadOne = (file: File, alt: string) => Promise<{ ok: true } | { ok: false; error: string }>

type Props = {
  /** How many photos this city already has; counts against MAX_PHOTOS. */
  existing?: number
  /** Field label, e.g. "Crew photos". */
  label: string
  hint?: string
  captionLabel?: string
  captionPlaceholder?: string
} & ({ mode: 'form'; name: string; captionName: string } | { mode: 'upload'; upload: UploadOne; onDone?: () => void })

function checkFile(file: File): string | null {
  if (!(file.type in PHOTO_TYPES)) return 'not a JPG, PNG or WebP'
  if (file.size > MAX_RAW_BYTES) return `over ${MAX_RAW_BYTES / 1024 / 1024} MB`
  return null
}

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function PhotoDropzone(props: Props) {
  const { existing = 0, label, hint, captionLabel = 'Caption', captionPlaceholder } = props
  const inputId = useId()
  const captionId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Picked[]>([])
  const [over, setOver] = useState(false)
  const [caption, setCaption] = useState('')
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const room = Math.max(0, MAX_PHOTOS - existing)

  // object URLs are freed when a preview leaves the list
  useEffect(() => () => picked.forEach((p) => URL.revokeObjectURL(p.url)), [picked])

  const syncInput = useCallback((list: Picked[]) => {
    if (props.mode !== 'form' || !inputRef.current) return
    const dt = new DataTransfer()
    for (const p of list) if (p.problem === null) dt.items.add(p.file)
    inputRef.current.files = dt.files
  }, [props.mode])

  const add = useCallback(
    (files: FileList | File[]) => {
      const fresh: Picked[] = []
      setPicked((prev) => {
        const next = [...prev]
        for (const file of Array.from(files)) {
          const id = `${file.name}-${file.size}-${file.lastModified}`
          if (next.some((p) => p.id === id)) continue
          const overRoom = next.filter((p) => p.problem === null).length >= room
          const problem = overRoom ? `only ${room} more photo${room === 1 ? '' : 's'} fit` : checkFile(file)
          const shrinking = problem === null && file.size > SKIP_SHRINK_BYTES
          const entry: Picked = { id, file, url: URL.createObjectURL(file), problem, originalSize: file.size, shrinking }
          next.push(entry)
          if (shrinking) fresh.push(entry)
        }
        syncInput(next)
        return next
      })
      // shrink after the tiles are on screen, one file at a time, then swap the smaller file in
      void (async () => {
        for (const entry of fresh) {
          const small = await shrinkInBrowser(entry.file)
          setPicked((prev) => {
            const next = prev.map((p) =>
              p.id === entry.id
                ? { ...p, file: small, shrinking: false, problem: small.size > MAX_PHOTO_BYTES ? `still over ${MAX_PHOTO_BYTES / 1024 / 1024} MB after shrinking` : null }
                : p,
            )
            syncInput(next)
            return next
          })
        }
      })()
    },
    [room, syncInput],
  )

  const remove = (id: string) => {
    setPicked((prev) => {
      const gone = prev.find((p) => p.id === id)
      if (gone) URL.revokeObjectURL(gone.url)
      const next = prev.filter((p) => p.id !== id)
      syncInput(next)
      return next
    })
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer.files.length) add(e.dataTransfer.files)
  }

  async function uploadAll() {
    if (props.mode !== 'upload') return
    const ready = picked.filter((p) => p.problem === null)
    if (ready.length === 0 || caption.trim() === '') return
    setBusy(true)
    setErrors({})
    setStatus(Object.fromEntries(ready.map((p) => [p.id, 'queued' as Status])))
    const failed = new Set<string>()
    let n = 0
    for (const p of ready) {
      n += 1
      setStatus((s) => ({ ...s, [p.id]: 'uploading' }))
      const alt = n === 1 ? caption.trim() : `${caption.trim()} (${n})`
      const result = await props.upload(p.file, alt)
      setStatus((s) => ({ ...s, [p.id]: result.ok ? 'done' : 'failed' }))
      if (!result.ok) {
        failed.add(p.id)
        setErrors((e) => ({ ...e, [p.id]: result.error }))
      }
    }
    setBusy(false)
    if (failed.size === 0) {
      setPicked([])
      setCaption('')
      setStatus({})
      props.onDone?.()
    } else {
      // keep only what failed, so the operator can fix and retry
      setPicked((prev) => prev.filter((p) => failed.has(p.id) || p.problem !== null))
    }
  }

  const readyCount = picked.filter((p) => p.problem === null).length
  const shrinking = picked.some((p) => p.shrinking)
  const doneCount = Object.values(status).filter((s) => s === 'done').length
  const uploadingCount = Object.values(status).filter((s) => s === 'uploading' || s === 'queued').length

  return (
    <div className="space-y-3">
      <Label htmlFor={inputId}>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label}: drop files here or press Enter to browse`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          over ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/40',
          room === 0 && 'pointer-events-none opacity-50',
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-muted">
          <UploadCloud className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <p className="text-[0.9rem] font-medium">
          Drag and drop photos here, or <span className="text-primary underline underline-offset-2">browse</span>
        </p>
        <p className="text-[0.75rem] text-muted-foreground">
          JPG, PNG or WebP · up to {MAX_RAW_BYTES / 1024 / 1024} MB each, shrunk before sending · {room} more fit
        </p>
        <input
          ref={inputRef}
          id={inputId}
          name={props.mode === 'form' ? props.name : undefined}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) add(e.target.files)
            // in upload mode the input is only a picker; in form mode syncInput owns its FileList
            if (props.mode === 'upload') e.target.value = ''
          }}
        />
      </div>
      {hint && <p className="text-[0.75rem] text-muted-foreground">{hint}</p>}

      {picked.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Selected photos">
          {picked.map((p, i) => {
            const st = status[p.id]
            const err = p.problem ?? errors[p.id] ?? null
            return (
              <li key={p.id} className={cn('relative overflow-hidden rounded-md border bg-card', err ? 'border-destructive/60' : 'border-border')}>
                <div className="relative aspect-[4/3] bg-muted">
                  <Image src={p.url} alt="" fill unoptimized className="object-cover" />
                  {i === 0 && props.mode === 'form' && !err && (
                    <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[0.7rem] font-medium text-primary-foreground">Crew photo</span>
                  )}
                  {st === 'uploading' && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
                    </span>
                  )}
                  {st === 'done' && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <CheckCircle2 className="size-6 text-green-600" aria-hidden="true" />
                    </span>
                  )}
                  {!busy && st !== 'done' && (
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      aria-label={`Remove ${p.file.name}`}
                      className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="px-2.5 py-2 text-[0.75rem]">
                  <p className="truncate font-medium" title={p.file.name}>
                    {p.file.name}
                  </p>
                  <p className="text-muted-foreground">
                    {p.shrinking ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                        shrinking {sizeLabel(p.originalSize)}…
                      </span>
                    ) : p.file.size < p.originalSize ? (
                      <>
                        {sizeLabel(p.originalSize)} → {sizeLabel(p.file.size)}
                      </>
                    ) : (
                      sizeLabel(p.file.size)
                    )}
                  </p>
                  {err && (
                    <p className="mt-1 flex items-start gap-1 text-destructive">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {err}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div>
        <Label htmlFor={captionId} className="mb-1.5">
          {captionLabel}
        </Label>
        <Input
          id={captionId}
          name={props.mode === 'form' ? props.captionName : undefined}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={captionPlaceholder}
          className="min-h-11 sm:min-h-9"
        />
      </div>

      {props.mode === 'upload' && (
        <div className="space-y-2">
          {busy && (
            <div className="space-y-1">
              <Progress value={Math.round((doneCount / Math.max(1, readyCount)) * 100)} />
              <p className="text-[0.75rem] text-muted-foreground">
                Uploading {Math.min(doneCount + 1, readyCount)} of {readyCount}… {uploadingCount > 1 ? `${uploadingCount - 1} waiting` : ''}
              </p>
            </div>
          )}
          <Button
            type="button"
            disabled={busy || shrinking || readyCount === 0 || caption.trim() === ''}
            className="min-h-11 sm:min-h-9"
            onClick={() => void uploadAll()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
            {busy ? 'Uploading' : shrinking ? 'Preparing photos' : readyCount > 1 ? `Upload ${readyCount} photos` : 'Upload photo'}
          </Button>
        </div>
      )}
    </div>
  )
}
