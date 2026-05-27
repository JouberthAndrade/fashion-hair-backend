import '@fastify/jwt';
import { UserRole } from '@prisma/client';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      role: UserRole;
    };
    user: {
      sub: string;
      email: string;
      role: UserRole;
    };
  }
}
