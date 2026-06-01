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

export interface ResolvedAppointmentPrice {
  /** Preço efetivamente cobrado. */
  price: number;
  /** Preço padrão do serviço (referência de auditoria). */
  standardPrice: number;
  /** Origem do preço resolvido. */
  source: 'explicit' | 'book' | 'standard';
  /** True quando o preço cobrado difere do padrão do serviço. */
  isCustomPrice: boolean;
}

/**
 * Resolve o preço cobrado de um agendamento, na ordem:
 * 1) preço explícito enviado na requisição;
 * 2) price book do cliente para o serviço;
 * 3) preço padrão do serviço.
 * A taxa do salão NÃO é resolvida aqui (ver resolveSalonFeeRate) e nunca é
 * definida pelo colaborador.
 */
export async function resolveAppointmentPrice(
  prisma: PrismaClient,
  clientId: string,
  service: Pick<Service, 'id' | 'price'>,
  explicitPrice?: number | null,
): Promise<ResolvedAppointmentPrice> {
  const standardPrice = decimalToNumber(service.price);

  let price = standardPrice;
  let source: ResolvedAppointmentPrice['source'] = 'standard';

  if (explicitPrice != null) {
    price = explicitPrice;
    source = 'explicit';
  } else {
    const book = await prisma.clientServicePrice.findUnique({
      where: { clientId_serviceId: { clientId, serviceId: service.id } },
    });
    if (book) {
      price = decimalToNumber(book.price);
      source = 'book';
    }
  }

  return { price, standardPrice, source, isCustomPrice: price !== standardPrice };
}
