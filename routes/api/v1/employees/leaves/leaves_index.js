const router = require("express").Router();
const requests = require("./requests/requests_index");
const status = require("./status/status_index");

/*-----------------------------------
  Contollers
-----------------------------------*/

router.use("/requests", requests);
router.use("/status", status);

module.exports = router;
