const router = require("express").Router();

const holidaysCtrl = require("./holidays_controller");

// 휴일 목록
router.get("/", holidaysCtrl.getHolidayList);
// 휴일 등록
router.post("/", holidaysCtrl.addHoliday);
// 휴일 삭제
router.post("/deleteholidays", holidaysCtrl.deleteholiday);

module.exports = router;
