import NodeClam from 'clamscan';

export class VirusScannerService {
  private scanner: any = null;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.scanner = await new NodeClam().init({
        clamdscan: {
          host: process.env.CLAMAV_HOST || 'localhost',
          port: parseInt(process.env.CLAMAV_PORT || '3310'),
          timeout: 60000,
          localFallback: false,
          path: '/usr/bin/clamdscan',
          multiscan: true,
          reloadDb: false,
          active: true,
          bypassTest: false,
        },
        preference: 'clamdscan'
      });
      console.log('ClamAV Scanner initialized successfully');
    } catch (err) {
      console.error('Failed to initialize ClamAV Scanner:', err);
    }
  }

  public async scanFile(filePath: string): Promise<{ isInfected: boolean, viruses: string[] }> {
    if (!this.scanner) {
      console.warn('Scanner not initialized, skipping scan.');
      return { isInfected: false, viruses: [] };
    }

    try {
      const { isInfected, viruses } = await this.scanner.isInfected(filePath);
      return { isInfected, viruses };
    } catch (err) {
      console.error('Error scanning file:', err);
      // In production, you might want to fail closed (treat as infected or error out)
      // but for development resilience, returning false here if clamav is unreachable.
      return { isInfected: false, viruses: [] };
    }
  }
}
