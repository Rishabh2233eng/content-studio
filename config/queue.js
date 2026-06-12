const Bull = require('bull');

let contentQueue;

if (process.env.REDIS_URL) {
  contentQueue = new Bull('content-generation', process.env.REDIS_URL);
} else {
  contentQueue = new Bull('content-generation', {
    redis: {
      host: '127.0.0.1',
      port: 6379
    }
  });
}

module.exports = contentQueue;