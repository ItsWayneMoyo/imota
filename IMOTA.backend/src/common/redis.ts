import Redis from 'ioredis';

let _c: Redis | null = null;

export function redis() {
  if (_c) return _c;
  _c = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  });
  return _c;
}
