import { PrismaClient, Service } from '@prisma/client';

const SETTINGS_ID = 'default';
const DEFAULT_FEE_PERCENT = 40;

export function decimalToNumber(value: { toString(): string } | null | undefined): number {
  if (value == null) return 0;
  return Number(value.toString());
}

export async function getDefaultSalonFeeRate(prisma: PrismaClient): Promise<number> {
  const settings = await prisma.salonSetting.findUnique({ where: { id: SETTINGS_ID } });
  return settings ? decimalToNumber(settings.defaultSalonFeeRatePercent) : DEFAULT_FEE_PERCENT;
}

export async function ensureSalonSettings(prisma: PrismaClient) {
  return prisma.salonSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, defaultSalonFeeRatePercent: DEFAULT_FEE_PERCENT },
    update: {},
  });
}

/** Resolves effective salon fee % for a service (override or global default). */
export async function resolveSalonFeeRate(
  prisma: PrismaClient,
  service: Pick<Service, 'salonFeeRatePercent'>,
): Promise<number> {
  if (service.salonFeeRatePercent != null) {
    return decimalToNumber(service.salonFeeRatePercent);
  }
  return getDefaultSalonFeeRate(prisma);
}

export function splitRevenue(gross: number, salonFeeRatePercent: number) {
  const salonShare = Math.round(gross * (salonFeeRatePercent / 100) * 100) / 100;
  const collaboratorShare = Math.round((gross - salonShare) * 100) / 100;
  return { salonShare, collaboratorShare };
}
