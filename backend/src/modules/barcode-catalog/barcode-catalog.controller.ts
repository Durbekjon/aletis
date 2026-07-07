import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { BarcodeCatalogService } from './barcode-catalog.service';
import { BarcodeLookupResponseDto, CompleteBarcodeEntryDto } from './dto';

@ApiTags('Barcode Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('barcode-catalog')
export class BarcodeCatalogController {
  constructor(private readonly barcodeCatalogService: BarcodeCatalogService) {}

  @Get(':barcode')
  @ApiOperation({
    summary:
      'Look up a barcode in the shared catalog, falling back to Soliq (tasnif.soliq.uz)',
  })
  @ApiParam({ name: 'barcode', example: '4780123456789' })
  @ApiResponse({ status: 200, type: BarcodeLookupResponseDto })
  async lookup(
    @Param('barcode') barcode: string,
  ): Promise<BarcodeLookupResponseDto> {
    return this.barcodeCatalogService.lookup(barcode);
  }

  @Patch(':barcode/complete')
  @ApiOperation({
    summary:
      'Save manually-entered product data for a barcode the catalog could not resolve',
  })
  @ApiParam({ name: 'barcode', example: '4780123456789' })
  @ApiResponse({ status: 200, type: BarcodeLookupResponseDto })
  async complete(
    @Param('barcode') barcode: string,
    @Body() dto: CompleteBarcodeEntryDto,
  ): Promise<BarcodeLookupResponseDto> {
    return this.barcodeCatalogService.completeManually(barcode, dto);
  }
}
