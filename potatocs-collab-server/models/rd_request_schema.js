const mongoose = require('mongoose');

const rdRequestSchema = mongoose.Schema(
	{
		requestor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
		},
		approver: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
		},
		leaveType: {
			type: String,
		},
		leaveDay: {
			type: String,
		},
		leaveDuration: {
			type: Number,
		},
		taken: {
			type: Number,
			default: 0
		},
		leave_start_date: {
			type: Date,
		},
		leave_end_date: {
			type: Date,
		},
		leave_reason: {
			type: String,
		},
		status: {
			type: String,
		},
		rejectReason: {
			type: String
		}
	},
	{
		timestamps: true
	}
);

const RdRequest = mongoose.model('RdRequest', rdRequestSchema);

module.exports = RdRequest;


