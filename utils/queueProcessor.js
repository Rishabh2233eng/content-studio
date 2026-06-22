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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

contentQueue.process(1, async (job) => {
  const { contentId, topic, tone, userId } = job.data;

  try {
    console.log('Starting job for topic: ' + topic);
    await job.progress(5);

    console.log('Step 1: Blog post...');
    const blogPost = await generateBlogPost(topic, tone);
    await job.progress(20);
    await sleep(1500);

    console.log('Step 2: LinkedIn post...');
    const linkedInPost = await generateLinkedInPost(topic, tone);
    await job.progress(40);
    await sleep(1500);

    console.log('Step 3: Twitter thread...');
    const twitterThread = await generateTwitterThread(topic, tone);
    await job.progress(60);
    await sleep(1500);

    console.log('Step 4: YouTube script...');
    const youtubeScript = await generateYouTubeScript(topic, tone);
    await job.progress(80);
    await sleep(1500);

    console.log('Step 5: Email newsletter...');
    const emailNewsletter = await generateEmailNewsletter(topic, tone);
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
    console.log('Job completed successfully for: ' + topic);
    return { success: true, contentId };

  } catch (error) {
    console.error('Job error:', error.message);
    await Content.findByIdAndUpdate(contentId, { status: 'failed' });
    throw error;
  }
});

contentQueue.on('completed', (job) => console.log('Job ' + job.id + ' done'));
contentQueue.on('failed', (job, err) => console.error('Job ' + job.id + ' failed:', err.message));

module.exports = contentQueue;