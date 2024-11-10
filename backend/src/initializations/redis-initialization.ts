import { Redis } from 'ioredis';
import logger from '../logger/winston.logger';

export const redisInitialization = async () => {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });
  
  try {
    await client.ping();
    logger.info('✅ Redis connection established');
    return client;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    throw error;
  }
};