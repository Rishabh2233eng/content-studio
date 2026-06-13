const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true
  },
  tone: {
    type: String,
    enum: ['professional', 'casual', 'humorous', 'inspiring'],
    default: 'professional'
  },
  generatedContent: {
    blogPost: { type: String, default: '' },
    linkedInPost: { type: String, default: '' },
    twitterThread: { type: String, default: '' },
    youtubeScript: { type: String, default: '' },
    emailNewsletter: { type: String, default: '' }
  },
  creditsUsed: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Content', contentSchema);