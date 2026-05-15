const express = require('express');
const router = express.Router();
const { startInterview, submitAnswer, getMyInterviews, getInterviewById } = require('../controllers/interviewControllers');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Every route in this file requires the user to be logged in!
router.use(protect);

router.post('/start', upload.single('cv'), startInterview);
router.post('/:id/answer', submitAnswer);
router.get('/', getMyInterviews);
router.get('/:id', getInterviewById);

module.exports = router;