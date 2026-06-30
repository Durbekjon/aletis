import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ImageToBase64Service {
  /**
   * Converts an image to a base64 string. Accepts either an absolute URL
   * (e.g. an ImageKit CDN URL) which is fetched over HTTP, or a relative
   * filesystem path from the project root (legacy local uploads).
   */
  async convert(source: string): Promise<string> {
    try {
      if (/^https?:\/\//i.test(source)) {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} fetching ${source}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
      }

      const filepath = path.join(process.cwd(), source);
      const data = await readFile(filepath);
      return data.toString('base64');
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
  }
}
