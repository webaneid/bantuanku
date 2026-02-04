export interface GCSConfig {
  projectId: string;
  bucketName: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Create JWT token for GCS authentication
 */
async function createJWT(config: GCSConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claim = {
    iss: config.clientEmail,
    scope: 'https://www.googleapis.com/auth/devstorage.full_control',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedClaim = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Import private key
  const privateKey = config.privateKey.replace(/\\n/g, '\n');
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Get access token from JWT
 */
async function getAccessToken(config: GCSConfig): Promise<string> {
  const jwt = await createJWT(config);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

/**
 * Upload file to Google Cloud Storage
 * @param config GCS configuration
 * @param file File buffer to upload
 * @param destination Path in bucket (e.g., "bantuanku/2026/02/image.jpeg")
 * @param mimeType File MIME type
 * @returns Public URL of uploaded file
 */
export async function uploadToGCS(
  config: GCSConfig,
  file: Buffer,
  destination: string,
  mimeType: string
): Promise<string> {
  try {
    console.log('[GCS] Starting upload...');
    console.log('[GCS] Bucket:', config.bucketName);
    console.log('[GCS] Destination:', destination);
    console.log('[GCS] File size:', file.length, 'bytes');

    // Get access token
    console.log('[GCS] Getting access token...');
    const accessToken = await getAccessToken(config);
    console.log('[GCS] Access token obtained');

    // Upload file using REST API
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${config.bucketName}/o?uploadType=media&name=${encodeURIComponent(destination)}`;

    console.log('[GCS] Uploading file...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': mimeType,
        'Content-Length': file.length.toString(),
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
    }

    console.log('[GCS] Upload successful!');

    // Set object to public
    console.log('[GCS] Making file public...');
    const makePublicUrl = `https://storage.googleapis.com/storage/v1/b/${config.bucketName}/o/${encodeURIComponent(destination)}/acl`;

    const aclResponse = await fetch(makePublicUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity: 'allUsers',
        role: 'READER',
      }),
    });

    if (!aclResponse.ok) {
      console.warn('[GCS] Failed to make file public, but upload succeeded');
    }

    // Return public URL
    const publicUrl = `https://storage.googleapis.com/${config.bucketName}/${destination}`;
    console.log('[GCS] Public URL:', publicUrl);
    return publicUrl;
  } catch (error: any) {
    console.error('[GCS] Upload error occurred:');
    console.error('[GCS] Error message:', error.message);
    console.error('[GCS] Full error:', error);
    throw new Error(`Failed to upload to GCS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete file from Google Cloud Storage
 * @param config GCS configuration
 * @param path File path in bucket
 */
export async function deleteFromGCS(
  config: GCSConfig,
  path: string
): Promise<void> {
  try {
    const accessToken = await getAccessToken(config);
    const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${config.bucketName}/o/${encodeURIComponent(path)}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      console.warn('GCS delete warning:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('GCS delete error:', error);
    // Don't throw error - file might already be deleted
  }
}

/**
 * Generate GCS path for file
 * Format: bantuanku/YYYY/MM/timestamp-filename.ext
 */
export function generateGCSPath(filename: string, organizationSlug: string = 'bantuanku'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${organizationSlug}/${year}/${month}/${filename}`;
}
