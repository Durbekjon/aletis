import { Injectable } from '@nestjs/common';
@Injectable()
export class ProductImportService { async importFromBuffer(buffer: any, mimetype: string, userId: number): Promise<any> { throw new Error('Not implemented'); } }