const router = require('express').Router();

/*-----------------------------------
  Contollers
-----------------------------------*/
const contractCtrl = require('./contract_controller');

/*-----------------------------------
  contract
-----------------------------------*/
router.get('/findOne', contractCtrl.fineOne);
router.get('/findAll', contractCtrl.findAll);
router.post('/create', contractCtrl.create);
router.patch('/update', contractCtrl.update);
router.delete('/delete', contractCtrl.delete);
module.exports = router;