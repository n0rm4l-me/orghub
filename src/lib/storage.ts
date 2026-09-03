import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"

function getClient() {
  const endpoint = process.env.S3_ENDPOINT
  const region   = process.env.S3_REGION ?? "us-east-1"
  const accessKeyId     = process.env.S3_ACCESS_KEY ?? ""
  const secretAccessKey = process.env.S3_SECRET_KEY ?? ""

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    // MinIO needs path-style access
    forcePathStyle: true,
  })
}

const BUCKET = () => process.env.S3_BUCKET ?? "orghub"

export async function uploadToStorage(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const client = getClient()
  await client.send(new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }))
  return `/uploads/${key}`
}

export async function getFromStorage(key: string): Promise<Buffer | null> {
  const client = getClient()
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }))
    if (!res.Body) return null
    return Buffer.from(await res.Body.transformToByteArray())
  } catch {
    return null
  }
}

export async function deleteFromStorage(key: string): Promise<void> {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }))
}

export async function listStorageObjects(prefix = ""): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const client = getClient()
  const results: { key: string; size: number; lastModified: Date }[] = []
  let continuationToken: string | undefined

  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET(),
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }))
    for (const obj of res.Contents ?? []) {
      if (obj.Key) results.push({ key: obj.Key, size: obj.Size ?? 0, lastModified: obj.LastModified ?? new Date() })
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (continuationToken)

  return results
}

export async function copyStorageObject(sourceKey: string, destKey: string): Promise<void> {
  const client = getClient()
  await client.send(new CopyObjectCommand({
    Bucket: BUCKET(),
    CopySource: `${BUCKET()}/${sourceKey}`,
    Key: destKey,
  }))
}
