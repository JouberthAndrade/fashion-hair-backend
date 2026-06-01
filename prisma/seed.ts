import 'dotenv/config';
import { PrismaClient, UserRole, Specialty, DayOfWeek } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

// Prisma 7 requires a driver adapter for runtime connections.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin user ────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fashionhair.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@fashionhair.com',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin criado:', admin.email);

  // ── Collaborators ─────────────────────────────────────────────────
  const collabPassword = await bcrypt.hash('senha@123', 12);

  const collaborators = [
    { name: 'Ana Cabelereira', email: 'ana@fashionhair.com', specialty: Specialty.HAIRDRESSER },
    { name: 'Bia Manicure', email: 'bia@fashionhair.com', specialty: Specialty.MANICURE },
    { name: 'Carol Maquiadora', email: 'carol@fashionhair.com', specialty: Specialty.MAKEUP_ARTIST },
  ];

  for (const collab of collaborators) {
    const user = await prisma.user.upsert({
      where: { email: collab.email },
      update: {},
      create: {
        name: collab.name,
        email: collab.email,
        password: collabPassword,
        role: UserRole.COLLABORATOR,
      },
    });

    const profile = await prisma.collaboratorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specialty: collab.specialty,
        bio: `Especialista em ${collab.specialty.toLowerCase()}`,
      },
    });

    // Working hours: Mon-Sat, 08:00-18:00
    const workDays = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    for (const day of workDays) {
      await prisma.workingHours.upsert({
        where: { collaboratorId_dayOfWeek: { collaboratorId: profile.id, dayOfWeek: day } },
        update: {},
        create: {
          collaboratorId: profile.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '18:00',
        },
      });
    }

    console.log('✅ Colaborador criado:', user.name);
  }

  // ── Services ──────────────────────────────────────────────────────
  const services = [
    { name: 'Corte Feminino', durationMin: 60, price: 80.0, description: 'Corte e finalização', specialty: Specialty.HAIRDRESSER },
    { name: 'Corte Masculino', durationMin: 30, price: 45.0, description: 'Corte e acabamento', specialty: Specialty.HAIRDRESSER },
    { name: 'Coloração', durationMin: 120, price: 150.0, description: 'Coloração completa', specialty: Specialty.HAIRDRESSER },
    { name: 'Escova', durationMin: 45, price: 60.0, description: 'Escova e modelagem', specialty: Specialty.HAIRDRESSER },
    { name: 'Hidratação', durationMin: 60, price: 90.0, description: 'Hidratação profunda', specialty: Specialty.HAIRDRESSER },
    { name: 'Manicure', durationMin: 45, price: 35.0, description: 'Unhas das mãos', specialty: Specialty.MANICURE },
    { name: 'Pedicure', durationMin: 60, price: 45.0, description: 'Unhas dos pés', specialty: Specialty.PEDICURE },
    { name: 'Maquiagem Festa', durationMin: 90, price: 120.0, description: 'Maquiagem para eventos', specialty: Specialty.MAKEUP_ARTIST },
    { name: 'Design de Sobrancelha', durationMin: 30, price: 40.0, description: 'Design e henna', specialty: Specialty.EYEBROW },
  ];

  // Service.name has no unique constraint, so we cannot use upsert here.
  // Idempotency is achieved by findFirst-then-create.
  for (const service of services) {
    const exists = await prisma.service.findFirst({ where: { name: service.name } });
    if (exists) continue;
    await prisma.service.create({ data: service });
    console.log('✅ Serviço criado:', service.name);
  }

  // ── Salon settings ────────────────────────────────────────────────
  await prisma.salonSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      defaultSalonFeeRatePercent: 40,
      updatedById: admin.id,
    },
  });
  console.log('✅ Configurações do salão criadas (taxa padrão 40%)');

  // ── Sample clients & completed appointments (for cash closing demo) ──
  const ana = await prisma.user.findUnique({ where: { email: 'ana@fashionhair.com' } });
  const corteFem = await prisma.service.findFirst({ where: { name: 'Corte Feminino' } });
  const manicure = await prisma.service.findFirst({ where: { name: 'Manicure' } });

  if (ana && corteFem && manicure) {
    let client = await prisma.client.findFirst({
      where: { phone: '11999990001', deletedAt: null },
    });
    if (!client) {
      client = await prisma.client.create({
        data: { name: 'Maria Silva', phone: '11999990001' },
      });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const existingDone = await prisma.appointment.count({
      where: { status: 'DONE', deletedAt: null },
    });

    if (existingDone === 0) {
      await prisma.appointment.createMany({
        data: [
          {
            collaboratorId: ana.id,
            clientId: client.id,
            serviceId: corteFem.id,
            scheduledDate: today,
            startTime: '09:00',
            endTime: '10:00',
            status: 'DONE',
            priceAtBooking: corteFem.price,
            salonFeeRateAtBooking: 40,
            completedAt: new Date(),
          },
          {
            collaboratorId: ana.id,
            clientId: client.id,
            serviceId: manicure.id,
            scheduledDate: today,
            startTime: '10:30',
            endTime: '11:15',
            status: 'DONE',
            priceAtBooking: manicure.price,
            salonFeeRateAtBooking: 40,
            completedAt: new Date(),
          },
        ],
      });
      console.log(`✅ Atendimentos concluídos de exemplo criados (${todayStr})`);
    }
  }

  console.log('\n✨ Seed concluído!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('  Admin  → admin@fashionhair.com  / admin@123');
  console.log('  Collab → ana@fashionhair.com    / senha@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
