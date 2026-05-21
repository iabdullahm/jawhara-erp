import { Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export class QueryMovementsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(StockMovementType)
  movementType?: StockMovementType;
  @ApiPropertyOptional() @IsOptional() @IsDateString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() toDate?: string;
}

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: QueryMovementsDto) {
    const where: Prisma.StockMovementWhereInput = {
      ...(query.productId && { productId: query.productId }),
      ...(query.branchId && { branchId: query.branchId }),
      ...(query.movementType && { movementType: query.movementType }),
      ...(query.fromDate || query.toDate
        ? {
            movementDate: {
              ...(query.fromDate && { gte: new Date(query.fromDate) }),
              ...(query.toDate && { lte: new Date(query.toDate) }),
            },
          }
        : {}),
    };
    return this.prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true, nameAr: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
      orderBy: { movementDate: 'desc' },
      take: 200,
    });
  }
}
