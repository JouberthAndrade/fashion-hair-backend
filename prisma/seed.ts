import { PrismaClient, UserRole, Specialty, DayOfWeek } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
    { name: 'Corte Feminino', durationMin: 60, price: 80.0, description: 'Corte e finalização' },
    { name: 'Corte Masculino', durationMin: 30, price: 45.0, description: 'Corte e acabamento' },
    { name: 'Coloração', durationMin: 120, price: 150.0, description: 'Coloração completa' },
    { name: 'Escova', durationMin: 45, price: 60.0, description: 'Escova e modelagem' },
    { name: 'Hidratação', durationMin: 60, price: 90.0, description: 'Hidratação profunda' },
    { name: 'Manicure', durationMin: 45, price: 35.0, description: 'Unhas das mãos' },
    { name: 'Pedicure', durationMin: 60, price: 45.0, description: 'Unhas dos pés' },
    { name: 'Maquiagem Festa', durationMin: 90, price: 120.0, description: 'Maquiagem para eventos' },
    { name: 'Design de Sobrancelha', durationMin: 30, price: 40.0, description: 'Design e henna' },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.name }, // won't match UUID — just force create
      update: {},
      create: service,
    }).catch(async () => {
      // Check if already exists by name
      const exists = await prisma.service.findFirst({ where: { name: service.name } });
      if (!exists) {
        await prisma.service.create({ data: service });
        console.log('✅ Serviço criado:', service.name);
      }
    });
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
