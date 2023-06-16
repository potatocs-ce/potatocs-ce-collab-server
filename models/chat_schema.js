const mongoose = require('mongoose');

const chatScehma = mongoose.Schema(
	{
		docId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Document',
		},
        chatMember: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Member',
        },
		chatContent: {
			type: String,
		},
		isDialog: {
			type: Boolean
		},
        reply: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chat',
        }
        
	},
	{
		timestamps: true
	}
);

const Chat = mongoose.model('Chat', chatScehma);

module.exports = Chat;


