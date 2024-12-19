const router = require("express").Router();
const contractsController = require("./contracts_controller");
const { uploadContract } = require("../../../../../utils/s3Utils");

/*-----------------------------------
  Admin Controller
    admin contract list 페이지
-----------------------------------*/
router.get("/getContractList", contractsController.getContractList);
router.get("/getEmployeeList", contractsController.getEmployeeList);
router.get("/searchContractor", contractsController.searchContractor);
router.post("/saveContract", uploadContract.single("file"), contractsController.saveContract);
router.get("/getContractInfo", contractsController.getContractInfo);
router.get("/getPdfFile", contractsController.getPdfFile);
router.post("/signContract", contractsController.signContract);
router.post("/rejectContract", contractsController.rejectContract);
router.get("/getContractListSearch", contractsController.getContractListSearch);
router.get("/getSignInfo", contractsController.getSignInfo);

module.exports = router;
