import { Module } from '@nestjs/common';
import { GoldRatesController } from './gold-rates.controller';
import { GoldRatesService } from './gold-rates.service';
import { GoldPriceApiService } from './gold-price-api.service';

@Module({
  controllers: [GoldRatesController],
  providers: [GoldRatesService, GoldPriceApiService],
  exports: [GoldRatesService, GoldPriceApiService],
})
export class GoldRatesModule {}
