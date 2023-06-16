const mongoose = require('mongoose');

const whiteBoardSchema = mongoose.Schema(
	{
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Member',
        },
        docId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
        },
        recordingTitle: {
            type: String
        },
		gstd_key: {
			type: String
		},
		image_key: {
			type: String
		},
	},
	{
		timestamps: true
	}
);

const WhiteBoard = mongoose.model('WhiteBoard', whiteBoardSchema);

module.exports = WhiteBoard;


