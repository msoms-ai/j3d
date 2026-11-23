import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client!: Redis;
  private redlock!: Redlock;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });

    this.redlock = new Redlock([this.client], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });

    this.logger.log(`Connected to Redis at ${redisUrl}`);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Acquire a distributed lock using Redlock (e.g. j3d:lock:print:{orderId})
   */
  async acquireLock(resource: string, ttlMs = 5000): Promise<Lock> {
    return this.redlock.acquire([resource], ttlMs);
  }

  /**
   * Store a 6-digit OTP in Redis with max attempts and TTL
   */
  async storeOtp(email: string, purpose: string, otpCode: string, ttlSeconds = 600): Promise<void> {
    const key = `j3d:otp:${purpose}:${email.toLowerCase()}`;
    const payload = JSON.stringify({
      otpCode,
      attempts: 0,
      maxAttempts: 5,
      createdAt: Date.now(),
    });
    await this.client.set(key, payload, 'EX', ttlSeconds);
  }

  /**
   * Verify and consume a 6-digit OTP
   */
  async verifyOtp(email: string, purpose: string, inputCode: string): Promise<boolean> {
    const key = `j3d:otp:${purpose}:${email.toLowerCase()}`;
    const data = await this.client.get(key);
    if (!data) return false;

    const parsed = JSON.parse(data);
    if (parsed.attempts >= parsed.maxAttempts) {
      await this.client.del(key);
      return false;
    }

    if (parsed.otpCode === inputCode.trim()) {
      await this.client.del(key);
      return true;
    } else {
      parsed.attempts += 1;
      const ttl = await this.client.ttl(key);
      if (ttl > 0) {
        await this.client.set(key, JSON.stringify(parsed), 'EX', ttl);
      }
      return false;
    }
  }

  /**
   * Sliding window rate limiter
   */
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const multi = this.client.multi();
    multi.zremrangebyscore(key, '-inf', windowStart);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, windowSeconds);
    const results = await multi.exec();
    if (!results) return false;
    const count = results[2][1] as number;
    return count <= limit;
  }
}
