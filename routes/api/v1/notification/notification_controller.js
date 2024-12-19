const mongoose = require("mongoose");

exports.getNotificationList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Notification List
  router.get('/get', notificationCtrl.getNotificationList);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const notification = await dbModels.Notification.aggregate([
            {
                $match: {
                    receiver: new mongoose.Types.ObjectId(req.decoded._id),
                },
            },
            {
                $sort: {
                    isRead: 1,
                    createdAt: -1,
                },
            },
            {
                $limit: 30,
            },
        ]);

        return res.status(200).send({
            message: "get notification list",
            notification,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "DB Error",
        });
    }
};

exports.editNotification = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : edit Notification
  router.post('/edit', notificationCtrl.editNotification);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;

    try {
        const editNotification = await dbModels.Notification.findOneAndUpdate(
            {
                _id: data._id,
            },
            {
                isRead: true,
            }
        );

        // const notification = await dbModels.Notification.find(
        //     {
        //         receiver: req.decoded._id
        //     }
        // )

        const notification = await dbModels.Notification.aggregate([
            {
                $match: {
                    receiver: new mongoose.Types.ObjectId(req.decoded._id),
                },
            },
            {
                $sort: {
                    isRead: 1,
                    createdAt: -1,
                },
            },
            {
                $limit: 30,
            },
        ]);

        return res.status(200).send({
            message: "get notification list",
            notification,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "DB Error",
        });
    }
};

exports.allReadNotification = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : All Read Notification
  router.get('/allRead', notificationCtrl.allReadNotification);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const allReadNotification = await dbModels.Notification.updateMany(
            {
                receiver: req.decoded._id,
            },
            {
                isRead: true,
            }
        );

        // const notification = await dbModels.Notification.find(
        //     {
        //         receiver: req.decoded._id
        //     }
        // )

        const notification = await dbModels.Notification.aggregate([
            {
                $match: {
                    receiver: new mongoose.Types.ObjectId(req.decoded._id),
                },
            },
            {
                $sort: {
                    isRead: 1,
                    createdAt: -1,
                },
            },
            {
                $limit: 30,
            },
        ]);

        return res.status(200).send({
            message: "get notification list",
            notification,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "DB Error",
        });
    }
};
