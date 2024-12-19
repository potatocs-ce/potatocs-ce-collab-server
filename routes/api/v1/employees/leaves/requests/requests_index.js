const router = require("express").Router();

/*-----------------------------------
  Contollers
-----------------------------------*/
const requestsMngmtCtrl = require("./requests_controller");

router.get("/", requestsMngmtCtrl.getLeaveRequest);
router.put("/", requestsMngmtCtrl.approvedLeaveRequest);
router.put("/reject", requestsMngmtCtrl.rejectLeaveRequest);

module.exports = router;
