const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const departmentController = require('../controllers/departmentController');

router.use(auth);
router.use(authorize(['hr', 'admin']));
router.use(auditLogger('Departments & Org Chart'));

router.get('/', departmentController.getDepartments);
router.post('/', departmentController.createDepartment);
router.patch('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

router.get('/org-chart/tree', departmentController.getOrgChart);
router.patch('/org-chart/employee/:id', departmentController.updateEmployeeOrgInfo);

module.exports = router;
