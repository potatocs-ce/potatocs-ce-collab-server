const router = require("express").Router();

const dashboardCtrl = require("./dashboard_controller");

// 휴일 목록
router.get("/", dashboardCtrl.getDashboard);

module.exports = router;
