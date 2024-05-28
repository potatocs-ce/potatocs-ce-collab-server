const router = require("express").Router();
const multer = require("multer");
const { nsProfileUpload } = require("../../../../utils/s3Utils");
/*-----------------------------------

  Contollers

-----------------------------------*/
const companies = require("./companies/companies_index");
const nsProfileCtrl = require("./nsProfile/nsProfile_controller");
const admins = require("./admins/admins_index");
const countries = require("./countries/countries_index");
const holidays = require("./holidays/holidays_index");

const countryMngmtCtrl = require("./country-mngmt/country_controller");

/*-----------------------------------

  ** API **

-----------------------------------*/

/*-----------------------------------
  COMPANY API
-----------------------------------*/
router.use("/companies", companies);

/*-----------------------------------
  ADMIN API
-----------------------------------*/
router.use("/admins", admins);
/*-----------------------------------
  COUNTRIES API
-----------------------------------*/
router.use("/countries", countries);

/*-----------------------------------
  COUNTRIES API
-----------------------------------*/
router.use("/holidays", holidays);

/*-----------------------------------
  PROFILE API
-----------------------------------*/
/* Profile Image Update */
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, "uploads/nsProfile_img/temp");
    },
    filename(req, file, cb) {
        // fileName = encodeURI(file.originalname);
        cb(null, `${Date.now()}_${file.originalname}`);

        // cb(null, `${file.originalname}`);
    },
});
const upload = multer({ storage });
/* Profile */
router.get("/profile", nsProfileCtrl.profile);
router.patch("/profileChange", nsProfileCtrl.profileChange);
router.post("/profileImageChange", nsProfileUpload.single("file"), nsProfileCtrl.profileImageChange);

/*-----------------------------------
  HOLIDAY API
-----------------------------------*/
router.get("/getCountryList", countryMngmtCtrl.getCountryList); // country list 가져오기
router.get("/getCountryInfo", countryMngmtCtrl.getCountryInfo); // 나라 가져오기
router.post("/addCountry", countryMngmtCtrl.addCountry); // country 추가
router.delete("/deleteCountry", countryMngmtCtrl.deleteCountry); // country 추가
router.post("/addCountryHoliday", countryMngmtCtrl.addCountryHoliday); // country 공휴일 추가
router.post("/deleteCountryHoliday", countryMngmtCtrl.deleteCountryHoliday); // country 공휴일 삭제

module.exports = router;
