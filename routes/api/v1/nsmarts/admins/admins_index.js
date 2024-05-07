const router = require('express').Router();

/*-----------------------------------

  Contollers

-----------------------------------*/
const admins = require('./admins_controller');




/*-----------------------------------

  ** API **

-----------------------------------*/

/*-----------------------------------
  COMPANY API
-----------------------------------*/
router.get('/', admins.getAdminList);
router.patch('/connectAdminCompany', admins.connectAdminCompany);

// router.post('/', admins.addCompany);
// router.get('/:id', admins.getCompanyInfo);
// router.patch('/:id', admins.editCompany);
// router.delete('/:id', admins.deleteCompany);



module.exports = router;