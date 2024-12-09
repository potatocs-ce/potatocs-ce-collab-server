const router = require('express').Router();
const multer = require('multer');

/*-----------------------------------

  Contollers

-----------------------------------*/
const holidays = require('./holidays_controller');




/*-----------------------------------

  ** API **

-----------------------------------*/

/*-----------------------------------
  COMPANY API
-----------------------------------*/
router.get('/', holidays.getHolidayList);
router.post('/', holidays.addHoliday);
router.delete('/:id', holidays.deleteHoliday);

// router.get('/:id', countries.getCompanyInfo);
// router.patch('/:id', countries.editCompany);



module.exports = router;