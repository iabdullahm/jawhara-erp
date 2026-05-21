import { Module } from '@nestjs/common';
import { GoldRatesController } from './gold-rates.controller';
import { GoldRatesService } from './gold-rates.service';

@Module({
  controllers: [GoldRatesController],
  providers: [GoldRatesService],
  exports: [GoldRatesService],
})
export class GoldRatesModule {}
