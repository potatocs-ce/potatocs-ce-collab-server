const router = require('express').Router();
const multer = require('multer');
const { profileUpload } = require("../../../../utils/s3Utils");

/*-----------------------------------
  ADMIN TOP TIER FOLDER
-----------------------------------*/

const leaves = require('./leaves/leaves_index')

/*-----------------------------------
  INDEXES
-----------------------------------*/
const employees = require('./employees/employees_index');

/*-----------------------------------
  Controller
-----------------------------------*/
const adProfileCtrl = require('./adProfile/adProfile_controller');



/*-----------------------------------
  API
-----------------------------------*/
router.use('/leaves', leaves);
router.use('/employees', employees);


/* Profile Image Update */
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
/* Profile */
router.get('/profile', adProfileCtrl.profile);
router.patch('/profileChange', adProfileCtrl.profileChange);
router.post("/profileImageChange", profileUpload.single("file"), adProfileCtrl.profileImageChange);


module.exports = router;