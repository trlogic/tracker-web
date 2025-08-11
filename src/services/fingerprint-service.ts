/**
 * Device fingerprinting service
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

export class FingerprintService {
  static async getDeviceFingerprint(): Promise<string> {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      return result.visitorId;
    } catch (error) {
      console.error("Error generating device fingerprint:", error);
      return "";
    }
  }
}
