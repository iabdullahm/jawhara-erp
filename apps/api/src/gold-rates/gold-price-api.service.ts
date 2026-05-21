import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Karat, MetalType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * استجابة goldapi.io لـ XAU
 * https://www.goldapi.io/
 */
interface GoldApiResponse {
  metal: string;
  currency: string;
  exchange: string;
  symbol: string;
  prev_close_price: number;
  open_price: number;
  low_price: number;
  high_price: number;
  open_time: number;
  price: number; // السعر الفوري للأونصة
  ch: number;
  chp: number;
  ask: number;
  bid: number;
  price_gram_24k: number;
  price_gram_22k: number;
  price_gram_21k: number;
  price_gram_20k: number;
  price_gram_18k: number;
  price_gram_16k: number;
  price_gram_14k: number;
  price_gram_10k: number;
}

@Injectable()
export class GoldPriceApiService {
  private readonly logger = new Logger(GoldPriceApiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * جلب أسعار الذهب الحالية من goldapi.io
   * يحتاج GOLD_API_KEY في متغيرات البيئة
   */
  async fetchFromGoldApi(currency = 'USD'): Promise<GoldApiResponse> {
    const apiKey = this.config.get<string>('GOLD_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'GOLD_API_KEY غير مضبوط. سجّل حساباً مجانياً في goldapi.io واحصل على مفتاح.',
      );
    }

    const url = `https://www.goldapi.io/api/XAU/${currency}`;
    this.logger.log(`Fetching gold prices from ${url}`);

    const res = await fetch(url, {
      headers: {
        'x-access-token': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(
        `فشل جلب أسعار الذهب: ${res.status} ${res.statusText} - ${text}`,
      );
    }

    return res.json() as Promise<GoldApiResponse>;
  }

  /**
   * مزامنة أسعار الذهب من API وحفظها في قاعدة البيانات.
   * يحفظ سعر لكل عيار رئيسي (24K, 22K, 21K, 18K, 14K).
   *
   * @param baseCurrency العملة المصدر (USD افتراضياً)
   * @param targetCurrency العملة الهدف (OMR/SAR/AED) — نستخدم سعر صرف ثابت
   * @param fxRate سعر الصرف من baseCurrency إلى targetCurrency
   */
  async syncRates(options: {
    baseCurrency?: string;
    targetCurrency?: string;
    fxRate?: number;
    branchId?: string;
  } = {}) {
    const baseCurrency = options.baseCurrency ?? 'USD';
    const targetCurrency = options.targetCurrency ?? this.config.get<string>('DEFAULT_CURRENCY', 'OMR');
    const fxRate = options.fxRate ?? this.getDefaultFxRate(baseCurrency, targetCurrency);

    const data = await this.fetchFromGoldApi(baseCurrency);

    this.logger.log(
      `Got prices in ${baseCurrency}: 24K=${data.price_gram_24k}, 22K=${data.price_gram_22k}`,
    );

    // العيارات التي نحفظها (نضيف اقتصاد للـ free tier من goldapi.io)
    const karatMap: { karat: Karat; pricePerGram: number }[] = [
      { karat: Karat.K24, pricePerGram: data.price_gram_24k },
      { karat: Karat.K22, pricePerGram: data.price_gram_22k },
      { karat: Karat.K21, pricePerGram: data.price_gram_21k },
      { karat: Karat.K18, pricePerGram: data.price_gram_18k },
      { karat: Karat.K14, pricePerGram: data.price_gram_14k },
    ];

    const saved = await Promise.all(
      karatMap.map(({ karat, pricePerGram }) =>
        this.prisma.goldRate.create({
          data: {
            branchId: options.branchId ?? null,
            metalType: MetalType.GOLD,
            karat,
            ratePerGram: new Prisma.Decimal((pricePerGram * fxRate).toFixed(4)),
            currency: targetCurrency,
            source: 'api:goldapi.io',
            notes: `Auto-synced from goldapi.io | ${baseCurrency}→${targetCurrency} @ ${fxRate}`,
          },
        }),
      ),
    );

    this.logger.log(`✅ Saved ${saved.length} gold rates from API`);

    return {
      success: true,
      source: 'goldapi.io',
      baseCurrency,
      targetCurrency,
      fxRate,
      fetchedAt: new Date().toISOString(),
      rates: saved.map((r) => ({
        karat: r.karat,
        ratePerGram: r.ratePerGram.toNumber(),
        currency: r.currency,
      })),
      raw: {
        spot_usd_per_oz: data.price,
        change_pct: data.chp,
        high: data.high_price,
        low: data.low_price,
      },
    };
  }

  /**
   * أسعار صرف افتراضية مبسطة. لاحقاً يمكن ربط API صرف حقيقي.
   * العملات الخليجية مرتبطة بالدولار، لذلك تقريب جيد كافٍ للـ MVP.
   */
  private getDefaultFxRate(from: string, to: string): number {
    if (from === to) return 1;

    // أسعار صرف الدولار (تقريباً ثابتة لأن العملات الخليجية مربوطة)
    const usdRates: Record<string, number> = {
      OMR: 0.385,
      SAR: 3.75,
      AED: 3.673,
      QAR: 3.64,
      KWD: 0.305,
      BHD: 0.376,
      EGP: 49.0,
      USD: 1,
      EUR: 0.92,
    };

    if (from === 'USD' && to in usdRates) return usdRates[to];
    if (to === 'USD' && from in usdRates) return 1 / usdRates[from];

    // عبور عبر USD
    if (from in usdRates && to in usdRates) {
      return usdRates[to] / usdRates[from];
    }

    throw new BadRequestException(
      `سعر صرف غير معروف: ${from}→${to}. مرّر fxRate يدوياً.`,
    );
  }
}
