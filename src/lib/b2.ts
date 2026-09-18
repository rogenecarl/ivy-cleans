// Backblaze B2 through its S3 endpoint, the same wiring trip-scheduler uses. Configured only when all four
// variables are set; otherwise photo storage falls back to files under public/.
import { Agent } from 'node:https'
import { S3Client } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'

const endpoint = process.env.B2_ENDPOINT?.trim() || ''
const accessKeyId = process.env.B2_ACCESS_KEY_ID?.trim() || ''
const secretAccessKey = process.env.B2_SECRET_ACCESS_KEY?.trim() || ''
export const B2_BUCKET = process.env.B2_BUCKET_NAME?.trim() || ''

export function b2Configured(): boolean {
  return Boolean(endpoint && accessKeyId && secretAccessKey && B2_BUCKET)
}

// "https://s3.us-east-005.backblazeb2.com" -> "us-east-005"
function regionOf(url: string): string {
  return /s3\.([a-z0-9-]+)\.backblazeb2\.com/.exec(url)?.[1] ?? 'us-east-005'
}

let client: S3Client | null = null

export function b2Client(): S3Client {
  if (!b2Configured()) throw new Error('Backblaze is not configured: set B2_ENDPOINT, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY and B2_BUCKET_NAME')
  client ??= new S3Client({
    endpoint,
    region: regionOf(endpoint),
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
    // IPv4 only: the sandbox's IPv6 route stalls, and B2 answers on v4 either way
    requestHandler: new NodeHttpHandler({ httpsAgent: new Agent({ family: 4 }) }),
  })
  return client
}
