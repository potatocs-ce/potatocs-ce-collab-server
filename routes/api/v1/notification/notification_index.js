const router = require("express").Router();

/*-----------------------------------
	Contollers
-----------------------------------*/
const notificationCtrl = require("./notification_controller");

/*-----------------------------------
	Notification
-----------------------------------*/
router.get("/get", notificationCtrl.getNotificationList);
router.post("/edit", notificationCtrl.editNotification);
router.get("/allRead", notificationCtrl.allReadNotification);
roguet.get("/Notice", notificationCtrl.allNotice);

module.exports = router;
