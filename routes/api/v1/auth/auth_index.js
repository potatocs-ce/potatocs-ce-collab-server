const router = require('express').Router();
const authController = require('./auth_controller');

/* 회원가입  */
router.post('/signUp', authController.signUp);
/* 로그인  */
router.post('/signIn', authController.signIn);
/* Find password > Create a verification + Send an email  */
router.post('/getEcode', authController.getEcode);
/* Find password > Create temp password + Send an email  */
router.put('/getTempPw', authController.getTempPw);




module.exports = router;
