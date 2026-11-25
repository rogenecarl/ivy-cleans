import { afterEach, describe, expect, it } from 'vitest'
import { provisioningStatus } from '@/server/pipeline/provision'

const KEYS = ['STUB_MODEL', 'PORKBUN_API_KEY', 'PORKBUN_SECRET_KEY', 'VERCEL_TOKEN', 'VERCEL_PROJECT_ID', 'GLOBAL_CONFIG_ID', 'EDGE_CONFIG'] as const
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
const set = (env: Partial<Record<(typeof KEYS)[number], string>>) => {
  for (const k of KEYS) delete process.env[k]
  Object.assign(process.env, env)
}
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('provisioningStatus', () => {
  it('reports nothing automatic when no account is configured', () => {
    set({})
    expect(provisioningStatus()).toEqual({ autoRouting: false, canBuy: false })
  })

  it('routes automatically only when Global Config can be both written and read', () => {
    set({ VERCEL_TOKEN: 't', GLOBAL_CONFIG_ID: 'ecfg_1' })
    expect(provisioningStatus().autoRouting).toBe(false)
    set({ VERCEL_TOKEN: 't', GLOBAL_CONFIG_ID: 'ecfg_1', EDGE_CONFIG: 'https://edge-config.vercel.com/x' })
    expect(provisioningStatus().autoRouting).toBe(true)
  })

  it('offers buying only when Porkbun, Vercel and Global Config are all set', () => {
    set({ VERCEL_TOKEN: 't', GLOBAL_CONFIG_ID: 'ecfg_1', EDGE_CONFIG: 'x', VERCEL_PROJECT_ID: 'p' })
    expect(provisioningStatus().canBuy).toBe(false)
    set({ VERCEL_TOKEN: 't', GLOBAL_CONFIG_ID: 'ecfg_1', EDGE_CONFIG: 'x', VERCEL_PROJECT_ID: 'p', PORKBUN_API_KEY: 'pk1', PORKBUN_SECRET_KEY: 'sk1' })
    expect(provisioningStatus()).toEqual({ autoRouting: true, canBuy: true })
  })

  it('treats blank values as unset', () => {
    set({ VERCEL_TOKEN: ' ', GLOBAL_CONFIG_ID: '', EDGE_CONFIG: '' })
    expect(provisioningStatus().autoRouting).toBe(false)
  })

  it('is fully on under the stub model, so tests and the E2E run see every control', () => {
    set({ STUB_MODEL: '1' })
    expect(provisioningStatus()).toEqual({ autoRouting: true, canBuy: true })
  })
})
