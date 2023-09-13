const router = require("express").Router();

const { isAuthenticated } = require("../../../middlewares/auth");

// AUTH
const auth = require("./auth/auth_index");
const adAuth = require("./admin/adAuth/adAuth_index");
const nsAuth = require("./nsmarts/nsAuth/nsAuth_index");
// AUTH
const user = require("./user/user_index");
const leave = require("./leave/leave_index");
const collab = require("./collab/collab_index");
const admin = require("./admin/admin_index");

const notification = require("./notification/notification_index");
// Nsmarts
const nsmarts = require("./nsmarts/nsmarts_index");

/*-----------------------------------
	not needed to verify
-----------------------------------*/
router.use("/auth", auth);
router.use("/adAuth", adAuth);
router.use("/nsAuth", nsAuth);
/*-----------------------------------
	Token verify
-----------------------------------*/
router.use(isAuthenticated);

/*-----------------------------------
	API
-----------------------------------*/
router.use("/admin", admin);
router.use("/user", user);
router.use("/leave", leave);
router.use("/collab", collab);
router.use("/notification", notification);

/*-----------------------------------
	Nsmarts
-----------------------------------*/
router.use("/nsmarts", nsmarts);

module.exports = router;
