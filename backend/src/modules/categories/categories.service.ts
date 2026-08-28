import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { CategoryResponseDto } from './dto/category-response.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCategories(filters: { isRoot?: boolean; parentId?: number } = {}): Promise<CategoryResponseDto[]> {
    let where: any = {};
    if (filters.parentId !== undefined) {
      where = { parentId: filters.parentId };
    } else if (filters.isRoot) {
      where = { parentId: null };
    }
    
    const categories = await this.prisma.category.findMany({
      where,
      include: {
        itemSpecs: true,
      },
      orderBy: {
        name_uz: 'asc',
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name_uz: cat.name_uz,
      name_ru: cat.name_ru,
      name_en: cat.name_en,
      isLeaf: cat.isLeaf,
      parentId: cat.parentId,
      itemSpecs: cat.itemSpecs.map((spec) => ({
        id: spec.id,
        name: spec.name,
        type: spec.type,
        required: spec.required,
        options: spec.options || [],
      })),
    }));
  }

  async getCategoryById(id: number): Promise<CategoryResponseDto | null> {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: {
        itemSpecs: true,
      },
    });

    if (!cat) return null;

    return {
      id: cat.id,
      name_uz: cat.name_uz,
      name_ru: cat.name_ru,
      name_en: cat.name_en,
      isLeaf: cat.isLeaf,
      parentId: cat.parentId,
      itemSpecs: cat.itemSpecs.map((spec) => ({
        id: spec.id,
        name: spec.name,
        type: spec.type,
        required: spec.required,
        options: spec.options || [],
      })),
    };
  }
}
