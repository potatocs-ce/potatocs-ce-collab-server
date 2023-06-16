const mongoose = require('mongoose');

const uploadFile = mongoose.Schema(
	{
		doc_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Document',
		},
		originalname: {
			type: String
		},
		
		destination: {
			type: String
		},
		filename: {
			type: String,
        },
		key: {
			type: String
		},
		fileType: {
			type: String
		},
		creator: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
		},
		description: {
			type: String
		}
	},
	{
		timestamps: true
	}
);

const UploadFile = mongoose.model('UploadFile', uploadFile);

module.exports = UploadFile;


