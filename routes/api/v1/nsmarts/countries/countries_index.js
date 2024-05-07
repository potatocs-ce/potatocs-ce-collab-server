const router = require('express').Router();
const multer = require('multer');

/*-----------------------------------

  Contollers

-----------------------------------*/
const countries = require('./countries_controller');




/*-----------------------------------

  ** API **

-----------------------------------*/

/*-----------------------------------
  COMPANY API
-----------------------------------*/
router.get('/', countries.getCountryList);
router.post('/', countries.addCountry);
// router.get('/:id', countries.getCompanyInfo);
// router.patch('/:id', countries.editCompany);
router.delete('/:id', countries.deleteCountry);



module.exports = router;