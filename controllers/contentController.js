const Content = require('../models/Content');
const User = require('../models/User');
const {
  generateBlogPost,
  generateLinkedInPost,
  generateTwitterThread,
  generateYouTubeScript,
  generateEmailNewsletter
} = require('../utils/aiService');

// @route  POST /api/content/generate
// @desc   Generate AI content for all formats
// @access Protected
const generateContent = async (req, res) => {
  try {
    const { topic, tone = 'professional' } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    // Check user credits
    const user = await User.findById(req.user.id);
    if (user.credits <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No credits remaining. Please upgrade your plan.'
      });
    }

    // Create content document with 'generating' status
    const content = await Content.create({
      user: req.user.id,
      topic,
      tone,
      status: 'generating'
    });

    // Generate all 5 formats simultaneously (parallel)
    console.log(`Generating content for topic: "${topic}"...`);

    const [blogPost, linkedInPost, twitterThread, youtubeScript, emailNewsletter] =
      await Promise.all([
        generateBlogPost(topic, tone),
        generateLinkedInPost(topic, tone),
        generateTwitterThread(topic, tone),
        generateYouTubeScript(topic, tone),
        generateEmailNewsletter(topic, tone)
      ]);

    // Update content with generated results
    content.generatedContent = {
      blogPost,
      linkedInPost,
      twitterThread,
      youtubeScript,
      emailNewsletter
    };
    content.status = 'completed';
    await content.save();

    // Deduct 1 credit from user
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { credits: -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Content generated successfully',
      creditsRemaining: user.credits - 1,
      content
    });

  } catch (error) {
    console.error('Generation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Content generation failed',
      error: error.message
    });
  }
};

// @route  GET /api/content
// @desc   Get all content for logged in user
// @access Protected
const getMyContent = async (req, res) => {
  try {
    const contents = await Content.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select('topic tone status creditsUsed createdAt');

    res.status(200).json({
      success: true,
      count: contents.length,
      contents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @route  GET /api/content/:id
// @desc   Get single content by id
// @access Protected
const getContentById = async (req, res) => {
  try {
    const content = await Content.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.status(200).json({
      success: true,
      content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @route  DELETE /api/content/:id
// @desc   Delete content
// @access Protected
const deleteContent = async (req, res) => {
  try {
    const content = await Content.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  generateContent,
  getMyContent,
  getContentById,
  deleteContent
};