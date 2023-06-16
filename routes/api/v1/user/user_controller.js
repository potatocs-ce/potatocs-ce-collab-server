const member = require('../../../../models/member_schema');
var fs = require("fs");
var path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const sharp = require('sharp');
const s3 = global.AWS_S3.s3;
const bucket = global.AWS_S3.bucket;

exports.profile = async (req, res) => {
	console.log(`
--------------------------------------------------
  User Profile: ${req.decoded._id}
  router.get('/profile', userController.profile) 
--------------------------------------------------`);

	const dbModels = global.DB_MODELS;
	const criteria = { _id: req.decoded._id };
	const projection = {
		password: false,
		createdAt: false,
		updatedAt: false
	}

	try {
		const user = await member.findOne(criteria, projection);

		//-----------------------------------------------------	
		/// 우선 임시 ------------------------------------------
		// user 에서 isAdmin이 true 면 ( admin 이면 )
		if( user.isAdmin ){
			console.log(user);
			const adminCompany = await dbModels.Company.findOne(
				{
					_id: user.company_id
				}
			)
			// console.log(adminCompany);

			adminCompanyInfo = {
				_id: adminCompany._id,
				company_code: adminCompany.company_code,
				company_name: adminCompany.company_name,
				rollover_max_day: adminCompany.rollover_max_day,
				rollover_max_month: adminCompany.rollover_max_month,
			}

			const adminProfileData = {
				user: {
					_id: user._id,
					email: user.email,
					name: user.name,
					profile_img: user.profile_img,
					mobile: user.mobile,
					department: user.department,
					isManager: user.isManager,
					position: user.position,
					location: user.location,
					emp_start_date: user.emp_start_date,
					emp_end_date: user.emp_end_date,
					isAdmin: user.isAdmin,
				},
				company: adminCompanyInfo,
			}
			return res.send(
				adminProfileData
			);
		}


		//-----------------------------------------------------
		//-----------------------------------------------------
		
		const company = await dbModels.PendingCompanyRequest.findOne(
			{
				member_id: user._id
			}
		).populate('company_id');

		// Manager에서 myId가 같은 데이터를 가지고 올 뿐만 아니라
		// populate로 model에 정의해둔 Member와 연동
		// MyManager Id와 Member._id을 조회가 가능하다.
		const user2 = await dbModels.Manager.findOne(
			{
				myId: req.decoded._id,
			},
		).populate('myManager', projection);

		const nationalHoliday = await dbModels.NationalHoliday.findOne(
			{
				countryName: user.location
			}
		)
		console.log(nationalHoliday);

		// if (user.profile_img == '') {
		// 	user.profile_img = '/uploads/profile_img/person.png'
		// 	// s3에 저장된 기본 프로필 이미지 경로
		// 	// user.profile_img = 'https://potatocs-meeting-pdf.s3.ap-northeast-2.amazonaws.com/profile-img/1640743822555.person.png'
		// }

		let managerInfo = null;
		let companyInfo = null;

		// 매니저 id와 맴버의 매니저가 은퇴하지 않았으면 값을 가져온다
		if (user2 && user2.myManager.retired == false) {
			// if (user2.profile_img == '') {
			// 	user2.profile_img = '/uploads/profile_img/person.png'
			// 	// s3에 저장된 기본 프로필 이미지 경로
			// 	// user2.profile_img = 'https://potatocs-meeting-pdf.s3.ap-northeast-2.amazonaws.com/profile-img/1640743822555.person.png'
			// }
			managerInfo = {
				manager_id: user2.myManager._id,
				email: user2.myManager.email,
				name: user2.myManager.name,
				profile_img: user2.myManager.profile_img,
				mobile: user2.myManager.mobile,
				department: user2.myManager.department,
				isManager: user2.myManager.isManager,
				position: user2.myManager.position,
				location: user2.myManager.location,
				emp_start_date: user2.myManager.emp_start_date,
				emp_end_date: user2.myManager.emp_end_date,
				isAdmin: user2.myManager.isAdmin,
				company_id: user2.myManager.company_id,
				accepted: user2.accepted,
			}

		}

		if (company) {
			companyInfo = {
				_id: company.company_id._id,
				company_code: company.company_id.company_code,
				company_name: company.company_id.company_name,
				status: company.status,
				request_id: company._id,
				rollover: company.company_id.rollover,
				rollover_max_day: company.company_id.rollover_max_day,
				rollover_max_month: company.company_id.rollover_max_month,
				isReplacementDay: company.company_id.isReplacementDay,
				rd_validity_term: company.company_id.rd_validity_term,
				company_holiday: company.company_id.company_holiday,
			}
		}


		const profileData = {
			user: {
				_id: user._id,
				email: user.email,
				name: user.name,
				profile_img: user.profile_img,
				mobile: user.mobile,
				department: user.department,
				isManager: user.isManager,
				position: user.position,
				location: user.location,
				emp_start_date: user.emp_start_date,
				emp_end_date: user.emp_end_date,
				isAdmin: user.isAdmin,
				nationalHoliday: nationalHoliday?.countryHoliday,
			},
			company: companyInfo,
			manager: managerInfo
		}

		// console.log(user);
		// const today = new Date();
		// // // 연차이므로 아직 1년이 안되면 1년차이므로 + 1
		// const year = Math.floor((today - user.emp_start_date) / (1000*60*60*24*365)) + 1;
		// // console.log(year);

		// if( user.years != year ){
		// 	const yearUp = await member.findOneAndUpdate(
		// 		{
		// 			_id: req.decoded._id
		// 		},
		// 		{
		// 			years: year
		// 		}
		// 	)
		// 	// console.log(yearUp);
		// }

		// console.log(profileData);
		if (!user) {
			return res.status(401).send({
				message: 'An error has occurred'
			});
		}
		return res.send(
			profileData
		);
	} catch (err) {
		console.log(err);
		return res.status(500).send('db Error');
	}
};

exports.profileChange = async (req, res) => {
	console.log(`
--------------------------------------------------
  User Profile: ${req.decoded._id}
  router.get('/profileChange', userController.profileChange) 
--------------------------------------------------`);
    const data = req.body;
	// console.log(data);
	let updateData;
	try {
		const hasPwd = data.new_password;
		if (hasPwd == null || hasPwd == '') {
			updateData = {
				name: data.name,
				email: data.email,
				mobile: data.mobile,
				department: data.department,
				position: data.position,
			}
		} else {
			updateData = {
				name: data.name,
				password: data.new_password,
				email: data.email,
				mobile: data.mobile,
				department: data.department,
				position: data.position,
			}
		}

		// console.log(updateData);

		const profileChange = await member.findOneAndUpdate(
			{
				_id: data._id
			},
			updateData,
			{
				fields: { password: 0 },
				new: true
			}
		)

		if (profileChange.profile_img == '') {
			profileChange.profile_img = "/assets/image/person.png"
		}

		// console.log(profileChange);
		return res.send({
			message: 'changed',
			profileChange
		});
	} catch (err) {
		console.log(err);
		return res.status(500).send('db Error');
	}
};

exports.profileImageChange = async (req, res) => {
	console.log(`
--------------------------------------------------
  User Profile: ${req.decoded._id}
  router.post('/profileImageChange', userController.profileImageChange)
--------------------------------------------------`);

    const data = req.files[0];
	// console.log(data);

	try {
		const previousProfileImage = await member.findOne(
			{
				_id: req.decoded._id
			}
		)
		const resizePath = 'uploads/profile_img/' + data.filename;

		// 이미지 리사이즈 작업 -> 원본을 리사이즈한 뒤에 원본을 제거
		await sharp(data.path).resize(300, 300).toFile(resizePath);
		await unlinkAsync(data.path);
		// console.log(previousProfileImage)

		const resizeImgName = `profile-img/${Date.now()}.${data.originalname}`
		var params = {
			'Bucket': bucket,
			'Key': resizeImgName,
			'ACL': 'public-read',
			'Body': fs.createReadStream('./uploads/profile_img/' + data.filename),
			'ContentType': 'image/png'
		}

		// https://www.w3schools.com/jsref/jsref_decodeuri.asp
		// s3로부터 받은 Location이 깨졌을 경우 해결
		await s3.upload(params, async function (err, data) {
			// console.log(data);
			const changeProfileImage = await member.findOneAndUpdate(
				{
					_id: req.decoded._id
				},
				{
					profile_img_key: data.key,
					profile_img: decodeURI(data.Location)
				},
				{
					fields: { password: 0 },
					new: true
				}
			)
			// 로컬에 저장된 리사이즈 파일 제거
			await unlinkAsync(resizePath);
			// S3에 저장된 프로필 수정 전 리사이즈 파일 삭제
			if (previousProfileImage.profile_img_key != '') {
				const params = {
					Bucket: bucket,
					Key: previousProfileImage.profile_img_key
				};
				s3.deleteObject(params, function (err, data) {
					if (err) console.log(err, err.stack);
					else console.log('previous S3 pofile image delete Success');
				})
			}
			return res.send({
				message: 'profile image change',
				user: changeProfileImage
			});
		});
	} catch (err) {
		console.log(err);
		return res.status(500).send('db Error');
	}
};