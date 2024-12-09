const router = require("express").Router();
const documentsController = require("./documents_controller");
const { uploadContract } = require('../../../../utils/s3Utils');



router.post("/", uploadContract.single('file'), documentsController.uploadDocument);


module.exports = router;
