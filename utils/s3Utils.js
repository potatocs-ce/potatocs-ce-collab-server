const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const sharp = require("sharp");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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
        'profile_img': ['.jpeg', '.jpg', '.png'],
        'face_img': [],
        'nsProfile_img': ['.jpeg', '.jpg', '.png']
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

// Multer 메모리 저장소 설정
// 이미지 리사이즈를 위해 메모리에 저장 -> 리사이즈 -> s3 저장으로 코드 수정
const memoryStorage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
});

const uploadMemory = multer({
    storage: memoryStorage,
    fileFilter: fileFilter,
});

/**
리사이즈 이미지
*/
const resizeAndUploadImage = async (req, res, next) => {
    try {
        req.uploadedImage = [];

        if (!req.files || req.files.length === 0) {
            return next();
        }

        for (const file of req.files) {
            const uploadPath = file.fieldname;

            const originalnameUtf8 = Buffer.from(file.originalname, "latin1").toString("utf8");

            // 파일이 이미지인지 확인
            if (!file.mimetype.startsWith("image/")) {
                throw new Error("Invalid file type. Only images are allowed for resizing.");
            }

            // 이미지 리사이즈
            const resizedImage = await sharp(file.buffer)
                .resize(300) // 가로 크기 300px로 리사이즈
                .toBuffer();

            // 리사이즈된 이미지 저장 경로 설정
            const filePath = `${uploadPath}/${Date.now().toString()}_${originalnameUtf8}`;

            // S3에 업로드
            await s3Client.send(
                new PutObjectCommand({
                    ACL: "public-read",
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: filePath,
                    Body: resizedImage,
                    ContentType: file.mimetype,
                    Metadata: {
                        fieldName: file.fieldname,
                    },
                })
            );

            // 업로드된 파일 정보를 req 객체에 저장
            req.uploadedImage.push({
                fieldname: file.fieldname,
                originalname: file.originalname,
                mimetype: file.mimetype,
                location: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`,
                key: filePath,
            });
        }
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send("Error processing file.");
    }
};

// face Detection 업로드 하는 부분
const faceImageUpload = async (req, res, next) => {
    try {
        console.log('req.data : ', req.data)

        const buffer = Buffer.from(req.data.detections, 'base64');

        await s3Client.send(
            new PutObjectCommand({
                ACL: "public-read",
                Bucket: process.env.AWS_S3_BUCKET,
                Key: 'face_img/' + req.data.filename,
                Body: buffer,
                ContentEncoding: 'base64', // required
                ContentType: 'image/jpeg', // required
            })
        );

        return {
            location: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${req.data.filename}`,
            Key: 'face_img/' + req.data.filename,
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Error processing file.");
    }
};

const getImageBase64FromS3 = async (req, res, next) => {
    try {
        console.log('req.data : ', req.data)

        const params = {
            Bucket: bucketName,
            Key: objectKey,
        };
        const data = await s3.getObject(params).promise();

        return data.Body.toString('base64');

    } catch (error) {
        console.error(error);
        res.status(500).send("Error processing file.");
    }
};

const uploadAny = upload.any();
const uploadImage = uploadMemory.any();


module.exports = {
    uploadAny,
    uploadImage,
    faceImageUpload,
    s3Client,
    resizeAndUploadImage,
    getImageBase64FromS3
};
