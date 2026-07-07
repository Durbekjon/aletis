import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
import { BarcodeCatalogController } from './barcode-catalog.controller';
import { BarcodeCatalogService } from './barcode-catalog.service';
import { SoliqBarcodeProvider } from './providers/soliq-barcode.provider';
import { BARCODE_PROVIDERS } from './providers/barcode-provider.interface';

@Module({
  imports: [CoreModule],
  controllers: [BarcodeCatalogController],
  providers: [
    SoliqBarcodeProvider,
    {
      provide: BARCODE_PROVIDERS,
      useFactory: (soliq: SoliqBarcodeProvider) => [soliq],
      inject: [SoliqBarcodeProvider],
    },
    BarcodeCatalogService,
  ],
  exports: [BarcodeCatalogService],
})
export class BarcodeCatalogModule {}
