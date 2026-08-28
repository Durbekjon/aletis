import { Controller, Get, Query, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('Categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get global categories' })
  @ApiQuery({ name: 'isRoot', required: false, type: Boolean, description: 'Only fetch root (head) categories' })
  @ApiQuery({ name: 'parentId', required: false, type: Number, description: 'Fetch categories by parent ID' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  getCategories(@Query('isRoot') isRoot?: string, @Query('parentId') parentId?: string) {
    const isRootBool = isRoot === 'true' || isRoot === '';
    const parentIdNum = parentId ? parseInt(parentId, 10) : undefined;
    return this.categoriesService.getCategories({ isRoot: isRootBool, parentId: parentIdNum });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiOkResponse({ type: CategoryResponseDto })
  async getCategoryById(@Param('id', ParseIntPipe) id: number) {
    const category = await this.categoriesService.getCategoryById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }
}
