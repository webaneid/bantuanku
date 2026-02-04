import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { settings } from '@bantuanku/db';
import { Storage } from '@google-cloud/storage';

const pool = new Pool({
  connectionString: 'postgresql://webane@localhost:5432/bantuanku',
});

const db = drizzle(pool);

async function debugGCSUpload() {
  console.log('=== Debugging GCS Upload ===\n');

  // 1. Fetch settings
  const cdnSettings = await db.select().from(settings).where(eq(settings.category, 'cdn'));

  const config = {
    bucketName: cdnSettings.find(s => s.key === 'gcs_bucket_name')?.value || '',
    projectId: cdnSettings.find(s => s.key === 'gcs_project_id')?.value || '',
    clientEmail: cdnSettings.find(s => s.key === 'gcs_client_email')?.value || '',
    privateKey: cdnSettings.find(s => s.key === 'gcs_private_key')?.value || '',
  };

  console.log('1. CDN Configuration:');
  console.log('   Bucket:', config.bucketName);
  console.log('   Project:', config.projectId);
  console.log('   Email:', config.clientEmail);
  console.log('   Private Key (first 50 chars):', config.privateKey.substring(0, 50) + '...');
  console.log('   Private Key lines:', config.privateKey.split('\n').filter(l => l.trim()).length);
  console.log('');

  // 2. Initialize Storage client
  console.log('2. Initializing GCS client...');
  try {
    const storage = new Storage({
      projectId: config.projectId,
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey.replace(/\\n/g, '\n'),
      },
    });
    console.log('   ✅ Client initialized');

    // 3. Check bucket exists
    console.log('\n3. Checking if bucket exists...');
    const bucket = storage.bucket(config.bucketName);
    const [exists] = await bucket.exists();
    console.log('   Bucket exists:', exists);

    if (!exists) {
      console.log('   ❌ Bucket not found!');
      await pool.end();
      return;
    }

    // 4. Test upload
    console.log('\n4. Testing upload...');
    const testContent = Buffer.from('Test from Bantuanku at ' + new Date().toISOString());
    const testPath = 'bantuanku/2026/02/test-debug-' + Date.now() + '.txt';

    console.log('   Uploading to:', testPath);

    const file = bucket.file(testPath);
    await file.save(testContent, {
      metadata: {
        contentType: 'text/plain',
        cacheControl: 'public, max-age=31536000',
      },
      public: true,
      resumable: false,
    });

    const publicUrl = `https://storage.googleapis.com/${config.bucketName}/${testPath}`;
    console.log('   ✅ Upload successful!');
    console.log('   URL:', publicUrl);

    // 5. Test if publicly accessible
    console.log('\n5. Testing public access...');
    const response = await fetch(publicUrl);
    console.log('   Status:', response.status);
    console.log('   Content:', await response.text());

  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.errors || error.details || 'No details');
    if (error.stack) {
      console.error('\n   Stack trace:');
      console.error(error.stack);
    }
  }

  await pool.end();
}

debugGCSUpload().catch(console.error);
