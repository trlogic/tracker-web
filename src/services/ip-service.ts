/**
 * IP address detection service
 */

import { HttpClient } from "src/utils/http";

export class IpService {
  private static httpClient = new HttpClient();

  static async fetchIp(): Promise<string> {
    try {
      const response = await this.httpClient.get<{ ip: string }>("https://api.ipify.org?format=json");
      return response.ip;
    } catch (error) {
      console.error("Error fetching IP address:", error);
      return "unknown";
    }
  }
}
