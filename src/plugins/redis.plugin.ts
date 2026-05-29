import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Redis, type Redis as RedisType } from 'ioredis';
import { env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisType;
  }
}

const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
    // Stop retrying after the first failure so a missing Redis doesn't spam
    // the log with reconnect errors. Cache callers already swallow rejects.
    retryStrategy: () => null,
  });

  // ioredis emits 'error' for every failed connect attempt. Without a listener
  // it would print to stderr and the process treats it as unhandled.
  let firstErrorLogged = false;
  redis.on('error', (err) => {
    if (!firstErrorLogged) {
      firstErrorLogged = true;
      fastify.log.warn({ err: err.message }, 'Redis unavailable — cache disabled');
    }
  });

  try {
    await redis.connect();
    fastify.log.info('Redis connected');
  } catch {
    // Already logged via 'error' listener above.
  }

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    redis.disconnect();
  });
});

export default redisPlugin;
