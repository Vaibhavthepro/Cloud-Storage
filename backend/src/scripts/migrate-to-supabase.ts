import dotenv from 'dotenv';
import prisma from '../config/db';
import { SupabaseStorageService } from '../services/storage/SupabaseStorageService';
import { LocalStorageService } from '../services/storage/LocalStorageService';

dotenv.config();

async function migrateFilesToSupabase() {
  console.log('--- Starting Supabase Storage File Migration ---');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required.');
    process.exit(1);
  }

  const supabaseService = new SupabaseStorageService();
  const localService = new LocalStorageService();

  const physicalRecords = await prisma.physicalStorage.findMany();
  console.log(`Found ${physicalRecords.length} physical storage records in database.`);

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (const record of physicalRecords) {
    const storagePath = record.storagePath;
    console.log(`Processing file record: ID=${record.id}, path=${storagePath}`);

    try {
      // Check if already in Supabase Storage
      const existsInSupabase = await supabaseService.exists(storagePath);
      if (existsInSupabase) {
        console.log(` -> Already exists in Supabase Storage. Skipping.`);
        skippedCount++;
        continue;
      }

      // Check if exists on local disk
      const existsLocally = await localService.exists(storagePath);
      if (!existsLocally) {
        console.warn(` -> WARNING: File not found on local filesystem at ${storagePath}. Skipping.`);
        failCount++;
        continue;
      }

      // Stream local file to Supabase Storage
      const readStream = await localService.download(storagePath);
      await supabaseService.upload(storagePath, readStream);

      console.log(` -> SUCCESS: Uploaded ${storagePath} to Supabase Storage.`);
      successCount++;
    } catch (err) {
      console.error(` -> FAILED to migrate ${storagePath}:`, err);
      failCount++;
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Total Records: ${physicalRecords.length}`);
  console.log(`Successfully Uploaded: ${successCount}`);
  console.log(`Already in Supabase (Skipped): ${skippedCount}`);
  console.log(`Failed / Missing Local File: ${failCount}`);
  console.log('-------------------------\n');

  await prisma.$disconnect();
}

migrateFilesToSupabase().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
