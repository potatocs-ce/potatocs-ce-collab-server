const router = require("express").Router();

const employeesCtrl = require("./employees_controller");

// 직원 목록
router.get("/", employeesCtrl.getEmployeeList);
// 직원 상세 조회
router.get("/:id", employeesCtrl.getEmployeeInfo);
// 직원 디테일 수정
router.put("/editEmployeeDetail", employeesCtrl.editEmployeeDetail);
// 직원 휴가 수정
router.put("/editEmployeeLeave", employeesCtrl.editEmployeeLeave);
// 직원 목록 excel 추가
router.post("/addExcelEmployeeList", employeesCtrl.addExcelEmployeeList);

module.exports = router;
