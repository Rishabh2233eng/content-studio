const Content = require('../models/Content');
const User = require('../models/User');
const contentQueue = require('../config/queue');

const generateContent = async (req, res) => {
  try {
    const { topic, tone = 'professional' } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, message: 'Topic is required' });
    }

    const user = await User.findById(req.user.id);
    if (user.credits <= 0) {
      return res.status(400).json({ success: false, message: 'No credits remaining. Please upgrade your plan.' });
    }

    const content = await Content.create({
      user: req.user.id,
      topic,
      tone,
      status: 'generating'
    });

    const job = await contentQueue.add({
      contentId: content._id.toString(),
      topic,
      tone,
      userId: req.user.id.toString()
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false
    });

    console.log('Job ' + job.id + ' added to queue for topic: ' + topic);

    res.status(200).json({
      success: true,
      message: 'Content generation started',
      jobId: job.id.toString(),
      contentId: content._id.toString()
    });

  } catch (error) {
    console.error('Queue error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to start generation', error: error.message });
  }
};

const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { contentId } = req.query;

    const job = await contentQueue.getJob(jobId);

    if (!job) {
      const content = await Content.findById(contentId);
      if (content && content.status === 'completed') {
        const user = await User.findById(req.user.id);
        return res.status(200).json({
          success: true,
          status: 'completed',
          progress: 100,
          content,
          creditsRemaining: user.credits
        });
      }
      return res.status(200).json({ success: true, status: 'processing', progress: 50 });
    }

    const state = await job.getState();
    const progress = job.progress();

    if (state === 'completed') {
      const content = await Content.findById(contentId);
      const user = await User.findById(req.user.id);
      return res.status(200).json({
        success: true, status: 'completed', progress: 100, content, creditsRemaining: user.credits
      });
    }

    if (state === 'failed') {
      return res.status(200).json({ success: true, status: 'failed', progress: 0, error: job.failedReason });
    }

    res.status(200).json({ success: true, status: state, progress: progress || 0 });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get job status', error: error.message });
  }
};

const getMyContent = async (req, res) => {
  try {
    const contents = await Content.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select('topic tone status creditsUsed createdAt');
    res.status(200).json({ success: true, count: contents.length, contents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getContentById = async (req, res) => {
  try {
    const content = await Content.findOne({ _id: req.params.id, user: req.user.id });
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }
    res.status(200).json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const deleteContent = async (req, res) => {
  try {
    const content = await Content.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }
    res.status(200).json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { generateContent, getJobStatus, getMyContent, getContentById, deleteContent };