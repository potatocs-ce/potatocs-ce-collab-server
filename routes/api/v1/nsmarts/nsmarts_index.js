const router = require('express').Router();
const multer = require('multer');

/*-----------------------------------

	Contollers

-----------------------------------*/
const companyMngmtCtrl = require('./company-mngmt/company_controller');
const nsProfileCtrl = require('./nsProfile/nsProfile_controller');
const adminMngmtCtrl = require('./admin-mngmt/admin_controller');
const countryMngmtCtrl = require('./country-mngmt/country_controller');



/*-----------------------------------

	** API **

-----------------------------------*/

/*-----------------------------------
	COMPANY API
-----------------------------------*/
router.get('/getCompanyList', companyMngmtCtrl.getCompanyList);
router.post('/addCompany', companyMngmtCtrl.addCompany);
router.get('/getCompanyInfo', companyMngmtCtrl.getCompanyInfo);
router.patch('/editCompany', companyMngmtCtrl.editCompany);
router.delete('/deleteCompany', companyMngmtCtrl.deleteCompany);

/*-----------------------------------
	PROFILE API
-----------------------------------*/
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
router.get('/profile', nsProfileCtrl.profile);
router.put('/profileChange', nsProfileCtrl.profileChange);
router.post('/profileImageChange', upload.any(), nsProfileCtrl.profileImageChange);


/*-----------------------------------
	ADMIN API
-----------------------------------*/
router.get('/getAdminList', adminMngmtCtrl.getAdminList); // admin list 가져오기
router.put('/connectAdminCompany', adminMngmtCtrl.connectAdminCompany); // admin과 company 연결시켜준다.
router.put('/disconnectAdminCompany', adminMngmtCtrl.disconnectAdminCompany); // admin과 company 연결을 끊어준다.

/*-----------------------------------
	HOLIDAY API
-----------------------------------*/
router.get('/getCountryList', countryMngmtCtrl.getCountryList); // country list 가져오기
router.get('/getCountryInfo', countryMngmtCtrl.getCountryInfo); // 나라 가져오기
router.post('/addCountry', countryMngmtCtrl.addCountry); // country 추가
router.delete('/deleteCountry', countryMngmtCtrl.deleteCountry); // country 추가
router.post('/addCountryHoliday', countryMngmtCtrl.addCountryHoliday); // country 공휴일 추가
router.post('/deleteCountryHoliday', countryMngmtCtrl.deleteCountryHoliday); // country 공휴일 삭제




module.exports = router;