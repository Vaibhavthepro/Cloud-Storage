import { StorageProvider } from './StorageProvider';
import { LocalStorageService } from './LocalStorageService';
import { SupabaseStorageService } from './SupabaseStorageService';
import { R2StorageService } from './R2StorageService';

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!instance) {
    const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

    if (provider === 'supabase') {
      console.log('Initializing Supabase Storage Provider...');
      instance = new SupabaseStorageService();
    } else if (provider === 'r2') {
      console.log('Initializing Cloudflare R2 Storage Provider...');
      instance = new R2StorageService();
    } else {
      console.log('Initializing Local Disk Storage Provider...');
      instance = new LocalStorageService();
    }
  }
  return instance;
}
