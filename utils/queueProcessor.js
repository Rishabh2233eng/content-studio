const contentQueue = require('../config/queue');
const Content = require('../models/Content');
const User = require('../models/User');
const {
  generateBlogPost,
  generateLinkedInPost,
  generateTwitterThread,
  generateYouTubeScript,
  generateEmailNewsletter
} = require('./aiService');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateWithRetry = async (fn, topic, tone, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn(topic, tone);
      return result;
    } catch (err) {
      const is429 = err.message && (err.message.includes('429') || err.message.includes('rate') || err.message.includes('Rate'));
      if (is429 && i < retries - 1) {
        const waitTime = (i + 1) * 15000;
        console.log('Rate limited — waiting ' + (waitTime/1000) + 's before retry ' + (i+1));
        await sleep(waitTime);
      } else {
        throw err;
      }
    }
  }
};

contentQueue.process(1, async (job) => {
  const { contentId, topic, tone, userId } = job.data;
  try {
    console.log('Processing job for topic: ' + topic);
    await job.progress(5);

    console.log('Generating blog post...');
    const blogPost = await generateWithRetry(generateBlogPost, topic, tone);
    await job.progress(25);
    await sleep(3000);

    console.log('Generating LinkedIn post...');
    const linkedInPost = await generateWithRetry(generateLinkedInPost, topic, tone);
    await job.progress(40);
    await sleep(3000);

    console.log('Generating Twitter thread...');
    const twitterThread = await generateWithRetry(generateTwitterThread, topic, tone);
    await job.progress(60);
    await sleep(3000);

    console.log('Generating YouTube script...');
    const youtubeScript = await generateWithRetry(generateYouTubeScript, topic, tone);
    await job.progress(80);
    await sleep(3000);

    console.log('Generating email newsletter...');
    const emailNewsletter = await generateWithRetry(generateEmailNewsletter, topic, tone);
    await job.progress(95);

    await Content.findByIdAndUpdate(contentId, {
      generatedContent: {
        blogPost,
        linkedInPost,
        twitterThread,
        youtubeScript,
        emailNewsletter
      },
      status: 'completed'
    });

    await User.findByIdAndUpdate(userId, { $inc: { credits: -1 } });
    await job.progress(100);
    console.log('Job completed for topic: ' + topic);
    return { success: true, contentId };

  } catch (error) {
    console.error('Job failed:', error.message);
    await Content.findByIdAndUpdate(contentId, { status: 'failed' });
    throw error;
  }
});

contentQueue.on('completed', (job) => console.log('Job ' + job.id + ' completed'));
contentQueue.on('failed', (job, err) => console.error('Job ' + job.id + ' failed:', err.message));

module.exports = contentQueue;