import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService, CreateCategoryDto, UpdateCategoryDto } from './categories.service';

@ApiTags('Categories — التصنيفات')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post() create(@Body() dto: CreateCategoryDto) { return this.categories.create(dto); }
  @Get() findAll() { return this.categories.findAll(); }
  @Get('tree') findTree() { return this.categories.findTree(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.categories.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.categories.remove(id); }
}
