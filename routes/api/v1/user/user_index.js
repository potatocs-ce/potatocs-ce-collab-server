const router = require('express').Router();
const userController = require('./user_controller');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});


// #프로필 이미지 업데이트
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/profile_img/temp');
    },
    filename(req, file, cb) {
        // fileName = encodeURI(file.originalname);
        cb(null, `${Date.now()}_${file.originalname}`);

        // cb(null, `${file.originalname}`);
    }
});


const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_S3_BUCKET,
        metadata: function (req, file, cb) {
            console.log(file)
            cb(null, { fieldName: file.fieldName });
        },
        key: function (req, file, cb) {
            file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
            cb(null, `upload-file/${Date.now().toString()}.${file.originalname}`);
        },
    }),
});



// const upload = multer({ storage });
/* 유저정보  */
router.get('/profile', userController.profile);
router.put('/profileChange', userController.profileChange);
router.post('/profileImageChange', upload.any(), userController.profileImageChange);

router.post('/company-connections', userController.companyConnections)

module.exports = router;
