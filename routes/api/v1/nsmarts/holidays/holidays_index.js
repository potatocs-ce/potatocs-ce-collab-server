const router = require("express").Router();

const holidays = require("./holidays_controller");

// 휴일 목록 조회
router.get("/", holidays.getHolidayList);
// 휴일 등록
router.post("/", holidays.addHoliday);
// 휴일 삭제
router.delete("/:id", holidays.deleteHoliday);

module.exports = router;
