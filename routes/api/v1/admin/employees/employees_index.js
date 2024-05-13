const router = require('express').Router();
const multer = require('multer');
const employeesCtrl = require('./employees_controller');


/*-----------------------------------
  API
-----------------------------------*/
router.get('/', employeesCtrl.getEmployees);



module.exports = router;