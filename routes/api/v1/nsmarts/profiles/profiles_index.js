const router = require("express").Router();
const { nsProfileUpload } = require("../../../../../utils/s3Utils");

const profiles = require("./profiles_controller");

// 프로필 수정
router.patch("/", profiles.editProfile);
// 프로필 이미지 수정
router.post("/", nsProfileUpload.single("file"), profiles.editProfileImage);

module.exports = router;
