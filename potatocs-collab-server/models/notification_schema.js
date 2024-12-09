const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
	{
        sender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
		},
		receiver: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
		},
		notiType: {
			type: String
		},
		isRead: {
			type: Boolean
		},
		iconText: {
            type: String
		},
        notiLabel: {
            type: String
        },
        navigate: {
            type: String
        }
	},
	{
		timestamps: true
	}
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;


