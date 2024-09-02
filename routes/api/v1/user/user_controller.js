const member = require("../../../../models/member_schema");
var fs = require("fs");
var path = require("path");
const { promisify } = require("util");
const { default: mongoose } = require("mongoose");
const { s3Client } = require("../../../../utils/s3Utils");
const { faceImageUpload, getImageBase64FromS3 } = require("../../../../utils/s3Utils");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const axios = require('axios');

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
        updatedAt: false,
    };

    try {
        const user = await member.findOne(criteria, projection);

        //-----------------------------------------------------
        /// 우선 임시 ------------------------------------------
        // user 에서 isAdmin이 true 면 ( admin 이면 )
        if (user.isAdmin) {
            console.log(user);
            const adminCompany = await dbModels.Company.findOne({
                _id: user.company_id,
            });
            // console.log(adminCompany);

            adminCompanyInfo = {
                _id: adminCompany._id,
                company_code: adminCompany.company_code,
                company_name: adminCompany.company_name,
                rollover_max_day: adminCompany.rollover_max_day,
                rollover_max_month: adminCompany.rollover_max_month,
            };

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
            };
            return res.send(adminProfileData);
        }

        //-----------------------------------------------------
        //-----------------------------------------------------

        const company = await dbModels.PendingCompanyRequest.findOne({
            member_id: user._id,
        }).populate("company_id");

        // Manager에서 myId가 같은 데이터를 가지고 올 뿐만 아니라
        // populate로 model에 정의해둔 Member와 연동
        // MyManager Id와 Member._id을 조회가 가능하다.
        const user2 = await dbModels.Manager.findOne({
            myId: req.decoded._id,
        }).populate("myManager", projection);

        const nationalHoliday = await dbModels.NationalHoliday.findOne({
            countryName: user.location,
        });
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
            };
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
            };
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
            manager: managerInfo,
        };

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
                message: "An error has occurred",
            });
        }
        return res.send(profileData);
    } catch (err) {
        console.log(err);
        return res.status(500).send("db Error");
    }
};

exports.profileChange = async (req, res) => {
    console.log(`
--------------------------------------------------
  User Profile: ${req.decoded._id}
  router.put('/profileChange', userController.profileChange) 
--------------------------------------------------`);
    const data = req.body;

    // console.log(data);
    let updateData;
    try {
        const hasPwd = data.new_password;
        if (hasPwd == null || hasPwd == "") {
            updateData = {
                name: data.name,
                email: data.email,
                mobile: data.mobile,
                department: data.department,
                position: data.position,
            };
        } else {
            updateData = {
                name: data.name,
                password: data.new_password,
                email: data.email,
                mobile: data.mobile,
                department: data.department,
                position: data.position,
            };
        }

        // console.log(updateData);

        const profileChange = await member.findOneAndUpdate(
            {
                _id: data._id,
            },
            updateData,
            {
                fields: { password: 0 },
                new: true,
            }
        );

        if (profileChange.profile_img == "") {
            profileChange.profile_img = "/assets/image/person.png";
        }

        // console.log(profileChange);
        return res.send({
            message: "changed",
            profileChange,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send("db Error");
    }
};

exports.profileImageChange = async (req, res) => {
    console.log(`
--------------------------------------------------
  User Profile: ${req.decoded._id}
  router.post('/profileImageChange', userController.profileImageChange)
--------------------------------------------------`);

    const data = req.uploadedImage[0];

    try {
        const previousProfileImage = await member.findOne({
            _id: req.decoded._id,
        });

        // 이전 사진 있으면 삭제
        const profileImgPath = previousProfileImage.profile_img.substring(previousProfileImage.profile_img.indexOf("nsProfile_img"));
        // console.log(profileImgPath)
        if (profileImgPath) {
            const params = {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: profileImgPath,
            };
            await s3Client.send(new DeleteObjectCommand(params));
        }

        // const resizePath = "uploads/profile_img/" + data.filename;

        // // 이미지 리사이즈 작업 -> 원본을 리사이즈한 뒤에 원본을 제거
        // await sharp(data.path).resize(300, 300).toFile(resizePath);

        // await unlinkAsync(data.path);
        // // console.log(previousProfileImage)

        // const resizeImgName = `profile-img/${Date.now()}.${data.originalname}`;
        // // var params = {
        // //   'Bucket': bucket,
        // //   'Key': resizeImgName,
        // //   'ACL': 'public-read',
        // //   'Body': fs.createReadStream('./uploads/profile_img/' + data.filename),
        // //   'ContentType': 'image/png'
        // // }

        // // 리사이즈된 이미지를 S3에 업로드

        // console.log(resizePath);
        // const uploadParams = {
        //     Bucket: process.env.AWS_S3_BUCKET,
        //     Key: resizeImgName,
        //     Body: fs.createReadStream(resizePath),
        //     ACL: "public-read",
        //     ContentType: "image/png",
        // };

        // const new_data = await s3Client.send(new PutObjectCommand(uploadParams));
        // console.log(new_data);
        // // 로컬에 저장된 리사이즈 파일 제거
        // await unlinkAsync(resizePath);
        // const location = `${process.env.AWS_LOCATION}${resizeImgName}`;
        // const updatedUserProfile = await member.findByIdAndUpdate(req.decoded._id,
        //   {
        //     profile_img_key: data.key,
        //     profile_img: decodeURI(data.Location)
        //   },
        //   {
        //     fields: { password: 0 },
        //     new: true
        //   }
        // );

        const changeProfileImage = await member.findOneAndUpdate(
            {
                _id: req.decoded._id,
            },
            {
                profile_img_key: data.key,
                profile_img: data.location, //s3 저장된 경로
            },
            {
                fields: { password: 0 },
                new: true,
            }
        );
        console.log(changeProfileImage)

        // https://www.w3schools.com/jsref/jsref_decodeuri.asp
        // s3로부터 받은 Location이 깨졌을 경우 해결
        // await s3.upload(params, async function (err, data) {
        //   // console.log(data);
        //   const changeProfileImage = await member.findOneAndUpdate(
        //     {
        //       _id: req.decoded._id
        //     },
        //     {
        //       profile_img_key: data.key,
        //       profile_img: decodeURI(data.Location)
        //     },
        //     {
        //       fields: { password: 0 },
        //       new: true
        //     }
        //   )
        //   // 로컬에 저장된 리사이즈 파일 제거
        //   await unlinkAsync(resizePath);
        //   // S3에 저장된 프로필 수정 전 리사이즈 파일 삭제
        //   if (previousProfileImage.profile_img_key != '') {
        //     const params = {
        //       Bucket: bucket,
        //       Key: previousProfileImage.profile_img_key
        //     };
        //     s3.deleteObject(params, function (err, data) {
        //       if (err) console.log(err, err.stack);
        //       else console.log('previous S3 pofile image delete Success');
        //     })
        //   }
        return res.send({
            message: "profile image change",
            user: changeProfileImage,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send("db Error");
    }
};

exports.companyConnections = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : adding company
  router.post('/company-connections', companyCtrl.companyConnections);
  data: ${req.body.company_code}
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const isExisted = await dbModels.PendingCompanyRequest.findOne({
            member_id: req.decoded._id,
        });

        if (isExisted) {
            return res.status(500).send({
                message: "4",
            });
        }

        const isCompany = await dbModels.Company.findOne({
            company_code: req.body.company_code,
        });

        if (!isCompany) {
            return res.status(404).send({
                message: "5",
            });
        }

        const addedRequest = await dbModels.PendingCompanyRequest({
            member_id: req.decoded._id,
            company_id: isCompany._id,
            status: "pending",
        });
        await addedRequest.save();

        const pendingCompanyData = await dbModels.PendingCompanyRequest.aggregate([
            {
                $match: {
                    member_id: new mongoose.Types.ObjectId(req.decoded._id),
                },
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "_id",
                    as: "company",
                },
            },
            {
                $unwind: {
                    path: "$company",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    request_id: "$_id",
                    _id: "$company._id",
                    company_code: "$company.company_code",
                    company_name: "$company.company_name",
                    status: 1,
                },
            },
        ]);

        return res.status(200).send({
            message: "saved",
            pendingCompanyData: pendingCompanyData[0],
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "DB Error",
        });
    }
};

exports.faceDetection = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : faceDetection
  router.post('/faceDetection', profiles.faceDetection);
        
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;


    try {

        const flaskUrl = 'http://127.0.0.1:5000/detection';

        // Flask 서버로 POST 요청 보내기
        const flaskResponse = await axios.post(flaskUrl, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(flaskResponse.data)
        // Flask 서버의 응답 처리
        if (flaskResponse.status === 200) {

            // 얼굴 인식이 안되었으면
            if (!flaskResponse.data.status) {
                console.log('인식 안된거 아니야?')
                return res.status(200).send({
                    message: "Not Detection"
                })
            }
            // 인식이 되서 이미지 데이터가 왔으면
            else {
                console.log('인식 된거?')
                // console.log(flaskResponse.data)

                flaskResponse.data.filename = req.decoded._id + '_face'

                const face = await faceImageUpload(flaskResponse)

                const memberInfo = await dbModels.Member.findOneAndUpdate(
                    {
                        _id: req.decoded._id,
                    },
                    {
                        face_img_key: face.Key,
                        face_img: face.location,
                    }
                );

                return res.status(200).send({
                    message: "Successfully face Detection",
                    flaskData: flaskResponse.data,
                });
            }
        } else {
            return res.status(flaskResponse.status).send({
                message: "Failed to get a successful response from Flask server",
            });
        }


    } catch (err) {
        console.log("[ ERROR ]", err);
        return res.status(500).send({
            message: "Error face Detection",
        });
    }
};

exports.faceRecognition = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : faceRecognition
  router.post('/faceRecognition', profiles.faceRecognition);
        
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;
    // console.log('data : ', data)
    try {

        const memberInfo = await dbModels.Member.findOne({
            _id: req.decoded._id,
        });
        /*
            여기서 얼굴 없으면 redirect 해버릴까???
            고민중
        */

        // console.log(memberInfo)

        const face_img = await getImageBase64FromS3({
            // bucketName: 'face_img/',
            objectKey: memberInfo.face_img_key
        })

        // console.log('face_img : ', face_img)

        const flaskUrl = 'http://127.0.0.1:5000/recognition';

        const flaskSendData = {
            profile_img: face_img,      // s3에 저장되 있던 사진
            frame_img: req.body.frame,  // client 에서 보낸 사진
        }
        // Flask 서버로 POST 요청 보내기
        const flaskResponse = await axios.post(flaskUrl, flaskSendData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(flaskResponse.data)
        // Flask 서버의 응답 처리
        if (flaskResponse.status === 200) {

            // 얼굴 인식이 안되었으면
            if (!flaskResponse.data.status) {
                console.log('인식 안된거 아니야?')
                return res.status(200).send({
                    message: "Not recognition"
                })
            }
            // 인식이 되서 이미지 데이터가 왔으면
            else {
                console.log('인식 된거?')
                // console.log(flaskResponse.data)


                return res.status(200).send({
                    message: "recognition",
                });
            }
        } else {
            return res.status(flaskResponse.status).send({
                message: "Failed to get a successful response from Flask server",
            });
        }


    } catch (err) {
        console.log("[ ERROR ]", err);
        return res.status(500).send({
            message: "Error face Detection",
        });
    }
};