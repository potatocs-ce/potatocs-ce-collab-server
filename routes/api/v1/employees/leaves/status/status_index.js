const router = require('express').Router();

/*-----------------------------------
  Contollers
-----------------------------------*/
const statusMngmtCtrl = require('./status_controller');




router.get('/', statusMngmtCtrl.myEmployeesLeavesListSearch); // 매니저가 가진 직원 휴가 리스트
module.exports = router;
