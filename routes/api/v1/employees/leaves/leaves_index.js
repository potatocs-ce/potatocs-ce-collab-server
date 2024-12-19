const router = require("express").Router();
const requests = require("./requests/requests_index");

/*-----------------------------------
  Contollers
-----------------------------------*/

router.use("/requests", requests);

module.exports = router;
