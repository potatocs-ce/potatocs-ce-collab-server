const router = require('express').Router();
const userController = require('./user_controller');
const multer = require('multer');

// 프로필 이미지 업데이트
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
const upload = multer({ storage });
/* 유저정보  */
router.get('/profile', userController.profile);
router.put('/profileChange', userController.profileChange);
router.post('/profileImageChange', upload.any(), userController.profileImageChange);

module.exports = router;
