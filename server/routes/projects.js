const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const projectController = require('../controllers/projectController');

// --- Projects ---
router.get('/', auth, projectController.getProjects);
router.post('/', auth, authorize(['hr']), projectController.createProject);
router.put('/:id', auth, authorize(['hr', 'admin']), projectController.updateProject);
router.delete('/:id', auth, authorize(['hr', 'admin']), projectController.deleteProject);
router.patch('/:id/close', auth, authorize(['hr', 'admin']), projectController.closeProject);
router.patch('/:id/reopen', auth, authorize(['hr', 'admin']), projectController.reopenProject);
router.get('/reports/my', auth, projectController.getMyReports);
router.get('/:id', auth, projectController.getProjectById);

// --- Tasks ---
router.post('/:id/tasks', auth, projectController.createTask);

// --- Team Management ---
router.post('/:id/members', auth, authorize(['hr', 'admin']), projectController.addProjectMember);
router.delete('/:id/members/:employeeId', auth, authorize(['hr', 'admin']), projectController.removeProjectMember);

// --- Daily Reports ---
router.post('/:id/reports', auth, projectController.createReportTask);
router.get('/:id/reports', auth, projectController.getProjectReports);

// --- Daily Report Tasks (new individual task system) ---
router.get('/:id/tasks', auth, projectController.getReportTasks);
router.post('/:id/tasks/daily', auth, projectController.createReportTask);
router.put('/:id/tasks/:taskId', auth, projectController.updateReportTask);
router.delete('/:id/tasks/:taskId', auth, projectController.deleteReportTask);

module.exports = router;
