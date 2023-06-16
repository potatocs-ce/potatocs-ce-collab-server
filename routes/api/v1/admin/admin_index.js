const router = require('express').Router();
const multer = require('multer');

/*-----------------------------------
	ADMIN TOP TIER FOLDER
-----------------------------------*/

/*-----------------------------------
	INDEXES
-----------------------------------*/
const leave = require('./leave/leave_index');

/*-----------------------------------
	Controller
-----------------------------------*/
const adProfileCtrl = require('./adProfile/adProfile_controller');



/*-----------------------------------
	API
-----------------------------------*/
router.use('/leave', leave);



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
router.put('/profileChange', adProfileCtrl.profileChange);
router.post('/profileImageChange', upload.any(), adProfileCtrl.profileImageChange);


module.exports = router;