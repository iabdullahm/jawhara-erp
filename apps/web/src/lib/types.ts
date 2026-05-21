// Shared types matching the backend Prisma schema

export type MetalType = 'GOLD' | 'SILVER' | 'PLATINUM' | 'PALLADIUM' | 'OTHER';

export type Karat =
  | 'K24'
  | 'K22'
  | 'K21'
  | 'K18'
  | 'K14'
  | 'K10'
  | 'K925'
  | 'K950'
  | 'OTHER';

export type ProductStatus =
  | 'IN_STOCK'
  | 'SOLD'
  | 'RESERVED'
  | 'IN_REPAIR'
  | 'IN_MANUFACTURING'
  | 'CONSIGNMENT_OUT'
  | 'LOST'
  | 'WRITTEN_OFF';

export type OwnershipType = 'OWNED' | 'CONSIGNMENT' | 'OLD_GOLD';

export type WeightUnit = 'GRAM' | 'CARAT' | 'PIECE' | 'OUNCE';

export interface Branch {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
}

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
  _count?: { products: number };
}

export interface ProductStone {
  id: string;
  stoneType: string;
  stoneTypeAr?: string;
  count: number;
  caratWeight: string | number;
  clarity?: string;
  color?: string;
  cut?: string;
  shape?: string;
  certificateNo?: string;
  pricePerCarat?: string | number;
  totalValue?: string | number;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  rfidTag?: string;
  name: string;
  nameAr?: string;
  description?: string;
  categoryId: string;
  category?: Category;
  branchId: string;
  branch?: Branch;
  metalType: MetalType;
  karat: Karat;
  grossWeight: string | number;
  netWeight: string | number;
  stoneWeight: string | number;
  sellingUnit: WeightUnit;
  makingCharge: string | number;
  makingChargePerGram: string | number;
  fixedSalePrice?: string | number | null;
  costPrice?: string | number | null;
  hallmark?: string;
  status: ProductStatus;
  ownershipType: OwnershipType;
  primaryImageUrl?: string;
  imageUrls: string[];
  designCode?: string;
  size?: string;
  stones?: ProductStone[];
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface GoldRate {
  id: string;
  branchId?: string | null;
  metalType: MetalType;
  karat: Karat;
  ratePerGram: string | number;
  currency: string;
  effectiveDate: string;
}

export interface PriceBreakdown {
  productId: string;
  method: 'fixed' | 'computed';
  goldRate?: {
    karat: Karat;
    ratePerGram: number;
    currency: string;
    effectiveDate: string;
  };
  breakdown: {
    netWeight?: number;
    goldValue?: number;
    stonesValue?: number;
    makingCharge?: number;
    subtotal?: number;
    fixedPrice?: number;
  };
  finalPrice: number;
}
