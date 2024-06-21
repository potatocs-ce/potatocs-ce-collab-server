const router = require("express").Router();

/*-----------------------------------
  API
-----------------------------------*/
const adEmployeeCtrl = require("./employee-mngmt/employee_controller");
const adMainCtrl = require("./admin-main/admin-main-controller");
const adHolidayCtrl = require("./holiday-mngmt/holiday_controller");

/*-----------------------------------
  Admin Controller
    admin Main 페이지
-----------------------------------*/
router.get("/getAdminMain", adMainCtrl.getAdminMain);

/*-----------------------------------
  Employee Controller
    회사 직원 리스트
-----------------------------------*/
router.get("/", adEmployeeCtrl.getMyEmployee);
router.get("/getManagerEmployee", adEmployeeCtrl.getManagerEmployee);
router.get("/getEmployeeInfo/:id", adEmployeeCtrl.getEmployeeInfo);
router.put("/editEmployeeProfileInfo", adEmployeeCtrl.editEmployeeProfileInfo);
router.put("/editEmployeeLeaveInfo", adEmployeeCtrl.editEmployeeLeaveInfo);
router.get("/employeeLeaveListSearch", adEmployeeCtrl.employeeLeaveListSearch);
router.post("/importEmployeeList", adEmployeeCtrl.importEmployeeList);

/*-----------------------------------
  Employee Controller
    회사 퇴사자 리스트
-----------------------------------*/
router.get("/getMyRetiredEmployee", adEmployeeCtrl.getMyRetiredEmployee); // 퇴사자 목록
router.get("/searchEmployee", adEmployeeCtrl.searchEmployee); // 퇴사시킬 직원 검색
router.patch("/retireEmployee", adEmployeeCtrl.retireEmployee); // 직원 퇴사
router.patch("/cancelRetireEmployee", adEmployeeCtrl.cancelRetireEmployee); // 직원 퇴사 취소

/*-----------------------------------
  Holiday Controller
    공휴일 리스트
-----------------------------------*/
router.get("/getCompanyHolidayList", adHolidayCtrl.getCompanyHolidayList); // 회사 내 공휴일/지정휴일 목록 띄우기
router.post("/addCompanyHoliday", adHolidayCtrl.addCompanyHoliday); // 회사 내 공휴일/지정휴일 등록
router.post("/deleteCompanyHoliday", adHolidayCtrl.deleteCompanyHoliday); // 회사 내 공휴일/지정휴일 삭제

module.exports = router;
