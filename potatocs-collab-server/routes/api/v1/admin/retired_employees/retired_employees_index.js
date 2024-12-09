const router = require("express").Router();

const retiredEmployeesCtrl = require("./retired_employees_controller");

// 퇴사 직원 목록
router.get("/", retiredEmployeesCtrl.getRetiredEmployeeList);
// 직원 목록
router.get("/getEmployeeList", retiredEmployeesCtrl.getEmployeeList);
// 직원 퇴사
router.patch("/", retiredEmployeesCtrl.editRetiredEmployee);
// 직원 퇴사 취소
router.patch("/cancelRetireEmployee", retiredEmployeesCtrl.cancelRetireEmployee);

module.exports = router;
