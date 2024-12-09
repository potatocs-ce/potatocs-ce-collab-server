const mongoose = require('mongoose');

const docSchema = mongoose.Schema(
	{
		spaceTime_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Space',
		},
		
		docTitle: {
			type: String
		},
		docDescription: {
			type: String
		},
		docContent: {
			type: Array,
		},
		status: {
			type: Object
		},
		creator: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
		}],
		startDate: {
			type: Date
		},
		endDate: {
			type: Date
		},



        done: {
            type: Boolean,
            default: false
        },


        

		color: {
			primary: {
				type: String
			},
			secondary: {
				type: String
			}
		},


        labels: []
	},
	{
		timestamps: true
	}
);

const Document = mongoose.model('Document', docSchema);

module.exports = Document;


