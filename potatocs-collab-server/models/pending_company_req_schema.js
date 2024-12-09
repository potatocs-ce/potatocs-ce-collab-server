const mongoose = require('mongoose');

const pendingCompanyRequestSchema = mongoose.Schema(
	{
		member_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
		},
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
			ref: 'Company',
        },
		status: {
			type: String
		}
	},
	{
		timestamps: true
	}
);

const PendingCompanyRequest = mongoose.model('PendingCompanyRequest', pendingCompanyRequestSchema);

module.exports = PendingCompanyRequest;


