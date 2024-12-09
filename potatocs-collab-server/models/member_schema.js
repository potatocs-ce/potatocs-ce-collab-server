const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const member_Schema = mongoose.Schema(
	{
		email: { 
			type: String,
			required: true,
			unique: true,
			lowercase: true,
		},
		password: { 
			type: String,
			required: true, 
			trim: true,
		},
		name: { 
			type: String,
			required: true,
		},
		profile_img_key:{
			type: String,
			default: ''
		},
		profile_img: { 
			type: String,
			default: ''
		},
		mobile: { 
			type: String,
			default: ''
		},
		department: { 
			type: String,
			default: '' 
		},
		isManager: { 
			type: Boolean, 
			default: false
		},
		// manager_id: {
		// 	type: mongoose.Schema.Types.ObjectId,
        //     ref: 'Member',
		// 	default: null
		// },
		position: { 
			type: String,
			default: ''
		},
		location: { 
			type: mongoose.Schema.Types.ObjectId,
            ref: 'NationalHoliday',
			default: null
		},
		emp_start_date: { 
			type: Date,
			default: null
		},
		emp_end_date: { 
			type: Date,
			default: null
		},
		isAdmin: { 
			type: Boolean, 
			default: false
		},
		company_id: { 
			type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
			default: null
		},
		// password reset
		pw_reset_code: { 
			type: String
		},
		pw_reset_date: { 
			type: Date
		},
		resignation_date: {
			type: Date
		},
		retired: {
			type: Boolean,
			default: false
		}
		
	},
	{
		timestamps: true
	}
);

member_Schema.pre('save', function(next){
    var user = this;

	
    bcrypt.genSalt(10, function(err, salt) {
        if(err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash){
            if(err) return next(err)
            user.password = hash
            next();
        })
    });
})

// member_Schema.pre("update", function (next) {
member_Schema.pre("findOneAndUpdate", function (next) {
	// console.log("pre update�� ���Ծ��!!!!")
	
	const password = this.getUpdate().password;
	//const password = this.getUpdate().$set.password;
	// mongoose 5.0.4���� - const password = this.getUpdate().password;
	// console.log(password);
	if (!password) {
		return next();
	}
	try {
		bcrypt.genSalt(10, (err, salt) => {
			bcrypt.hash(password, salt, (err2, hash) => {
				this.getUpdate().password = hash;
				next();
			});
		});
	} catch (error) {
		return next(error);
	}
});

member_Schema.methods.comparePassword = function (password, hash) {
	return new Promise((resolve, reject) => {
		bcrypt.compare(password, hash, (err, result) => {
			if (err) reject(err);
			else resolve(result);
		});
	});
}

const Member = mongoose.model('Member', member_Schema)

module.exports = Member;