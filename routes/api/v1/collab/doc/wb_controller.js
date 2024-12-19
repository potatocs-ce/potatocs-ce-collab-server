const fs = require("fs");
const { GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../../../../utils/s3Utils");

exports.saveGstdPath = async (req, res) => {
    console.log(`
--------------------------------------------------
  API  : white board recording
  router.post('/saveGstdPath', controller.saveGstdPath)
  user: ${req.decoded._id}
--------------------------------------------------`);
    const data = req.files[0];
    try {
        // 들어오면 안됨...
        // if (!req.files[0].location) {
        // 	return res.status(500).send('internal error');
        // }

        return res.status(200).send({
            gstd_key: req.files[0].key,
        });
    } catch (err) {
        console.log("An error uploading a recording file: ", err);
        return res.status(500).send("Internal Error");
    }
};

exports.saveRecording = async (req, res) => {
    console.log(`
--------------------------------------------------
  API  : save recording data
  router.post('/saveRecording', controller.saveRecording)
  user: ${req.decoded._id}
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const criteria = {
            docId: req.body.docId,
            recordingTitle: req.body.recordingTitle,
            gstd_key: req.body.gstd_key,
            creator: req.decoded._id,
        };

        const whiteBoard = dbModels.WhiteBoard(criteria);

        await whiteBoard.save();

        return res.send({
            message: "saved",
        });
    } catch (err) {
        console.log("An error uploading a recording file: ", err);
        return res.status(500).send("Internal Error");
    }
};

exports.getWhiteBoardRecList = async (req, res) => {
    console.log(`
--------------------------------------------------
  API  : get white board rec list
  router.post('/getWhiteBoardRecList', controller.getWhiteBoardRecList)
  user : ${req.decoded._id}
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;

    try {
        const recList = await dbModels.WhiteBoard.find(req.body).populate("creator", "name");

        if (!recList) {
            return res.status(500).send({
                message: "non",
            });
        }

        return res.send({
            message: "loaded",
            recList,
        });
    } catch (err) {
        console.log("getWhiteBoardRecList error");
        return res.status(500).send("Internal Error");
    }
};

exports.deleteRecording = async (req, res) => {
    console.log(`
--------------------------------------------------
  API  : delete rec data
  router.post('/deleteRecording', controller.deleteRecording)
  user : ${req.decoded._id}
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        // const recFilePath = path.join(req.app.locals.whiteBoardFolderPath, req.query.fileName);

        // await removeFile(recFilePath);

        const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: req.query.gstd_key,
        });

        await s3Client.send(command);

        await dbModels.WhiteBoard.findOneAndDelete({ _id: req.query._id });

        return res.send({
            message: "deleted",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        return res.status(500).send("An Error at deleteRecording");
    }
};

function removeFile(fullPath) {
    fs.unlink(fullPath, (err) => {
        if (err) {
            console.error(err);
        }
    });
}

exports.getRecording = async (req, res) => {
    console.log(`
--------------------------------------------------
  API  : get rec data
  router.post('/getRecording', controller.getRecording)
  user : ${req.decoded._id}
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: req.body.gstd_key,
        });
        const response = await s3Client.send(command);
        res.attachment(req.body.gstd_key);
        response.Body.pipe(res);
    } catch (err) {
        console.log("", err);
        return res.status(500).send("An Error at getRecording");
    }
};

exports.downloadRecording = async (req, res) => {
    console.log(`
--------------------------------------------------
  API  : download rec data
  router.get('/downloadRecording', controller.downloadRecording)
  user : ${req.decoded._id}
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.query;

    try {
        const donloadFile = await dbModels.WhiteBoard.findOne({
            _id: data._id,
        }).lean();
        const key = donloadFile.gstd_key;

        res.attachment(key);
        res.setHeader("Content-Disposition", "attachment");
        // var file = s3.getObject({
        //   Bucket: bucket,
        //   Key: key
        // }).createReadStream()
        //   .on("error", error => {
        //   });
        // file.pipe(res);
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
        });

        const response = await s3Client.send(command);
        res.attachment(key);

        response.Body.pipe(res);
    } catch (err) {
        console.log("[ ERROR ]", err);
        return res.status(500).send({
            message: "download upload file Error",
        });
    }
};
