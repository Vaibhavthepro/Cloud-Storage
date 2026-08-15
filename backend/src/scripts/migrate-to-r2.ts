import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import prisma from '../config/db';
import { R2StorageService } from '../services/storage/R2StorageService';
import { LocalStorageService } from '../services/storage/LocalStorageService';

dotenv.config();

async function migrateFilesToR2() {
  console.log('--- Starting Cloudflare R2 File Migration ---');

  if (!process.env.R2_BUCKET_NAME || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.error('ERROR: Cloudflare R2 environment variables (R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are missing in environment.');
    process.exit(1);
  }

  const r2Service = new R2StorageService();
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
      // Check if already in R2
      const existsInR2 = await r2Service.exists(storagePath);
      if (existsInR2) {
        console.log(` -> Already exists in Cloudflare R2. Skipping.`);
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

      // Stream local file to R2
      const readStream = await localService.download(storagePath);
      await r2Service.upload(storagePath, readStream);

      console.log(` -> SUCCESS: Uploaded ${storagePath} to Cloudflare R2.`);
      successCount++;
    } catch (err) {
      console.error(` -> FAILED to migrate ${storagePath}:`, err);
      failCount++;
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Total Records: ${physicalRecords.length}`);
  console.log(`Successfully Uploaded: ${successCount}`);
  console.log(`Already in R2 (Skipped): ${skippedCount}`);
  console.log(`Failed / Missing Local File: ${failCount}`);
  console.log('-------------------------\n');

  await prisma.$disconnect();
}

migrateFilesToR2().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
