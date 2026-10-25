import { getQurbanImageUrlByVariant } from '@/services/qurban';
import type { QurbanCardProps } from '@/components/organisms/QurbanCard/QurbanCard';

/** Biaya admin per ekor: per jenis hewan; paket patungan dibagi jumlah slot (dibulatkan ke atas). Satu rumus untuk sidebar dan kartu. */
export function calcQurbanAdminFee(
  animalType: string,
  packageType: string,
  maxSlots: number | null | undefined,
  feeCow: number,
  feeGoat: number
): number {
  const baseFee = Number(animalType === 'cow' ? feeCow : feeGoat) || 0;
  if (packageType === 'shared' && maxSlots) return Math.ceil(baseFee / maxSlots);
  return baseFee;
}

/** Paket individu: sisa stok; patungan: sisa slot. */
export function isQurbanAvailable(pkg: { packageType: string; stock: number; stockSold: number; availableSlots: number }): boolean {
  return pkg.packageType === 'individual' ? pkg.stock > pkg.stockSold : pkg.availableSlots > 0;
}

export interface QurbanCardContext {
  organizationName: string;
  popularLabel: string;
  adminFeeCow: number;
  adminFeeGoat: number;
  periodId: string;
  periodName: string;
}

/** SATU-SATUNYA pemeta paket API → props `QurbanCard` (beranda, /qurban, rekomendasi di detail). */
export function mapQurbanPackageToCardProps(pkg: any, ctx: QurbanCardContext): QurbanCardProps {
  const ownerName = pkg.ownerType === 'mitra' && pkg.ownerName ? pkg.ownerName : ctx.organizationName;
  const adminFee = calcQurbanAdminFee(pkg.animalType, pkg.packageType, pkg.maxSlots, ctx.adminFeeCow, ctx.adminFeeGoat);

  return {
    id: pkg.packagePeriodId,
    slug: pkg.packagePeriodId,
    name: pkg.name,
    category: pkg.animalType === 'cow' ? 'sapi' : pkg.animalType === 'sheep' ? 'domba' : 'kambing',
    packageType: pkg.packageType === 'shared' ? 'shared' : 'individual',
    price: pkg.price,
    image: getQurbanImageUrlByVariant(pkg.imageUrl, ['medium', 'large', 'thumbnail']),
    badge: pkg.isFeatured ? ctx.popularLabel : undefined,
    ownerName,
    activeDiscount: pkg.activeDiscount || null,
    available: isQurbanAvailable(pkg),
    cart: {
      packagePeriodId: pkg.packagePeriodId,
      packageId: pkg.id,
      periodId: ctx.periodId,
      periodName: ctx.periodName,
      animalType: pkg.animalType,
      packageType: pkg.packageType,
      price: pkg.price,
      adminFee,
      discountAmount: pkg.activeDiscount?.discountAmount || 0,
    },
  };
}
