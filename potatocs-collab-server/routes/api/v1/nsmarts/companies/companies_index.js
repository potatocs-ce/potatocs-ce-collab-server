const router = require('express').Router();
const multer = require('multer');

/*-----------------------------------

  Contollers

-----------------------------------*/
const companies = require('./companies_controller');




/*-----------------------------------

  ** API **

-----------------------------------*/

/*-----------------------------------
  COMPANY API
-----------------------------------*/
router.get('/', companies.getCompanyList);
router.post('/', companies.addCompany);
router.get('/:id', companies.getCompanyInfo);
router.patch('/:id', companies.editCompany);
router.delete('/:id', companies.deleteCompany);



module.exports = router;