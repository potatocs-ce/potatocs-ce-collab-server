const router = require("express").Router();

const leaves = require("./leaves/leaves_index");

/*-----------------------------------
  Contollers
-----------------------------------*/
const employeeMngmtCtrl = require("./employees_controller");

router.use("/leaves", leaves);
router.get("/", employeeMngmtCtrl.myEmployeeList); // M 매니저가 가지고 있는 사원
router.put("/", employeeMngmtCtrl.approvedLeaveRequest); // M 매니저가 가지고 있는 사원

module.exports = router;
