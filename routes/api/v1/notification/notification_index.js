const router = require('express').Router();

/*-----------------------------------
  Contollers
-----------------------------------*/
const notificationCtrl = require('./notification_controller');

/*-----------------------------------
  Notification
-----------------------------------*/
router.get('/get', notificationCtrl.getNotificationList);
router.post('/edit', notificationCtrl.editNotification);

router.delete('/delete', notificationCtrl.deleteNotification);
router.get('/allRead', notificationCtrl.allReadNotification);

module.exports = router;