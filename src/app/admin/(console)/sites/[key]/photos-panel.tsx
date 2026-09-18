'use client'

import Image from 'next/image'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { MarketPhoto } from '@/content/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MAX_PHOTOS } from '@/pipeline/photos'
import { SubmitButton } from '../../../submit-button'
import { removePhotoAction, savePhotoCaptionsAction, uploadOnePhotoAction } from '../site-actions'
import { PhotoDropzone } from '../../../photo-dropzone'

// Photos of this crew and its work. One upload per submit; captions are the alt text and save as a set.
export function PhotosPanel({ cityKey, photos }: { cityKey: string; photos: readonly MarketPhoto[] }) {
  const [removing, startRemove] = useTransition()
  const router = useRouter()

  function remove(path: string) {
    startRemove(async () => {
      const result = await removePhotoAction(cityKey, path)
      if (result.ok) toast.success('Photo removed')
      else toast.error(result.error)
    })
  }

  return (
    <div className="space-y-6">
      {photos.length > 0 && (
        <form action={savePhotoCaptionsAction.bind(null, cityKey)} className="space-y-3">
          <ul className="grid gap-3 sm:grid-cols-2">
            {photos.map((photo) => (
              <li key={photo.path} className="flex gap-3 rounded-md border border-border p-2">
                <Image
                  src={photo.path}
                  alt={photo.alt}
                  width={120}
                  height={90}
                  unoptimized
                  className="h-[90px] w-[120px] shrink-0 rounded-sm object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Label htmlFor={`alt:${photo.path}`} className="sr-only">
                    Caption
                  </Label>
                  <Input
                    id={`alt:${photo.path}`}
                    name={`alt:${photo.path}`}
                    defaultValue={photo.alt}
                    className="min-h-11 sm:min-h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={removing}
                    className="min-h-11 self-start sm:min-h-8"
                    onClick={() => remove(photo.path)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <SubmitButton pendingLabel="Saving">Save captions</SubmitButton>
        </form>
      )}

      {photos.length < MAX_PHOTOS ? (
        <PhotoDropzone
          mode="upload"
          existing={photos.length}
          label="Add photos"
          hint="The crew, a finished room, a van: real photos of this branch. They are shrunk in your browser before they are sent, so a large phone photo is fine."
          captionLabel="Caption for these photos"
          captionPlaceholder="Maria and the crew outside a Katy home"
          upload={async (file, alt) => {
            const fd = new FormData()
            fd.set('photo', file)
            fd.set('alt', alt)
            return uploadOnePhotoAction(cityKey, fd)
          }}
          onDone={() => {
            toast.success('Photos uploaded')
            router.refresh()
          }}
        />
      ) : (
        <p className="text-[0.8rem] text-muted-foreground">{MAX_PHOTOS} photos is the limit. Remove one to add another.</p>
      )}
    </div>
  )
}
