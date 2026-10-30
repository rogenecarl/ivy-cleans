// The only module that speaks Prisma for content; the client lives in src/server/infra/db.ts. Loaded lazily by
// entries.ts so local files and tests never open a database connection.
import { prisma } from '@/server/infra/db'
import type { InputJsonValue } from '@/generated/prisma/internal/prismaNamespace'

export type Row = { data: unknown; deleted: boolean }

export async function readRow(kind: string, key: string): Promise<Row | null> {
  return prisma.contentEntry.findUnique({ where: { kind_key: { kind, key } }, select: { data: true, deleted: true } })
}

export async function writeRow(kind: string, key: string, data: unknown): Promise<void> {
  const value = data as InputJsonValue
  await prisma.contentEntry.upsert({
    where: { kind_key: { kind, key } },
    create: { kind, key, data: value },
    update: { data: value, deleted: false },
  })
}

export async function deleteRow(kind: string, key: string): Promise<void> {
  await prisma.contentEntry.upsert({
    where: { kind_key: { kind, key } },
    create: { kind, key, data: {}, deleted: true },
    update: { data: {}, deleted: true },
  })
}

export async function listRows(kind: string): Promise<{ key: string; deleted: boolean }[]> {
  return prisma.contentEntry.findMany({ where: { kind }, select: { key: true, deleted: true } })
}
