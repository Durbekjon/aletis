import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AdminProductsService } from './admin-products.service';

@ApiTags('Admin — Products')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
@Controller({ path: 'admin/products', version: '1' })
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Post('reindex')
  @ApiOperation({
    summary:
      'Rebuild the Weaviate product search index from Postgres (removes orphans, re-embeds all active products in the background)',
  })
  async reindex() {
    return this.adminProductsService.reindexEmbeddings();
  }
}
