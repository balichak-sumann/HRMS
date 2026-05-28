const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const surveyController = require('../controllers/surveyController');

router.use(auth);
router.use(auditLogger('Employee Surveys'));

router.post('/', authorize(['hr']), surveyController.createSurvey);
router.patch('/:id/publish', authorize(['hr']), surveyController.publishSurvey);
router.get('/', surveyController.getSurveys);
router.get('/:id', surveyController.getSurveyById);
router.post('/:id/respond', authorize(['employee']), surveyController.respondToSurvey);
router.get('/:id/results', authorize(['hr']), surveyController.getSurveyResults);

module.exports = router;
