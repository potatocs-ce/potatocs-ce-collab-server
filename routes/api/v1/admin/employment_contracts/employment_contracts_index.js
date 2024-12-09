const router = require("express").Router();

const employmentContractsCtrl = require("./employment_contracts_controller");

// 고용 계약 목록
router.get("/", employmentContractsCtrl.getEmploymentContract);
// 고용 계약 수락
router.put("/", employmentContractsCtrl.acceptEmploymentContract);
// 고용 계약 거절
router.delete("/", employmentContractsCtrl.rejectEmploymentContract);

module.exports = router;
