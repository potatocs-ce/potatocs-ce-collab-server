const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const nsAdmin_Schema = mongoose.Schema(
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
		isNsAdmin: { 
			type: Boolean, 
			default: true
		},
		// password reset
		pw_reset_code: { 
			type: String
		},
		pw_reset_date: { 
			type: Date
		},
	},
	{
		timestamps: true
	}
);

nsAdmin_Schema.pre('save', function(next){
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
	nsAdmin_Schema.pre("findOneAndUpdate", function (next) {
	
	const password = this.getUpdate().password;
	//const password = this.getUpdate().$set.password;
	// mongoose 5.0.4 >>> const password = this.getUpdate().password;
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

nsAdmin_Schema.methods.comparePassword = function (password, hash) {
	return new Promise((resolve, reject) => {
		bcrypt.compare(password, hash, (err, result) => {
			if (err) reject(err);
			else resolve(result);
		});
	});
}

const NsAdmin = mongoose.model('NsAdmin', nsAdmin_Schema)

module.exports = NsAdmin;