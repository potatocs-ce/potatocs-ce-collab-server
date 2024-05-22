var fs = require("fs");
var path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const sharp = require('sharp');
// const s3 = global.AWS_S3.s3;
// const bucket = global.AWS_S3.bucket
const admin = require('../../../../../models/admin_schema');
const { s3Client } = require("../../../../../utils/s3Utils");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const bcrypt = require("bcryptjs");

exports.profile = async (req, res) => {
  console.log(`
--------------------------------------------------
  User Profile: ${req.decoded._id}
  router.get('/profile', adProfileCtrl.profile) 
--------------------------------------------------`);

  const criteria = { _id: req.decoded._id };
  const projection = {
    password: false,
    createdAt: false,
    updatedAt: false
  }

  console.log("id:", req.decoded._id);

  try {
    const adUser = await admin.findOne(criteria, projection).populate('company_id');

    // console.log(adUser);

    if (!adUser) {
      return res.status(401).send({
        message: 'An error has occurred'
      });
    }

    return res.send(
      adUser
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
  router.get('/profileChange', adProfileCtrl.profileChange) 
--------------------------------------------------`);
  const data = req.body;
  console.log("req.body:", req.body);

  try {
    updateData = {
      name: data.name,
      password: data.password,
      email: data.email,
      mobile: data.mobile,
      department: data.department,
      position: data.position,
    }

    const profileChange = await admin
        .findOneAndUpdate(
            {
                _id: data._id,
            },
            updateData,
            {
                fields: { password: 0 },
                new: true,
            }
        )

    if (profileChange.profile_img == '') {
      profileChange.profile_img = "/assets/image/person.png"
    }

     res.status(201).json({
         success: true,
         message: "Profile updated sucessfully",
     });
  } catch (err) {
    console.log(err);
    return res.status(500).send('db Error');
  }
};

/**
 *
 * @param {*} req image file
 * @param {*} res
 */
exports.profileImageChange = async (req, res) => {
  console.log(`
--------------------------------------------------
  User Profile: ${req.decoded._id}
  router.post('/profileImageChange', adProfileCtrl.profileImageChange)
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;

  const data = req.file;
  console.log(data);

  try {
      // const previousProfileImage = await admin.findOne({
      //     _id: req.decoded._id,
      // });

      const resizePath = "uploads/profile_img/" + data.filename;

      // 이미지 리사이즈 작업 -> 원본을 리사이즈한 뒤에 원본을 제거
      await sharp(data.path).resize(300, 300).toFile(resizePath);

      // 임시 저장소(로컬)에 저장된 오리지날 파일 제거
      await unlinkAsync(data.path);
      // console.log(previousProfileImage)

      //파일 명 디코딩
      data.originalname = Buffer.from(data.originalname, "latin1").toString("utf8");

      //s3 저장소 파일 이름
      const resizeImgName = `profile_img/${Date.now()}.${data.originalname}`;

      var uploadParams = {
          // 'Bucket': bucket,
          Bucket: process.env.AWS_S3_BUCKET,
          Key: resizeImgName,
          // Body: fs.createReadStream("./uploads/profile_img/" + data.filename),
          Body: fs.createReadStream(resizePath),
          // ACL: 'public-read',
          // ContentType: "image/png",
          ContentType: req.file.mimetype,
      };

      if (process.env.NODE_ENV.trim() === "development") {
          uploadParams.ACL = "public-read";
      }

      await s3Client.send(new PutObjectCommand(uploadParams));

      // 로컬에 저장된 리사이즈 파일 제거
      await unlinkAsync(resizePath);

      const location = `${process.env.AWS_LOCATION}${resizeImgName}`;

      await dbModels.Admin.updateOne(
          { _id: req.decoded._id },
          {
              profile_img_key: data.key,
              profile_img: location, //s3 저장된 경로
          }
      );

      res.status(201).send({ message: "success" });

      // https://www.w3schools.com/jsref/jsref_decodeuri.asp
      // s3로부터 받은 Location이 깨졌을 경우 해결
      // await s3.upload(params, async function (err, data) {
      //     // console.log(data);
      //     const changeProfileImage = await admin.findOneAndUpdate(
      //         {
      //             _id: req.decoded._id,
      //         },
      //         {
      //             profile_img_key: data.key,
      //             profile_img: decodeURI(data.Location),
      //         },
      //         {
      //             fields: { password: 0 },
      //             new: true,
      //         }
      //     );
      //     // 로컬에 저장된 리사이즈 파일 제거
      //     await unlinkAsync(resizePath);
      //     // S3에 저장된 프로필 수정 전 리사이즈 파일 삭제
      //     if (previousProfileImage.profile_img_key != "") {
      //         const params = {
      //             Bucket: bucket,
      //             Key: previousProfileImage.profile_img_key,
      //         };
      //         s3.deleteObject(params, function (err, data) {
      //             if (err) console.log(err, err.stack);
      //             else console.log("previous S3 pofile image delete Success");
      //         });
      //     }
      //     return res.send({
      //         message: "profile image change",
      //         user: changeProfileImage,
      //     });
      // });
  } catch (err) {
    console.log(err);
    return res.status(500).send('db Error');
  }
};