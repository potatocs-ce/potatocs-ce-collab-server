const router = require("express").Router();

const admins = require("./admins_controller");

// 어드민 목록 조회
router.get("/", admins.getAdminList);
// 어드민과 회사 연결
router.patch("/connectAdminCompany", admins.connectAdminCompany);
// 어드민과 회사 연결해제
router.patch("/disconnectAdminCompany", admins.disconnectAdminCompany);

module.exports = router;
