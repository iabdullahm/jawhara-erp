import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BranchesService, CreateBranchDto, UpdateBranchDto } from './branches.service';

@ApiTags('Branches — الفروع')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Post() create(@Body() dto: CreateBranchDto) { return this.branches.create(dto); }
  @Get() findAll() { return this.branches.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.branches.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.branches.remove(id); }
}
