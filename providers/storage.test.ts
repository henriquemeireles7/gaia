import { afterEach, describe, expect, it, mock } from 'bun:test'
import { ProviderError } from './errors'

// Mock the AWS SDK clients
const mockSend = mock(() => Promise.resolve({}))

mock.module('@aws-sdk/client-s3', () => ({
  S3Client: class MockS3Client {
    send = mockSend
  },
  PutObjectCommand: class MockPutObjectCommand {
    constructor(public input: unknown) {}
  },
  GetObjectCommand: class MockGetObjectCommand {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {
    constructor(public input: unknown) {}
  },
}))

mock.module('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mock(() => Promise.resolve('https://signed-url.example.com/file')),
}))

// Must import AFTER mock.module
const { upload, download, getSignedUrl, remove } = await import('./storage')
const presigner = await import('@aws-sdk/s3-request-presigner')

afterEach(() => {
  mockSend.mockClear()
  ;(presigner.getSignedUrl as ReturnType<typeof mock>).mockClear()
})

describe('upload', () => {
  it('uploads data and returns the key', async () => {
    const data = Buffer.from('hello')
    const result = await upload('files/test.txt', data, 'text/plain')
    expect(result).toBe('files/test.txt')
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('passes correct parameters to PutObjectCommand', async () => {
    const data = Buffer.from('image data')
    await upload('images/photo.png', data, 'image/png')
    const command = (mockSend.mock.calls[0] as unknown[])[0] as { input: Record<string, unknown> }
    expect(command.input).toEqual({
      Bucket: 'default',
      Key: 'images/photo.png',
      Body: data,
      ContentType: 'image/png',
    })
  })

  it('throws ProviderError on S3 failure', async () => {
    mockSend.mockImplementationOnce(() => Promise.reject(new Error('S3 down')))
    const data = Buffer.from('test')
    try {
      await upload('key', data, 'text/plain')
      expect(true).toBe(false) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).provider).toBe('r2')
      expect((error as ProviderError).operation).toBe('upload')
      expect((error as ProviderError).statusCode).toBe(500)
    }
  })
})

describe('download', () => {
  it('downloads and returns a Buffer', async () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111])
    mockSend.mockImplementationOnce(() =>
      Promise.resolve({
        Body: { transformToByteArray: () => Promise.resolve(bytes) },
      }),
    )
    const result = await download('files/test.txt')
    expect(result).toBeInstanceOf(Buffer)
    expect(result.toString()).toBe('Hello')
  })

  it('throws ProviderError 404 when body is empty', async () => {
    mockSend.mockImplementationOnce(() => Promise.resolve({ Body: null }))
    try {
      await download('missing.txt')
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).statusCode).toBe(404)
      expect((error as ProviderError).operation).toBe('download')
    }
  })

  it('throws ProviderError 404 for NoSuchKey', async () => {
    const s3Error = new Error('Not found')
    ;(s3Error as unknown as { name: string }).name = 'NoSuchKey'
    mockSend.mockImplementationOnce(() => Promise.reject(s3Error))
    try {
      await download('nonexistent.txt')
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).statusCode).toBe(404)
    }
  })

  it('throws ProviderError 404 for NotFound', async () => {
    const s3Error = new Error('Not found')
    ;(s3Error as unknown as { name: string }).name = 'NotFound'
    mockSend.mockImplementationOnce(() => Promise.reject(s3Error))
    try {
      await download('gone.txt')
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).statusCode).toBe(404)
    }
  })

  it('throws ProviderError 500 for unknown errors', async () => {
    mockSend.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
    try {
      await download('file.txt')
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).statusCode).toBe(500)
      expect((error as ProviderError).operation).toBe('download')
    }
  })
})

describe('getSignedUrl', () => {
  it('returns a signed URL string', async () => {
    const url = await getSignedUrl('files/doc.pdf')
    expect(url).toBe('https://signed-url.example.com/file')
  })

  it('calls presigner with default expiry of 3600', async () => {
    await getSignedUrl('files/doc.pdf')
    const mockFn = presigner.getSignedUrl as ReturnType<typeof mock>
    expect(mockFn).toHaveBeenCalledTimes(1)
    const args = mockFn.mock.calls[0] as unknown[]
    expect(args[2]).toEqual({ expiresIn: 3600 })
  })

  it('passes custom expiry to presigner', async () => {
    await getSignedUrl('files/doc.pdf', 7200)
    const mockFn = presigner.getSignedUrl as ReturnType<typeof mock>
    const args = mockFn.mock.calls[0] as unknown[]
    expect(args[2]).toEqual({ expiresIn: 7200 })
  })

  it('throws ProviderError on presigner failure', async () => {
    ;(presigner.getSignedUrl as ReturnType<typeof mock>).mockImplementationOnce(() =>
      Promise.reject(new Error('Presign failed')),
    )
    try {
      await getSignedUrl('files/doc.pdf')
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).provider).toBe('r2')
      expect((error as ProviderError).operation).toBe('getSignedUrl')
      expect((error as ProviderError).statusCode).toBe(500)
    }
  })
})

describe('remove', () => {
  it('removes an object without throwing', async () => {
    await expect(remove('files/old.txt')).resolves.toBeUndefined()
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('passes correct key to DeleteObjectCommand', async () => {
    await remove('files/delete-me.txt')
    const command = (mockSend.mock.calls[0] as unknown[])[0] as { input: Record<string, unknown> }
    expect(command.input).toEqual({
      Bucket: 'default',
      Key: 'files/delete-me.txt',
    })
  })

  it('throws ProviderError on S3 failure', async () => {
    mockSend.mockImplementationOnce(() => Promise.reject(new Error('S3 delete failed')))
    try {
      await remove('files/locked.txt')
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).provider).toBe('r2')
      expect((error as ProviderError).operation).toBe('remove')
      expect((error as ProviderError).statusCode).toBe(500)
    }
  })
})
