/**
 * Tracker configuration service
 */

import TrackerSchema from "src/domain/TrackerSchema";
import { TrackerResponse } from "src/types/tracker";
import { HttpClient } from "src/utils/http";

export class TrackerConfigService {
  private httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient();
  }

  async getTrackers(
    serviceUrl: string,
    tenant: string,
    apiKey: string
  ): Promise<{ trackers: TrackerSchema[]; apiUrl: string }> {
    const apiUrl = `${serviceUrl}/sentinel/v1`;

    const config = await this.httpClient.get<TrackerResponse>(apiUrl, {
      headers: {
        tenant,
        "api-key": apiKey,
        "Content-Type": "application/json",
        platform: "web",
      },
    });

    return {
      trackers: config.configs,
      apiUrl,
    };
  }
}
