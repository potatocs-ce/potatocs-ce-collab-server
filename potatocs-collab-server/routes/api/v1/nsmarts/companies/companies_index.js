const router = require("express").Router();

const companies = require("./companies_controller");

// 회사 목록 조회
router.get("/", companies.getCompanyList);
// 회사 등록
router.post("/", companies.addCompany);
// 회사 상세 조회
router.get("/:id", companies.getCompanyInfo);
// 회사 수정
router.patch("/:id", companies.editCompany);
// 회사 삭제
router.delete("/:id", companies.deleteCompany);

module.exports = router;
