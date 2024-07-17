const router = require("express").Router();
const { uploadAny, resizeAndUploadImage } = require("../../../../../utils/s3Utils");

const profiles = require("./profiles_controller");

// 프로필 수정
router.patch("/", profiles.editProfile);
// 프로필 이미지 수정
router.post("/", (req, res, next) => {
    uploadAny(req, res, function (err) {
        if (err) {
            console.log('err :  ', err)
            return res.status(400).json({ error: err.message })
        }
        next()
    })
}, resizeAndUploadImage, profiles.editProfileImage);

module.exports = router;
