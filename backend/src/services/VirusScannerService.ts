import NodeClam from 'clamscan';

export class VirusScannerService {
  private scanner: any = null;
  private isInitialized: boolean = false;
  private initializationAttempted: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.initializationAttempted) return;
    this.initializationAttempted = true;

    if (process.env.CLAMAV_ENABLED === 'false') {
      console.log('[VirusScanner] ClamAV scanning explicitly disabled via CLAMAV_ENABLED=false');
      return;
    }

    const host = process.env.CLAMAV_HOST || 'localhost';
    const port = parseInt(process.env.CLAMAV_PORT || '3310', 10);

    try {
      this.scanner = await new NodeClam().init({
        clamdscan: {
          host,
          port,
          timeout: 5000,
          localFallback: false,
          path: '/usr/bin/clamdscan',
          multiscan: true,
          reloadDb: false,
          active: true,
          bypassTest: false,
        },
        preference: 'clamdscan',
      });
      this.isInitialized = true;
      console.log(`[VirusScanner] ClamAV Scanner initialized successfully at ${host}:${port}`);
    } catch (err: any) {
      this.isInitialized = false;
      this.scanner = null;
      console.warn(
        `[VirusScanner] ClamAV daemon is not reachable at ${host}:${port} (${err.code || err.message}). Skipping virus scan.`
      );
    }
  }

  public async scanFile(filePath: string): Promise<{ isInfected: boolean; viruses: string[] }> {
    if (!this.initializationAttempted) {
      await this.init();
    }

    if (!this.scanner || !this.isInitialized) {
      return { isInfected: false, viruses: [] };
    }

    try {
      const { isInfected, viruses } = await this.scanner.isInfected(filePath);
      return { isInfected, viruses };
    } catch (err: any) {
      console.error('[VirusScanner] Error scanning file:', err.message || err);
      return { isInfected: false, viruses: [] };
    }
  }
}
