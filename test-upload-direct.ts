import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { settings, media as mediaTable } from '@bantuanku/db';
import { uploadToGCS, generateGCSPath, type GCSConfig } from './apps/api/src/lib/gcs';
import * as fs from 'fs';

const pool = new Pool({
  connectionString: 'postgresql://webane@localhost:5432/bantuanku',
});

const db = drizzle(pool);

async function testDirectUpload() {
  console.log('=== Testing Direct Upload to GCS ===\n');

  // 1. Get CDN settings
  const cdnSettings = await db.select().from(settings).where(eq(settings.category, 'cdn'));

  const config: GCSConfig = {
    bucketName: cdnSettings.find(s => s.key === 'gcs_bucket_name')?.value || '',
    projectId: cdnSettings.find(s => s.key === 'gcs_project_id')?.value || '',
    clientEmail: cdnSettings.find(s => s.key === 'gcs_client_email')?.value || '',
    privateKey: cdnSettings.find(s => s.key === 'gcs_private_key')?.value || '',
  };

  console.log('CDN Config loaded:', config.bucketName);

  // 2. Create a test image (1x1 pixel PNG)
  const testImage = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const filename = `${Date.now()}-test-direct-upload.png`;
  const gcsPath = generateGCSPath(filename);

  console.log('Uploading to:', gcsPath);
  console.log('');

  try {
    // 3. Upload to GCS
    const publicUrl = await uploadToGCS(config, testImage, gcsPath, 'image/png');

    console.log('\n✅ Upload successful!');
    console.log('Public URL:', publicUrl);

    // 4. Save to database
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    await db.insert(mediaTable).values({
      id,
      filename,
      originalName: 'test-direct-upload.png',
      mimeType: 'image/png',
      size: testImage.length,
      url: publicUrl,
      path: publicUrl,
      folder: 'gcs',
      category: 'general',
    });

    console.log('✅ Saved to database');

    // 5. Test if accessible
    console.log('\nTesting if file is publicly accessible...');
    const response = await fetch(publicUrl);
    console.log('Status:', response.status, response.statusText);

    if (response.ok) {
      console.log('\n🎉 Success! GCS CDN integration is working!');
      console.log('You can now upload images from admin dashboard.');
    }

  } catch (error: any) {
    console.error('\n❌ Upload failed:');
    console.error('Error:', error.message);
  }

  await pool.end();
}

testDirectUpload().catch(console.error);
