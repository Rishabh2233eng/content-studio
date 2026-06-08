const express = require('express');
const router = express.Router();
const {
  generateContent,
  getJobStatus,
  getMyContent,
  getContentById,
  deleteContent
} = require('../controllers/contentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/generate', generateContent);
router.get('/status/:jobId', getJobStatus);
router.get('/', getMyContent);
router.get('/:id', getContentById);
router.delete('/:id', deleteContent);

module.exports = router;