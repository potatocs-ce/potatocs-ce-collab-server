const router = require("express").Router();
const nsAuthController = require("./nsAuth_contoller");

/* Admin Sign Up */
router.post("/signUp", nsAuthController.signUp);
/* Admin Sign In */
router.post("/signIn", nsAuthController.signIn);
// /* Find password > Create a verification + Send an email  */
router.post("/getEcode", nsAuthController.getEcode);
// /* Find password > Create temp password + Send an email  */
router.put("/getTempPw", nsAuthController.getTempPw);
/* Admin Sign In */
router.post("/refreshToken", nsAuthController.refreshToken);

module.exports = router;
