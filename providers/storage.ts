import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '@/platform/env'
import { ProviderError } from '@/providers/errors'

const client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: env.R2_ACCESS_KEY_ID
    ? { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '' }
    : undefined,
})

const bucket = env.R2_BUCKET_NAME ?? 'default'

export async function upload(
  key: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    )
    return key
  } catch (error) {
    throw new ProviderError('r2', 'upload', 500, error)
  }
}

export async function download(key: string): Promise<Buffer> {
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    if (!response.Body) {
      throw new ProviderError('r2', 'download', 404, 'Empty response body')
    }
    const bytes = await response.Body.transformToByteArray()
    return Buffer.from(bytes)
  } catch (error) {
    if (error instanceof ProviderError) throw error
    const errName = (error as { name?: string })?.name
    if (errName === 'NoSuchKey' || errName === 'NotFound') {
      throw new ProviderError('r2', 'download', 404, error)
    }
    throw new ProviderError('r2', 'download', 500, error)
  }
}

export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  try {
    return await awsGetSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn,
    })
  } catch (error) {
    throw new ProviderError('r2', 'getSignedUrl', 500, error)
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  } catch (error) {
    throw new ProviderError('r2', 'remove', 500, error)
  }
}
