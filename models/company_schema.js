const mongoose = require('mongoose');

// company_code 
const companySchema = mongoose.Schema(
	{
		company_code: {
			type: String
		},
        company_name: {
            type: String
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
        ],


        // rollover 회사 규칙대로 하기 위한 필드
        rollover: {
            type: Boolean
        },
        rollover_max_month: {
            type: Number
        },
        rollover_max_day: {
            type: Number
        },
        isReplacementDay: {
            type: Boolean
        },
        rd_validity_term: {
            type: Number
        },
        annual_policy :{ // 계약일 기준인지, 연차기준인지
            type: String,
            enum : ['byYear','byContract'],
        },
        company_holiday :[
            {   
                ch_name:{
                    type: String
                },
                ch_date:{
                    type: String
                }
                
            }
        ]
       
	},
	{
		timestamps: true
	}
);

const Company = mongoose.model('Company', companySchema);

module.exports = Company;


