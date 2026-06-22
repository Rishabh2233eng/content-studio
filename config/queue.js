const Bull = require('bull');

let contentQueue;

if (process.env.REDIS_URL) {
  contentQueue = new Bull('content-generation', process.env.REDIS_URL, {
    redis: {
      tls: process.env.REDIS_URL.startsWith('rediss') ? {} : undefined,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    }
  });
} else {
  contentQueue = new Bull('content-generation', {
    redis: { host: '127.0.0.1', port: 6379 }
  });
}

contentQueue.on('error', (err) => {
  console.error('Queue error:', err.message);
});

module.exports = contentQueue;