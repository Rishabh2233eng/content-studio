const express = require('express');
const router = express.Router();
const {
  generateContent,
  getMyContent,
  getContentById,
  deleteContent
} = require('../controllers/contentController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

router.post('/generate', generateContent);
router.get('/', getMyContent);
router.get('/:id', getContentById);
router.delete('/:id', deleteContent);

module.exports = router;