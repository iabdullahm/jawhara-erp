import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryMovementsDto, StockMovementsService } from './stock-movements.service';

@ApiTags('Stock Movements — حركات المخزون')
@ApiBearerAuth()
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Get()
  list(
    @Query() query: QueryMovementsDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.list(query, user, tenantId);
  }
}
