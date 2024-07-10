const router = require("express").Router();

const dashboardCtrl = require("./dashboard_controller");

// 대쉬보드
router.get("/", dashboardCtrl.getDashboard);

module.exports = router;
