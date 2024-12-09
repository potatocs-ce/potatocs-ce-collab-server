const mongoose = require('mongoose');

const mySpaceHistory = mongoose.Schema( 
    {
        space_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Space',
        },
        doc_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
        },

        // 1 이면 스페이스, 2 면 도큐먼트
        type: {
            type: Number
        },
        
        content: {
            type: String
        }       
    },
    {
		timestamps: true
	}
);


const MySpaceHistory = mongoose.model('MySpaceHistory', mySpaceHistory);

module.exports = MySpaceHistory;
