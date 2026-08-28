import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

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
const PUBLIC_URL = () => process.env.NEXT_PUBLIC_S3_PUBLIC_URL ?? ""

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
  }))
  return `${PUBLIC_URL()}/${BUCKET()}/${key}`
}

export async function deleteFromStorage(key: string): Promise<void> {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }))
}
