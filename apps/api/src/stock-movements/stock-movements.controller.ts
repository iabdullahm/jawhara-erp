import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryMovementsDto, StockMovementsService } from './stock-movements.service';

@ApiTags('Stock Movements — حركات المخزون')
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Get() list(@Query() query: QueryMovementsDto) {
    return this.service.list(query);
  }
}
