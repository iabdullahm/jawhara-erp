import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
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
    AuthModule,       // ← JWT, guards applied globally
    HealthModule,
    TenantsModule,
    UsersModule,
    BranchesModule,
    CategoriesModule,
    GoldRatesModule,
    ProductsModule,
    StockMovementsModule,
  ],
})
export class AppModule {}
