const mongoose = require('mongoose');

// company_code 
const personalLeaveStandard = mongoose.Schema(
	{
		member_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Member',
		},
        rest_leave: {   // 이월에 사용될 친구
            year : {
                type: Number
            },
            annual_leave : {
                type: Number
            },
            sick_leave : {
                type: Number
            },
            replacement_leave: {
                type: Number
            }
        },
		leave_standard: [
            {
                _id : false, // 추가 : array 내에 object ID 생성 안함

                year : {
                    type: Number
                },
                annual_leave : {
                    type: Number
                },
                sick_leave : {
                    type: Number
                },
                replacement_leave: {
                    type: Number
                },
                rollover: {
                    type: Number
                }
            }
        ]        
	},
	{
		timestamps: true
	}
);

const PersonalLeaveStandard = mongoose.model('PersonalLeaveStandard', personalLeaveStandard);

module.exports = PersonalLeaveStandard;


 