const { ObjectId } = require("bson");
const path = require("path");
const fs = require("fs");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../../../../utils/s3Utils");
// const s3 = global.AWS_S3.s3;
// const bucket = global.AWS_S3.bucket;

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
		console.log(req.files[0]);

		return res.status(500).send({
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
	// console.log(req.body);
	try {
		const criteria = {
			docId: req.body.docId,
			recordingTitle: req.body.recordingTitle,
			gstd_key: req.body.gstd_key,
			creator: req.decoded._id,
		};

		console.log(criteria);

		const whiteBoard = dbModels.WhiteBoard(criteria);
		// console.log(uploadFile);
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

		console.log(recList);

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
	// console.log(req.query);
	try {
		// const recFilePath = path.join(req.app.locals.whiteBoardFolderPath, req.query.fileName);

		// await removeFile(recFilePath);

		const params = {
			Bucket: bucket,
			Key: req.query.gstd_key,
		};
		s3.deleteObject(params, function (err, data) {
			if (err) console.log(err, err.stack);
			else console.log("s3 delete Success");
		});

		await dbModels.WhiteBoard.findOneAndDelete({ _id: req.query._id });

		return res.send({
			message: "deleted",
		});
	} catch (err) {
		console.log("", err);
		return res.status(500).send("An Error at deleteRecording");
	}
};

function removeFile(fullPath) {
	// console.log(fullPath);
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
	console.log("req.body", req.body);
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
	// console.log(data);
	try {
		const donloadFile = await dbModels.WhiteBoard.findOne({
			_id: data._id,
		}).lean();
		const key = donloadFile.gstd_key;
		// console.log(key)
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
		console.log(err);
		console.log("[ ERROR ]", err);
		return res.status(500).send({
			message: "download upload file Error",
		});
	}
};
