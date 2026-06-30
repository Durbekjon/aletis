import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '@core/prisma/prisma.service';
import { FieldType, ProductStatus, Currency } from '@prisma/client';
import { ImportProductsResponseDto } from './dto/import-products.dto';

// Columns that map directly to the Product model — not dynamic schema fields
const RESERVED_COLUMNS = new Set([
  'name',
  'price',
  'currency',
  'quantity',
  'qty',
  'status',
]);

const VALID_CURRENCIES = new Set(Object.values(Currency));
const VALID_STATUSES = new Set(Object.values(ProductStatus));

@Injectable()
export class ProductImportService {
  private readonly logger = new Logger(ProductImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importFromBuffer(
    buffer: Buffer,
    mimetype: string,
    userId: number,
  ): Promise<ImportProductsResponseDto> {
    const organizationId = await this.resolveOrgId(userId);
    const rows = this.parseFile(buffer, mimetype);

    if (rows.length === 0) {
      throw new BadRequestException('Fayl bo\'sh yoki noto\'g\'ri format');
    }

    const schema = await this.prisma.productSchema.findUnique({
      where: { organizationId },
      include: { fields: true },
    });

    if (!schema) {
      throw new NotFoundException(
        'Product schema topilmadi. Avval schema yarating.',
      );
    }

    // Determine all dynamic columns in the file
    const allColumns = Object.keys(rows[0]);
    const dynamicColumns = allColumns.filter(
      (col) => !RESERVED_COLUMNS.has(col.toLowerCase()),
    );

    // Match or create schema fields for each dynamic column
    const createdFieldNames: string[] = [];
    const fieldMap = new Map<string, number>(); // colName → fieldId

    for (const col of dynamicColumns) {
      const existing = schema.fields.find(
        (f) => f.name.toLowerCase() === col.toLowerCase(),
      );
      if (existing) {
        fieldMap.set(col, existing.id);
      } else {
        // Detect type from first non-empty value in this column
        const sampleValue = rows.find((r) => r[col] !== undefined && r[col] !== '')?.[col];
        const fieldType = this.detectFieldType(sampleValue);

        const nextOrder =
          schema.fields.length + createdFieldNames.length;

        const newField = await this.prisma.field.create({
          data: {
            schemaId: schema.id,
            name: col,
            type: fieldType,
            required: false,
            order: nextOrder,
          },
        });
        fieldMap.set(col, newField.id);
        createdFieldNames.push(col);
        this.logger.log(`Created new field: "${col}" (${fieldType})`);
      }
    }

    // Import rows
    let imported = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-based + header row

      try {
        const name = String(row['name'] ?? row['Name'] ?? '').trim();
        if (!name) {
          errors.push({ row: rowNum, message: '"name" ustuni bo\'sh' });
          skipped++;
          continue;
        }

        const rawPrice = row['price'] ?? row['Price'];
        const price = parseFloat(String(rawPrice));
        if (isNaN(price) || price < 0) {
          errors.push({
            row: rowNum,
            message: `"price" noto\'g\'ri qiymat: ${rawPrice}`,
          });
          skipped++;
          continue;
        }

        const rawCurrency = String(
          row['currency'] ?? row['Currency'] ?? 'UZS',
        )
          .trim()
          .toUpperCase();
        const currency = VALID_CURRENCIES.has(rawCurrency as Currency)
          ? (rawCurrency as Currency)
          : Currency.UZS;

        const rawQty = row['quantity'] ?? row['qty'] ?? row['Quantity'] ?? row['Qty'];
        const quantity = rawQty !== undefined ? parseInt(String(rawQty), 10) : 0;

        const rawStatus = String(row['status'] ?? row['Status'] ?? 'ACTIVE')
          .trim()
          .toUpperCase();
        const status = VALID_STATUSES.has(rawStatus as ProductStatus)
          ? (rawStatus as ProductStatus)
          : ProductStatus.ACTIVE;

        // Build dynamic field values
        const fieldValues: {
          fieldId: number;
          valueText?: string;
          valueNumber?: number;
          valueBool?: boolean;
        }[] = [];

        for (const [col, fieldId] of fieldMap.entries()) {
          const raw = row[col];
          if (raw === undefined || raw === '') continue;

          const fieldDef =
            schema.fields.find((f) => f.id === fieldId) ??
            (await this.prisma.field.findUnique({ where: { id: fieldId } }));

          if (!fieldDef) continue;

          switch (fieldDef.type) {
            case FieldType.NUMBER:
              fieldValues.push({ fieldId, valueNumber: parseFloat(String(raw)) });
              break;
            case FieldType.BOOLEAN:
              fieldValues.push({
                fieldId,
                valueBool: ['true', '1', 'yes', 'ha', 'да'].includes(
                  String(raw).toLowerCase(),
                ),
              });
              break;
            default:
              fieldValues.push({ fieldId, valueText: String(raw) });
          }
        }

        await this.prisma.product.create({
          data: {
            name,
            price,
            currency,
            quantity: isNaN(quantity) ? 0 : quantity,
            status,
            organizationId,
            schemaId: schema.id,
            fields: {
              create: fieldValues,
            },
          },
        });

        imported++;
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message });
        skipped++;
      }
    }

    this.logger.log(
      `Import done: org=${organizationId} imported=${imported} skipped=${skipped} newFields=${createdFieldNames.length}`,
    );

    return { imported, skipped, createdFields: createdFieldNames, errors };
  }

  private parseFile(buffer: Buffer, mimetype: string): Record<string, any>[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } catch {
      throw new BadRequestException(
        'Faylni o\'qib bo\'lmadi. CSV yoki Excel format bo\'lishi kerak.',
      );
    }
  }

  private detectFieldType(value: unknown): FieldType {
    if (value === undefined || value === null || value === '') return FieldType.TEXT;
    const str = String(value).toLowerCase().trim();
    if (['true', 'false', 'yes', 'no', 'ha', 'yo\'q', 'да', 'нет', '1', '0'].includes(str)) {
      return FieldType.BOOLEAN;
    }
    if (!isNaN(Number(value)) && str !== '') return FieldType.NUMBER;
    return FieldType.TEXT;
  }

  private async resolveOrgId(userId: number): Promise<number> {
    const member = await this.prisma.member.findUnique({
      where: { userId },
      select: { organizationId: true },
    });
    if (!member) throw new NotFoundException('Organization topilmadi');
    return member.organizationId;
  }
}
