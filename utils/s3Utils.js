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

/**
 * profile 이미지는 서버 저장소에
 * 임시로 저장한다음 sharp 라이브러리를 통해
 * 이미지를 리사이징 후
 * 임시로 저장된 이미지파일 삭제
 * 리사이징된 이미지를 업로드한다.
 */
const profileUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, "uploads/profile_img/temp");
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

/**
 * contract 계약서 관련
 * 바로 S3에 업로드를 하면 안되고 
 * 해시값을 추출해야기 때문에
 * 웹 서버 경로에다 임시 저장 후 삭제
 */
const uploadContract = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'uploads/contract/temp');
    },
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    filename: function (req, file, cb) {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, `/${Date.now().toString()}-${file.originalname}`);
    },
  })
});


module.exports = {
  profileUpload,
  nsProfileUpload,
  s3Client,
  uploadContract
};
