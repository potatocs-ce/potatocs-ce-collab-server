const router = require('express').Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = global.AWS_S3.s3;
const bucket = global.AWS_S3.bucket;
/*-----------------------------------
	Contollers
-----------------------------------*/
const sideNavContoller = require('./side-nav/sideNav_controller');
const spaceController = require('./space/space_controller');
const docController = require('./doc/document_controller');
const wbController = require('./doc/wb_controller');
const mainController = require('./main/main_controller');

// Folder and Space Create
router.post('/create-folder', sideNavContoller.createFolder);
router.post('/create-space', sideNavContoller.createSpace);
router.delete('/deleteSpace', sideNavContoller.deleteSpace);	//
router.delete('/deleteFolder', sideNavContoller.deleteFolder);	//
router.get('/update-side-menu', sideNavContoller.updateSideMenu);
router.put('/update-space-place', sideNavContoller.updateSpacePlace);

// in Space
router.get('/space/:spaceTime', spaceController.getSpace);
router.put('/change-space-name', spaceController.changeSpaceName);
router.put('/change-space-brief', spaceController.changeSpaceBrief);
router.put('/delete-space-member', spaceController.deleteSpaceMember);
router.put('/quit-space-admin', spaceController.quitSpaceAdmin);
router.put('/add-space-member', spaceController.addSpaceAdmin);

//hokyun - 2022-08-16
router.put('/add-space-label', spaceController.addSpaceLabel);
router.put('/delete-space-label', spaceController.deleteSpaceLabel);
router.put('/edit-space-label', spaceController.editSpaceLabel);

// router.get('/getAllMember', spaceController.getAllMember);
router.get('/searchSpaceMember', spaceController.searchSpaceMember);
router.put('/inviteSpaceMember', spaceController.inviteSpaceMember);

// a document in Space
router.post('/space/doc/create', docController.createDoc);
router.get('/space/doc/getDocInfo', docController.getDocInfo);
router.put('/space/doc/update', docController.updateDoc);
router.delete('/space/doc/deleteDoc', docController.deleteDoc);
router.post('/space/doc/editDoc', docController.editDoc);
router.post('/space/doc/editDocDescription', docController.editDocDescription);
router.put('/space/doc/docEntryUpdate', docController.docEntryUpdate);
router.put('/space/doc/docLabelsUpdate', docController.docLabelsUpdate);
router.put('/space/doc/docCheckDone', docController.docCheckDone);

// const storage = multer.diskStorage({
// 	destination(req, file, cb) {
// 		cb(null, 'uploads/upload_file');
// 	},
// 	filename(req, file, cb) {
// 		// fileName = encodeURI(file.originalname);
// 		cb(null, `${Date.now()}_${file.originalname}`);

// 		// cb(null, `${file.originalname}`);
// 	}
// });
// const upload = multer({ storage });
// Multer Mime Type Validation
const upload = multer({
    storage: multerS3({
		s3,
		bucket,
		acl: 'public-read',
		contentType: multerS3.AUTO_CONTENT_TYPE,
		key: (req, file, cb) => {
			if (req.files && req.files.length > 0) {
				cb(null, `upload-file/${Date.now()}.${file.originalname}`);
			} else {
				// ������ ���� �ؽ�Ʈ�� ���� ���� ��� �Ѿ���ϴ���?? todo!!
			}
		}
    })
});

router.post('/space/doc/fileUpload',upload.any(), docController.fileUpload);
router.get('/space/doc/fileDownload', docController.fileDownload);
router.get('/space/doc/getUploadFileList', docController.getUploadFileList);

router.delete('/space/doc/deleteUploadFile', docController.deleteUploadFile);


// a chat in document
router.post('/space/doc/createChat', docController.createChat);
router.get('/space/doc/getChatInDoc', docController.getChatInDoc);
router.delete('/space/doc/deleteChat', docController.deleteChat);


// a meeting in document
router.post('/space/doc/createMeeting', docController.createMeeting);
router.get('/space/doc/getMeetingList', docController.getMeetingList);
router.delete('/space/doc/deleteMeeting', docController.deleteMeeting);
router.post('/space/doc/openMeeting', docController.openMeeting);
router.post('/space/doc/closeMeeting', docController.closeMeeting);

// scrumBoard
router.put('/space/doc/scrumEditDocStatus', docController.scrumEditDocStatus);
router.put('/space/doc/scrumEditStatusSequence', docController.scrumEditStatusSequence);
router.put('/space/doc/scrumAddDocStatus', docController.scrumAddDocStatus);
router.put('/space/doc/scrumDeleteDocStatus', docController.scrumDeleteDocStatus);
router.put('/space/doc/statusNameChange', docController.statusNameChange);
router.put('/space/doc/titleChange', docController.titleChange);


// main
router.get('/main/getMainInfo', mainController.getMainInfo); // 현재 안쓰이고 있음.. 22.04.08
// white board in document

/** 답변 파일(이미지) */
// const storage = multer.diskStorage({
// 	destination(req, file, cb) {
// 		// 원본 image (resize 전의 image)를 저장할 임시 folder -> /original
// 		// console.log('req check >>>', req);
// 		// console.log('*****', req.files);
// 		if (req.files[0].fieldname === 'recordingFile') {
// 			const destPath = req.app.locals.whiteBoardFolderPath;
// 			cb(null, destPath);
// 		} else {
// 			const destPath2 = path.join(req.app.locals.whiteBoardFolderPath, 'original');
// 			cb(null, destPath2);
// 		}
// 	},
// 	filename(req, file, cb) {
// 		cb(null, `${Date.now()}_${file.originalname}`);
// 	}
// });
// const upload = multer({ storage });
const storage = multer({
    storage: multerS3({
		s3,
		bucket,
		acl: 'public-read',
		contentType: multerS3.AUTO_CONTENT_TYPE,
		key: (req, file, cb) => {
			if (req.files && req.files.length > 0) {
				cb(null, `gstd-file/${Date.now()}.${file.originalname}`);
			} else {
				// ������ ���� �ؽ�Ʈ�� ���� ���� ��� �Ѿ���ϴ���?? todo!!
			}
		}
    })
});
router.post('/space/doc/saveGstdPath', storage.any(), wbController.saveGstdPath);
router.post('/space/doc/saveRecording', wbController.saveRecording);
router.post('/space/doc/getWhiteBoardRecList', wbController.getWhiteBoardRecList);
router.post('/space/doc/getRecording', wbController.getRecording);
router.get('/space/doc/downloadRecording', wbController.downloadRecording);
router.delete('/space/doc/deleteRecording', wbController.deleteRecording);


module.exports = router;