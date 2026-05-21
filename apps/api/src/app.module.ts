import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { GoldRatesModule } from './gold-rates/gold-rates.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { BranchesModule } from './branches/branches.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    HealthModule,
    BranchesModule,
    CategoriesModule,
    GoldRatesModule,
    ProductsModule,
    StockMovementsModule,
  ],
})
export class AppModule {}
