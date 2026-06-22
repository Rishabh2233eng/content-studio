const Bull = require('bull');
const Redis = require('ioredis');

let contentQueue;

if (process.env.REDIS_URL) {
  const client = new Redis(process.env.REDIS_URL, {
    tls: { rejectUnauthorized: false },
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });

  const subscriber = new Redis(process.env.REDIS_URL, {
    tls: { rejectUnauthorized: false },
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });

  const bclient = new Redis(process.env.REDIS_URL, {
    tls: { rejectUnauthorized: false },
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });

  client.on('connect', () => console.log('Redis client connected'));
  client.on('error', (err) => console.error('Redis client error:', err.message));

  contentQueue = new Bull('content-generation', {
    createClient: (type) => {
      switch (type) {
        case 'client': return client;
        case 'subscriber': return subscriber;
        case 'bclient': return bclient;
        default: return client;
      }
    }
  });

} else {
  contentQueue = new Bull('content-generation', {
    redis: {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null
    }
  });
}

contentQueue.on('error', (err) => {
  console.error('Queue error:', err.message);
});

contentQueue.on('ready', () => {
  console.log('Queue ready');
});

module.exports = contentQueue;