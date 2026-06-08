const Bull = require('bull');

const contentQueue = new Bull('content-generation', {
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
});

module.exports = contentQueue;