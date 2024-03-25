const mongoose = require('mongoose');

const leaveRequestSchema = mongoose.Schema(
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
		year: {
			type: Number,
		},
		rejectReason: {
			type: String
		},
		rdRequest: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'RdRequest',
		}
	},
	{
		timestamps: true
	}
);

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = LeaveRequest;


