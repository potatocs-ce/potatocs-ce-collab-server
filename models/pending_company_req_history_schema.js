const mongoose = require('mongoose');

const pendingCompanyRequestHistorySchema = mongoose.Schema(
	{
		member_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
		},
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
			ref: 'Company',
        },
        approver_id: {
            type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
        },
        status: {
            type: String,
        }
	},
	{
		timestamps: true
	}
);

const PendingCompanyRequestHistory = mongoose.model('PendingCompanyRequestHistory', pendingCompanyRequestHistorySchema);

module.exports = PendingCompanyRequestHistory;


