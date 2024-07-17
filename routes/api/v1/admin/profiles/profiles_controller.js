var fs = require("fs");
const { promisify } = require("util");
// const unlinkAsync = promisify(fs.unlink);
// const sharp = require("sharp");
const { s3Client } = require("../../../../../utils/s3Utils");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const admin = require("../../../../../models/admin_schema");

// 프로필 수정
exports.editProfile = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Edit Profile
  router.patch('/profiles', profiles.editProfile);
        
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;
    let updateData;

    try {
        const hasPwd = data.password;
        if (hasPwd == null || hasPwd == "") {
            updateData = {
                name: data.name,
            };
        } else {
            updateData = {
                name: data.name,
                password: data.password,
            };
        }

        const profileChange = await admin.findOneAndUpdate(
            {
                _id: data._id,
            },
            updateData,
            {
                fields: { password: 0 },
                new: true,
            }
        );

        return res.status(200).send({
            message: "Successfully edited the profile",
            profileChange,
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        return res.status(500).send({
            message: "Error editing the profile",
        });
    }
};

// 프로필 이미지 수정
exports.editProfileImage = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Edit Profile Image
  router.post('/profiles', profiles.editProfileImage);

--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const data = req.uploadedImage[0];
    // console.log('data\n', data)
    try {
        const previousProfileImage = await dbModels.Admin.findOne({
            _id: req.decoded._id,
        });

        const profileImgPath = previousProfileImage.profile_img.substring(previousProfileImage.profile_img.indexOf("nsProfile_img"));
        // console.log(profileImgPath)
        if (profileImgPath) {
            const params = {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: profileImgPath,
            };
            await s3Client.send(new DeleteObjectCommand(params));
        }

        /*
            미들웨어에서 리사이즈 하는 것으로 수정 했기에 필요없는 코드
        */
        // const resizePath = "../../../../uploads/nsProfile_img/" + data.filename;

        // // 이미지 리사이즈 작업 -> 원본을 리사이즈한 뒤에 원본을 제거
        // await sharp(data.path).resize(300, 300).toFile(resizePath);

        // // 임시 저장소(로컬)에 저장된 오리지날 파일 제거
        // await unlinkAsync(data.path);

        // //파일 명 디코딩
        // data.originalname = Buffer.from(data.originalname, "latin1").toString("utf8");

        // //s3 저장소 파일 이름
        // const resizeImgName = `nsProfile_img/${Date.now()}.${data.originalname}`;

        // var uploadParams = {
        //     // 'Bucket': bucket,
        //     Bucket: process.env.AWS_S3_BUCKET,
        //     Key: resizeImgName,
        //     // Body: fs.createReadStream("./uploads/profile_img/" + data.filename),
        //     Body: fs.createReadStream(resizePath),
        //     // ACL: 'public-read',
        //     // ContentType: "image/png",
        //     ContentType: req.file.mimetype,
        // };

        // if (process.env.NODE_ENV.trim() === "development") {
        //     uploadParams.ACL = "public-read";
        // }

        // await s3Client.send(new PutObjectCommand(uploadParams));

        // // 로컬에 저장된 리사이즈 파일 제거
        // await unlinkAsync(resizePath);

        // const location = `${process.env.AWS_LOCATION}${resizeImgName}`;

        await dbModels.Admin.updateOne(
            { _id: req.decoded._id },
            {
                profile_img_key: data.key,
                profile_img: data.location, //s3 저장된 경로
            },
            {
                fields: { password: 0 },
                new: true,
            }
        );

        res.status(200).send({ message: "Successfully edited the profile image", data: data.location });
    } catch (err) {
        console.log("[ ERROR ]", err);
        return res.status(500).send({
            message: "Error editing the profile iamge",
        });
    }
};
