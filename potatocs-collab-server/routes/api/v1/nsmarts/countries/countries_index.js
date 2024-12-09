const router = require("express").Router();

const countries = require("./countries_controller");

// 국가 목록 조회
router.get("/", countries.getCountryList);
// 국가 등록
router.post("/", countries.addCountry);
// 국가 삭제
router.delete("/:id", countries.deleteCountry);

module.exports = router;
