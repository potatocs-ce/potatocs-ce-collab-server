const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// 파일 확장자 검증 함수
const fileFilter = (req, file, cb) => {
    const uploadPath = file.fieldname;
    const extname = path.extname(file.originalname).toLowerCase();

    // 예시: 경로에 따른 허용 확장자 설정
    const allowedExtensions = {
        'upload-file': [], // 모든 확장자를 허용하기 위해 빈 배열,
        'recording': [],
        'profile_img': [],
        'face_img': [],
        'nsProfile_img': []
    };

    const allowedExts = allowedExtensions[uploadPath];

    // 모든 확장자 허용
    if (allowedExts && allowedExts.length === 0) {
        cb(null, true);
    } else if (allowedExts && allowedExts.includes(extname)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed for the path: ${uploadPath}`), false);
    }
};

const storage = multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");

        const filePath = `${file.fieldname}/${Date.now().toString()}_${file.originalname}`;

        cb(null, filePath);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

const nsProfileUpload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, "uploads/nsProfile_img/temp");
        },
        fileFilter: function (req, file, cb) {
            const allowedMimes = ["image/jpeg", "image/png"];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error("Invalid file type. Only JPEG and PNG are allowed."));
            }
        },
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
    }),
});


const uploadAny = upload.any();

module.exports = {
    uploadAny,
    nsProfileUpload,
};
