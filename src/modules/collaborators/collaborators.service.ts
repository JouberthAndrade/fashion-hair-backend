import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/index.js';
import { UpsertProfileBody, UpsertWorkingHoursBody } from './collaborators.schema.js';

export async function listCollaboratorsService(prisma: PrismaClient) {
  return prisma.user.findMany({
    where: {
      role: 'COLLABORATOR',
      isActive: true,
      deletedAt: null,
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      collaboratorProfile: {
        select: {
          id: true,
          specialty: true,
          bio: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export async function getCollaboratorService(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      collaboratorProfile: {
        select: {
          id: true,
          specialty: true,
          bio: true,
          avatarUrl: true,
          workingHours: {
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      },
    },
  });
  if (!user) throw new NotFoundError('Colaborador não encontrado');
  return user;
}

export async function upsertProfileService(
  prisma: PrismaClient,
  userId: string,
  data: UpsertProfileBody,
) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new NotFoundError('Usuário não encontrado');

  return prisma.collaboratorProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
    select: {
      id: true,
      userId: true,
      specialty: true,
      bio: true,
      avatarUrl: true,
    },
  });
}

export async function upsertWorkingHoursService(
  prisma: PrismaClient,
  userId: string,
  data: UpsertWorkingHoursBody,
) {
  const profile = await prisma.collaboratorProfile.findUnique({
    where: { userId },
  });
  if (!profile) throw new NotFoundError('Perfil de colaborador não encontrado. Crie o perfil primeiro.');

  // Replace all working hours for this collaborator
  await prisma.$transaction(async (tx) => {
    await tx.workingHours.deleteMany({ where: { collaboratorId: profile.id } });

    await tx.workingHours.createMany({
      data: data.workingHours.map((wh) => ({
        collaboratorId: profile.id,
        dayOfWeek: wh.dayOfWeek,
        startTime: wh.startTime,
        endTime: wh.endTime,
        isActive: wh.isActive,
      })),
    });
  });

  return prisma.workingHours.findMany({
    where: { collaboratorId: profile.id },
    orderBy: { dayOfWeek: 'asc' },
  });
}

export async function getWorkingHoursService(prisma: PrismaClient, userId: string) {
  const profile = await prisma.collaboratorProfile.findUnique({ where: { userId } });
  if (!profile) return [];

  return prisma.workingHours.findMany({
    where: { collaboratorId: profile.id },
    orderBy: { dayOfWeek: 'asc' },
  });
}
