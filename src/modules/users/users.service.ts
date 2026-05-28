import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../../shared/utils/password.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors/index.js';
import {
  CreateUserBody,
  UpdateUserBody,
  ChangePasswordBody,
} from './users.schema.js';
import { getPaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';

export async function createUserService(prisma: PrismaClient, data: CreateUserBody) {
  const exists = await prisma.user.findFirst({
    where: { email: data.email, deletedAt: null },
  });

  if (exists) throw new ConflictError('E-mail já cadastrado');

  const hashed = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
}

export async function listUsersService(
  prisma: PrismaClient,
  query: { page?: number; limit?: number; role?: string; search?: string },
) {
  const { page, limit, skip } = getPaginationParams(query);

  const where = {
    deletedAt: null,
    ...(query.role ? { role: query.role as any } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        collaboratorProfile: {
          select: { specialty: true, avatarUrl: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: buildPaginationMeta(total, page, limit) };
}

export async function getUserByIdService(prisma: PrismaClient, id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      collaboratorProfile: {
        select: {
          specialty: true,
          bio: true,
          avatarUrl: true,
          workingHours: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError('Usuário não encontrado');
  return user;
}

export async function updateUserService(
  prisma: PrismaClient,
  id: string,
  data: UpdateUserBody,
) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw new NotFoundError('Usuário não encontrado');

  if (data.email && data.email !== user.email) {
    const emailExists = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null, NOT: { id } },
    });
    if (emailExists) throw new ConflictError('E-mail já cadastrado');
  }

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

export async function changePasswordService(
  prisma: PrismaClient,
  userId: string,
  data: ChangePasswordBody,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Usuário não encontrado');

  const valid = await comparePassword(data.currentPassword, user.password);
  if (!valid) throw new UnauthorizedError('Senha atual incorreta');

  const hashed = await hashPassword(data.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return { message: 'Senha alterada com sucesso' };
}

export async function deleteUserService(prisma: PrismaClient, id: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw new NotFoundError('Usuário não encontrado');

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}
