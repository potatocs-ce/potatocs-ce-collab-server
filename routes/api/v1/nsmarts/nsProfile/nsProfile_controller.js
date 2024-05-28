var fs = require("fs");
var path = require("path");
const { promisify } = require("util");
const unlinkAsync = promisify(fs.unlink);
const sharp = require("sharp");
const { s3Client } = require("../../../../../utils/s3Utils");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

exports.profile = async (req, res) => {
    console.log(`
--------------------------------------------------
    NsAdmin Profile: ${req.decoded._id}
    router.get('/profile', nsProfileCtrl.profile) 
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;

    const criteria = { _id: req.decoded._id };
    const projection = {
        password: false,
        createdAt: false,
        updatedAt: false,
    };

    try {
        const nsAdmin = await dbModels.NsAdmin.findOne(criteria, projection);

        if (!nsAdmin) {
            return res.status(401).send({
                message: "An error has occurred",
            });
        }

        return res.send({
            user: nsAdmin,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send("db Error");
    }
};

exports.profileChange = async (req, res) => {
    console.log(`
--------------------------------------------------
    NsAdmin Profile: ${req.decoded._id}
    router.get('/profileChange', nsProfileCtrl.profileChange) 
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;
    let updateData;

    try {
        const hasPwd = data.password;
        if (hasPwd == null || hasPwd == "") {
            updateData = {
                name: data.name,
                // email: data.email,
            };
        } else {
            updateData = {
                name: data.name,
                password: data.password,
                // email: data.email,
            };
        }

        const profileChange = await dbModels.NsAdmin.findOneAndUpdate(
            {
                _id: data._id,
            },
            updateData,
            {
                fields: { password: 0 },
                new: true,
            }
        );

        return res.send({
            message: "changed",
            profileChange,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send("db Error");
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

    try {
        const previousProfileImage = await dbModels.NsAdmin.findOne({
            _id: req.decoded._id,
        });

        const profileImgPath = previousProfileImage.profile_img.substring(previousProfileImage.profile_img.indexOf("nsProfile_img"));

        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: profileImgPath,
        };
        await s3Client.send(new DeleteObjectCommand(params));

        const resizePath = "uploads/nsProfile_img/" + data.filename;

        // 이미지 리사이즈 작업 -> 원본을 리사이즈한 뒤에 원본을 제거
        await sharp(data.path).resize(300, 300).toFile(resizePath);

        // 임시 저장소(로컬)에 저장된 오리지날 파일 제거
        await unlinkAsync(data.path);

        //파일 명 디코딩
        data.originalname = Buffer.from(data.originalname, "latin1").toString("utf8");

        //s3 저장소 파일 이름
        const resizeImgName = `nsProfile_img/${Date.now()}.${data.originalname}`;
        console.log("resizeImgName:" + resizeImgName);
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
        console.log("location:" + location);
        await dbModels.NsAdmin.updateOne(
            { _id: req.decoded._id },
            {
                profile_img_key: data.key,
                profile_img: location, //s3 저장된 경로
            },
            {
                fields: { password: 0 },
                new: true,
            }
        );

        res.status(201).send({ message: "success", data: location });
    } catch (err) {
        console.log(err);
        return res.status(500).send("db Error");
    }
};
