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

contentQueue.process(async (job) => {
  const { contentId, topic, tone, userId } = job.data;

  try {
    await job.progress(10);
    console.log(`Processing job for topic: "${topic}"`);

    await job.progress(20);
    const [blogPost, linkedInPost, twitterThread, youtubeScript, emailNewsletter] =
      await Promise.all([
        generateBlogPost(topic, tone),
        generateLinkedInPost(topic, tone),
        generateTwitterThread(topic, tone),
        generateYouTubeScript(topic, tone),
        generateEmailNewsletter(topic, tone)
      ]);

    await job.progress(90);

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

    await User.findByIdAndUpdate(userId, {
      $inc: { credits: -1 }
    });

    await job.progress(100);
    console.log(`Job completed for topic: "${topic}"`);

    return { success: true, contentId };

  } catch (error) {
    await Content.findByIdAndUpdate(contentId, { status: 'failed' });
    throw error;
  }
});

contentQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

contentQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

module.exports = contentQueue;