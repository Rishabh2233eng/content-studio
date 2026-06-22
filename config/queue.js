const Bull = require('bull');

let contentQueue;

if (process.env.REDIS_URL) {
  contentQueue = new Bull('content-generation', {
    redis: process.env.REDIS_URL
  });
} else {
  contentQueue = new Bull('content-generation', {
    redis: {
      host: '127.0.0.1',
      port: 6379
    }
  });
}

contentQueue.on('error', (err) => {
  console.error('Queue error:', err.message);
});

contentQueue.on('ready', () => {
  console.log('Queue ready and connected to Redis');
});

module.exports = contentQueue;