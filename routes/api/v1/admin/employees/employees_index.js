const router = require("express").Router();
const employeesCtrl = require("./employees_controller");

/*-----------------------------------
  API
-----------------------------------*/
router.get("/", employeesCtrl.getEmployees);
router.post("/importEmployeeList", employeesCtrl.importEmployeeList);

module.exports = router;
