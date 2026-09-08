// src/lib/db.ts
// The Prisma client, constructed once; shared by the leads store and better-auth (two clients = two pg Pools).
import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { DB_DISABLE_HAPPY_EYEBALLS } from '@/leads/env'

// Prisma 7 connects through Node's `net` via `pg`. In some sandboxes Neon's pooler hostname times out while its IPv4
// address connects instantly; DB_DISABLE_HAPPY_EYEBALLS is the opt-in for that. Whether undici inherits this is unverified.
if (DB_DISABLE_HAPPY_EYEBALLS) {
  setDefaultAutoSelectFamily(false)
  // both calls: disabling the race alone still tries AAAA first and stalls with no IPv6 route. Measured: ETIMEDOUT -> 1.9s.
  setDefaultResultOrder('ipv4first')
}

// driver-adapter client: @prisma/adapter-pg over a real pg Pool
// pool settings from trip-scheduler. connectionTimeoutMillis matters most: unset, pg-pool never times out a hung
// connect and a customer's submission hangs until the platform kills it.
function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    statement_timeout: 30000,
  })
  const adapter = new PrismaPg(pool)
  // without this Prisma reports nothing; the server log is the only place the real cause shows
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// one client per process; parked on globalThis in dev so reloads don't open a pool each
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
