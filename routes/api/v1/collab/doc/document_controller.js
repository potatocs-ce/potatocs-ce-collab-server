const { ObjectId } = require('bson');

var fs = require("fs");
var path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const s3 = global.AWS_S3.s3;
const bucket = global.AWS_S3.bucket;


exports.createDoc = async (req, res) => {
  console.log("멤버아디", req.body.memberId);
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : create a document
  router.post(/doc/create', docController.createDoc);
  data: ${req.body.spaceTime}, ${req.body.editorTitle},
  ${req.body.docContent}, ${req.body.status}
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  //console.log("크리에이터",req.body.usrData._id);

  try {
    const primaryColor = "#" + Math.round(Math.random() * 0xffffff).toString(16);
    const secondaryColor = primaryColor.concat('60');

    const color = {
      primary: primaryColor,
      secondary: secondaryColor
    }

    const criteria = {
      spaceTime_id: req.body.spaceTime,
      docTitle: req.body.editorTitle,
      docDescription: '',
      docContent: req.body.docContent,
      status: req.body.status,
      creator: req.body.memberId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      color: color,
    }

    const doc = dbModels.Document(criteria);

    await doc.save();


    // scrumBoard////////////////////////////
    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: req.body.spaceTime
      },
    )
    console.log(scrumBoard);

    const scrumCriteria = {
      doc_id: doc._id,
      creator: doc.creator,
      docTitle: doc.docTitle,
      startDate: doc.startDate,
      endDate: doc.endDate,
      color: doc.color,


      done: doc.done,


      docDescription: '',
    }

    for (let index = 0; index < scrumBoard.scrum.length; index++) {
      const element = scrumBoard.scrum[index].label;

      if (element == req.body.status) {
        scrumBoard.scrum[index].children.push(scrumCriteria);
      }
    }
    console.log(scrumBoard);

    await scrumBoard.save();
    // scrumBoard//////////////////////////////

    //////  mySpaceHistory  ////////
    const spaceId = await dbModels.Space.findOne(
      {
        _id: req.body.spaceTime,
      }
    )
    console.log(inviteSpaceMember);
    console.log(memberName);
    const mySpaceHistory = await dbModels.MySpaceHistory(
      {
        space_id: spaceId._id,
        // 1 이면 스페이스, 2 면 도큐먼트
        doc_id: doc._id,
        type: 2,

        content: doc.docTitle + ' 문서가 생성되었습니다.'
      }
    )

    await mySpaceHistory.save();
    //////////////////////////////////////

    return res.status(200).send({
      message: 'created',
      scrumBoard,
    })

  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'loadUpateMenu Error'
    })
  }

}

exports.updateDoc = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Update a document
  router.put('/doc/update', docController.updateDoc);
  data: ${JSON.stringify(req.body)}
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;

  try {

    const matchCriteria = {
      _id: req.body._id
    }

    const updateData = {
      docTitle: req.body.docTitle,
      docContent: req.body.docContent,
      status: req.body.status,
    }

    const updatedDoc = await dbModels.Document.findOneAndUpdate(matchCriteria, updateData);

    if (!updatedDoc) {
      return res.status(404).send('updating a document has failed');
    }

    // scrumboard////////////////
    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: updatedDoc.spaceTime_id
      }
    )
    // console.log(scrumBoard);
    let temp;
    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const docs = scrumBoard.scrum[i].children;

      for (let j = 0; j < docs.length; j++) {
        const doc_id = docs[j].doc_id;

        if (doc_id == req.body._id) {
          scrumBoard.scrum[i].children[j].docTitle = req.body.docTitle;
          temp = scrumBoard.scrum[i].children[j]
          scrumBoard.scrum[i].children.splice(j, 1);
        }
      }
    }

    for (let index = 0; index < scrumBoard.scrum.length; index++) {
      const element = scrumBoard.scrum[index].label;
      if (element == req.body.status) {
        scrumBoard.scrum[index].children.splice(0, 0, temp);
      }
    }

    // console.log(temp);
    // console.log(scrumBoard);

    await scrumBoard.save();
    // scrumboard////////////////


    // console.log(updatedDoc);

    return res.status(200).send({
      message: 'updated',
    })

  } catch (err) {
    console.log('[[ ERROR ]]', err);
    res.status(500).send({
      message: 'updating the doc error'
    });
  }

}

//#park
//doc
exports.docCheckDone = async (req, res) => {
  console.log(`
	--------------------------------------------------
	  User : ${req.decoded._id}
	  API  : Update a documentEntry
	  router.put('/doc/docEntryUpdate', docController.docEntryUpdate);
	  data: ${JSON.stringify(req.body)}
	--------------------------------------------------`);

  const dbModels = global.DB_MODELS;

  try {
    const updateData = {
      done: req.body.done
    }

    const matchCriteria = {
      _id: req.body.doc_id
    }

    const updatedDoc = await dbModels.Document.findOneAndUpdate(matchCriteria, updateData);

    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: updatedDoc.spaceTime_id
      }
    )

    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const docs = scrumBoard.scrum[i].children;

      for (let j = 0; j < docs.length; j++) {
        const doc_id = docs[j].doc_id;
        if (doc_id == req.body.doc_id) {
          scrumBoard.scrum[i].children[j].done = req.body.done;
        }
      }
    }

    await scrumBoard.save();

    const updateDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: updatedDoc.spaceTime_id
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            creator_id: '$creator'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$creator_id']
                }
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'creator'
        },
      },
      {
        $project: {
          docTitle: 1,
          docContent: 1,
          spaceTime_id: 1,
          status: 1,
          creator: '$creator.name',
          creator_id: '$creator._id',
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          color: 1,
        }
      }
    ]);

    return res.status(200).send({
      message: 'updated',
      scrumBoard,
      updateDocs
    })
  } catch (err) {
    console.log('[[ ERROR ]]', err);
    res.status(500).send({
      message: 'updating the doc error'
    });
  }
}
exports.docEntryUpdate = async (req, res) => {
  console.log(`
	--------------------------------------------------
	  User : ${req.decoded._id}
	  API  : Update a documentEntry
	  router.put('/doc/docEntryUpdate', docController.docEntryUpdate);
	  data: ${JSON.stringify(req.body)}
	--------------------------------------------------`);

  const dbModels = global.DB_MODELS;

  try {
    const updateData = {
      creator: req.body._id
    }


    const matchCriteria = {
      _id: req.body.doc_id
    }



    const updatedDoc = await dbModels.Document.findOneAndUpdate(matchCriteria, updateData);

    // scrumboard////////////////
    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: updatedDoc.spaceTime_id
      }
    )

    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const docs = scrumBoard.scrum[i].children;

      for (let j = 0; j < docs.length; j++) {
        const doc_id = docs[j].doc_id;

        if (doc_id == req.body.doc_id) {

          scrumBoard.scrum[i].children[j].creator = req.body._id;
        }
      }
    }

    await scrumBoard.save();

    const updateDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: updatedDoc.spaceTime_id
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            creator_id: '$creator'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$creator_id']
                }
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'creator'
        },
      },
      {
        $project: {
          docTitle: 1,
          docContent: 1,
          spaceTime_id: 1,
          status: 1,
          creator: '$creator.name',
          creator_id: '$creator._id',
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          color: 1
        }
      }
    ]);

    return res.status(200).send({
      message: 'updated',
      scrumBoard,
      updateDocs
    })

  } catch (err) {
    console.log('[[ ERROR ]]', err);
    res.status(500).send({
      message: 'updating the doc error'
    });
  }


}


exports.docLabelsUpdate = async (req, res) => {
  console.log(`
	--------------------------------------------------
	  User : ${req.decoded._id}
	  API  : Update a documentEntry
	  router.put('/doc/docEntryUpdate', docController.docEntryUpdate);
	  data: ${JSON.stringify(req.body)}
	--------------------------------------------------`);

  const dbModels = global.DB_MODELS;

  try {
    const updateData = {
      labels: req.body._id
    }


    const matchCriteria = {
      _id: req.body.doc_id
    }



    const updatedDoc = await dbModels.Document.findOneAndUpdate(matchCriteria, updateData);

    // scrumboard////////////////
    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: updatedDoc.spaceTime_id
      }
    )

    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const docs = scrumBoard.scrum[i].children;

      for (let j = 0; j < docs.length; j++) {
        const doc_id = docs[j].doc_id;

        if (doc_id == req.body.doc_id) {

          scrumBoard.scrum[i].children[j].labels = req.body._id;
        }
      }
    }

    await scrumBoard.save();

    const updateDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: updatedDoc.spaceTime_id
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            creator_id: '$creator'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$creator_id']
                }
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'creator'
        },
      },
      {
        $project: {
          docTitle: 1,
          docContent: 1,
          spaceTime_id: 1,
          status: 1,
          creator: '$creator.name',
          creator_id: '$creator._id',
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          color: 1,
          labels: 1
        }
      }
    ]);

    return res.status(200).send({
      message: 'updated',
      scrumBoard,
      updateDocs
    })

  } catch (err) {
    console.log('[[ ERROR ]]', err);
    res.status(500).send({
      message: 'updating the doc error'
    });
  }


}

exports.getDocInfo = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Update my folder, space
  router.get(/doc/getInfo', docController.getInfo);
  data: ${req.query.docId}
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;


  try {

    const criteria = {
      _id: ObjectId(req.query.docId)
    }

    const docInfo = await dbModels.Document.aggregate([
      {
        $match: criteria
      },
      {
        $lookup: {
          from: 'spaces',
          let: {
            spaceTime_id: '$spaceTime_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$spaceTime_id']
                }
              }
            },
            {
              $project: {
                displayName: 1,
                admins: 1,
              }
            }
          ],
          as: 'spaceDisplayName'
        },
      },
      {
        $unwind: {
          path: '$spaceDisplayName',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          spaceTime_id: 1,
          docTitle: 1,
          docDescription: 1,
          docContent: 1,
          status: 1,
          // spaceTime_id: 1,
          isSpaceAdmin: '$spaceDisplayName.admins',
          displayName: '$spaceDisplayName.displayName',
          startDate: 1,
          endDate: 1,

        }
      }
    ]);
    console.log(docInfo[0])
    // space 관리자인지 확인하는 작업 -> 이걸로 문서 삭제 권한 주고안주고
    let isAdmin
    for (let index = 0; index < docInfo[0].isSpaceAdmin.length; index++) {
      const element = docInfo[0].isSpaceAdmin[index];
      if (element == req.decoded._id) {
        isAdmin = true;
        break;
      }
      else {
        isAdmin = false;
      }
    }

    docInfo[0].isSpaceAdmin = isAdmin
    // console.log(docInfo[0]);


    return res.status(200).send({
      message: 'getDocInfo',
      docInfo: docInfo[0]
    });


  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'getting the doc info error'
    });
  }

}

exports.deleteDoc = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete doc
  router.delete('/space/doc/delete', docController.deleteDoc);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.query
  console.log(data);
  // console.log(data.docId);
  try {
    // 파일이 있는 문서 아이디 가져오기
    // const findDocUploadFile = await dbModels.UploadFile.find(
    // 	{
    // 		doc_id: data.docId
    // 	}
    // )

    // 업로드된 파일 제거
    // for (let index = 0; index < findDocUploadFile.length; index++) {
    // 	const element = findDocUploadFile[index].filename;
    // 	// console.log(element);
    // 	// await unlinkAsync('uploads/upload_file/' + element);
    // }



    // 업로드 파일 디비에서 제거
    const deleteUploadFile = await dbModels.UploadFile.deleteMany(
      {
        doc_id: data.docId
      }
    )

    // 채팅 제거
    const deleteChat = await dbModels.Chat.deleteMany(
      {
        docId: data.docId
      }
    )

    // 미팅 제거
    // 22.04.08 미팅은 space로 이동되어 doc 을 지운다고 지워지지 않음
    // const deleteMeeting = await dbModels.Meeting.deleteMany(
    // 	{
    // 		docId : data.docId
    // 	}
    // )
    // 문서 디비에서 제거
    const deleteDoc = await dbModels.Document.findOneAndDelete(
      {
        _id: data.docId
      }
    )
    // console.log(deleteDoc);
    //////  mySpaceHistory  ////////
    const spaceId = await dbModels.Space.findOne(
      {
        _id: deleteDoc.spaceTime_id,
      }
    )
    // console.log(inviteSpaceMember);
    // console.log(memberName);
    // const mySpaceHistory = await dbModels.MySpaceHistory(
    // 	{
    // 		space_id: spaceId._id,
    // 		// 1 이면 스페이스, 2 면 도큐먼트

    // 		type: 1,

    // 		content: deleteDoc.docTitle + ' 문서가 삭제되었습니다.'
    // 	}
    // )

    // await mySpaceHistory.save();
    //////////////////////////////////////

    // scrumboard////////////////
    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: deleteDoc.spaceTime_id,
      }
    )

    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const docs = scrumBoard.scrum[i].children;

      for (let j = 0; j < docs.length; j++) {
        const doc_id = docs[j].doc_id;

        if (doc_id == data.docId) {
          scrumBoard.scrum[i].children.splice(j, 1);
        }
      }
    }
    await scrumBoard.save();

    const spaceDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: ObjectId(spaceId._id)

        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            creator_id: '$creator'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$creator_id']
                }
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'creator'
        },

      },
      // {
      // 	$unwind: {
      // 		path: '$creator',
      // 		preserveNullAndEmptyArrays: true
      // 	}
      // },
      {
        $project: {
          docTitle: 1,
          docContent: 1,
          spaceTime_id: 1,
          status: 1,
          creator: '$creator.name',
          creator_id: '$creator._id',
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          color: 1,
        }
      }
    ]);



    return res.status(200).send({
      message: 'delete doc and upload file',
      spaceDocs,
      scrumBoard
    })

  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'delete doc Error'
    })
  }

}


exports.editDoc = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : edit doc
  router.post('/space/doc/edit', docController.editDoc);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);
  try {

    const docInfo = await dbModels.Document.findOneAndUpdate(
      {
        _id: data._id
      },
      {
        docTitle: data.docTitle,
        startDate: data.startDate,
        endDate: data.endDate
      },
    )

    // scrumboard//////////////////////
    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: docInfo.spaceTime_id
      }
    )

    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const docs = scrumBoard.scrum[i].children;

      for (let j = 0; j < docs.length; j++) {
        const doc_id = docs[j].doc_id;

        if (doc_id == data._id) {
          scrumBoard.scrum[i].children[j].docTitle = data.docTitle;
          scrumBoard.scrum[i].children[j].startDate = data.startDate;
          scrumBoard.scrum[i].children[j].endDate = data.endDate;
        }
      }
    }

    await scrumBoard.save();
    console.log(scrumBoard);
    // scrumboard//////////////////////


    const spaceDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: ObjectId(docInfo.spaceTime_id)

        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            creator_id: '$creator'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$creator_id']
                }
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'creator'
        },

      },
      // {
      // 	$unwind: {
      // 		path: '$creator',
      // 		preserveNullAndEmptyArrays: true
      // 	}
      // },
      {
        $project: {
          docTitle: 1,
          docContent: 1,
          spaceTime_id: 1,
          status: 1,
          creator: '$creator.name',
          creator_id: '$creator._id',
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          color: 1,

        }
      }
    ]);

    return res.status(200).send({
      message: 'edit doc',
      spaceDocs,
      scrumBoard
    })

  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'edit doc Error'
    })
  }
}

exports.editDocDescription = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : edit document description
  router.post('/space/doc/editDocDescription', docController.editDocDescription);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body
  console.log(data);

  try {

    const document = await dbModels.Document.findOneAndUpdate(
      {
        _id: data.docId
      },
      {
        docDescription: data.docDescription
      }
    )

    return res.status(200).send({
      message: 'edit document description',

    });

  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'Edit document description Error'
    });
  }

}


exports.getUploadFileList = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : get upload file list
  router.get('/space/doc/getUploadFileList', docController.getUploadFileList);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.query.docId
  // console.log(data);

  try {
    // const criteria = {
    // 	doc_id: req.query.docId
    // }
    // const findFileList = await dbModels.UploadFile.find(criteria);
    const findFileList = await dbModels.UploadFile.aggregate([
      {
        $match: {
          doc_id: ObjectId(req.query.docId)
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'creator',
          foreignField: '_id',
          as: 'name'
        }
      },
      {
        $unwind: {
          path: '$name',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          doc_id: 1,
          originalname: 1,
          destination: 1,
          filename: 1,
          path: 1,
          fileType: 1,
          creator: '$name.name',
          createdAt: 1,
          description: 1,

        }
      }
    ]);
    // console.log(findFileList);

    return res.status(200).send({
      message: 'get upload file list',
      findFileList
    })

  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'loadUpateMenu Error'
    })
  }

}



exports.fileUpload = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : File upload
  router.post('/space/doc/fileUpload', docController.fileUpload);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.files[0];
  console.log(req.body);
  try {
    const criteria = {
      doc_id: req.body.docId,
      description: req.body.description,
      originalname: data.originalname,
      // destination: data.destination,
      // filename: data.filename,
      key: data.key,
      fileType: data.mimetype,
      creator: req.decoded._id
    }

    const uploadFile = dbModels.UploadFile(criteria);
    // console.log(uploadFile);
    await uploadFile.save();

    // sendData = data.filename;

    return res.status(200).send({
      message: 'filesend',
      uploadFile
    })

  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'loadUpateMenu Error'
    })
  }

}

exports.fileDownload = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : fileDownload
  router.get('/space/doc/fileDownload', docController.fileDownload);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.query
  // console.log(data);
  try {
    const donloadFile = await dbModels.UploadFile.findOne(
      {
        _id: data.fileId
      }
    ).then((result) => {
      const key = result.key;
      console.log(key)
      // res.attachment(key);
      res.setHeader('Content-Disposition', 'attachment');
      var file = s3.getObject({
        Bucket: bucket,
        Key: key
      }).createReadStream()
        .on("error", error => {
        });
      file.pipe(res);
    })
    // return res.status(200).send({
    // 	message: 'download uploaded file',
    // });

  } catch (err) {
    console.log(err)
    console.log('[ ERROR ]', err);
    return res.status(500).send({
      message: 'download upload file Error'
    })
  }


}

exports.deleteUploadFile = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Upload File
  router.delete('/space/doc/deleteUploadFile', docController.deleteUploadFile);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.query
  try {
    const result = await dbModels.UploadFile.findOne({ _id: data.fileId }, { _id: false, key: true })
    const params = {
      Bucket: bucket,
      Key: result.key
    };
    s3.deleteObject(params, function (err, data) {
      if (err) console.log(err, err.stack);
      else console.log('s3 delete Success');
    })
    const deleteUploadFile = await dbModels.UploadFile.findOneAndDelete(
      {
        _id: data.fileId
      }
    )
    // console.log(deleteUploadFile);


    // await unlinkAsync('uploads/upload_file/' + data._id);	

    return res.status(200).send({
      message: 'upload file delete',
    });

  } catch (err) {
    console.log(err)
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'delete upload file Error'
    })
  }

}



/// a chat in document

exports.createChat = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Upload File
  router.post('/space/doc/createChat', docController.createChat);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body
  // console.log(data);
  try {

    const chat = dbModels.Chat(
      {
        docId: data.docId,
        chatMember: req.decoded._id,
        chatContent: data.chatContent,
        isDialog: data.isDialog,
        reply: data.replyChatId
      }
    );

    // console.log(chat);
    await chat.save();

    return res.status(200).send({
      message: 'create chat',
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'create chat Error'
    })
  }

}



exports.getChatInDoc = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Chat 
  router.get('/space/doc/getChatInDoc', docController.getChatInDoc);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.query
  console.log(data);
  try {
    let getChatInDoc;
    if (data.from == 'document') {
      getChatInDoc = await dbModels.Chat.aggregate([
        {
          $match: {
            docId: ObjectId(data.docId)
          }
        },
        {
          $lookup: {
            from: 'members',
            localField: 'chatMember',
            foreignField: '_id',
            as: 'member'
          }
        },
        {
          $lookup: {
            from: 'chats',
            localField: 'reply',
            foreignField: '_id',
            as: 'replyChat'
          }
        },
        {
          $unwind: {
            path: '$member',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$replyChat',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            docId: 1,
            chatMember: '$member.name',
            chatMemberId: '$member._id',
            chatContent: 1,
            isDialog: 1,
            replyId: '$replyChat._id',
            replyContent: '$replyChat.chatContent',
            createdAt: 1,
          }
        },
      ]);
    }
    else if (data.from == 'scrum') {
      getChatInDoc = await dbModels.Chat.aggregate([
        {
          $match: {
            docId: ObjectId(data.docId)
          }
        },
        {
          $lookup: {
            from: 'members',
            localField: 'chatMember',
            foreignField: '_id',
            as: 'member'
          }
        },
        {
          $lookup: {
            from: 'chats',
            localField: 'reply',
            foreignField: '_id',
            as: 'replyChat'
          }
        },
        {
          $unwind: {
            path: '$member',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$replyChat',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            docId: 1,
            chatMember: '$member.name',
            chatMemberId: '$member._id',
            chatContent: 1,
            isDialog: 1,
            replyId: '$replyChat._id',
            replyContent: '$replyChat.chatContent',
            createdAt: 1,
          }
        },
        {
          $sort: {
            createdAt: -1
          }
        }
      ]);
    }



    // console.log(getChatInDoc);

    return res.status(200).send({
      message: 'get chat in doc',
      getChatInDoc
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'get chat in doc Error'
    })
  }

}

exports.deleteChat = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Upload File
  router.delete('/space/doc/deleteChat', docController.deleteChat);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.query
  // console.log(data);

  try {

    // 답글이 있는지를 확인
    const findReply = await dbModels.Chat.find(
      {
        reply: data.chatId
      }
    )
    // console.log(findReply);

    // 답글이 없다면 삭제 / 답글이 있다면 멤버 지우고 content 바꿈
    if (findReply.length == 0) {
      const chatDelete = await dbModels.Chat.findOneAndDelete(
        {
          _id: data.chatId
        }
      )
    }
    else {
      const ChatChange = await dbModels.Chat.findOneAndUpdate(
        {
          _id: data.chatId
        },
        {
          chatMember: ObjectId(),
          chatContent: '삭제된 메시지 입니다.',
          createdAt: ''
        }
      )
    }



    // 같이 날라온 부모댓글 id(replyId) 가 undefind 라면 send 하면서 끝
    if (data.replyId == "undefined") {
      // console.log('undefinedddddddddd')
      return res.status(200).send({
        message: 'delete Chat but reply chat not delete'
      })
    }

    // 부모댓글이 같이 왓다면 부모댓글 확인
    // 부모 댓글이 '삭제된 메시지 입니다.' 상태면 부모도 지워준다. 
    else {
      // console.log('not undefineddddddddddd');
      const findParentReply = await dbModels.Chat.find(
        {
          reply: data.replyId
        }
      )
      // console.log(findParentReply);
      if (findParentReply.length == 0) {
        const findReplyReplyId = await dbModels.Chat.find(
          {
            reply: data.replyId,
            chatContent: '삭제된 메시지 입니다.'
          }
        )
        // console.log(findReplyReplyId);
        // console.log(findReplyReplyId);
        if (findReplyReplyId.length == 0) {
          const deleteReplyReplyId = await dbModels.Chat.findOneAndDelete(
            {
              _id: data.replyId,
              chatContent: '삭제된 메시지 입니다.'
            }
          )
        }
      }
    }

    return res.status(200).send({
      message: 'delete Chat and reply chat delete'
    })

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'delete chat Error'
    })
  }
}

exports.createMeeting = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Create Meeting 
  router.post('/space/doc/createMeeting', docController.createMeeting);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body
  // currentMember = req.body
  console.log(data);
  try {

    const meeting = dbModels.Meeting(
      {
        manager: req.decoded._id,
        enlistedMembers: data.enlistedMembers,
        currentMembers: data.currentMembers, // currentMember 사용
        spaceId: data.spaceId,
        meetingTitle: data.meetingTitle,
        meetingDescription: data.meetingDescription,
        isDone: false,
        start_date: data.startDate,
        start_time: data.startTime,
        status: data.status
      }
    );
    console.log(meeting);
    await meeting.save();

    // console.log(data.docId);

    //////  mySpaceHistory  ////////
    // const spaceId = await dbModels.Document.aggregate([
    // 	{
    // 		$match: {
    // 			_id: ObjectId(data.docId),
    // 		}
    // 	},
    // 	{
    // 		$lookup: {
    // 			from: "spaces",
    // 			localField: "spaceTime_id",
    // 			foreignField: "_id",
    // 			as: "spaceId"
    // 		}
    // 	},
    // 	{
    // 		$project: {
    // 			space_id: '$spaceId._id'
    // 		}
    // 	},
    // 	{
    // 		$unwind:{
    // 			path: '$space_id',
    // 			preserveNullAndEmptyArrays: true
    // 		}
    // 	}
    // ]);
    // console.log(spaceId[0].space_id);
    // console.log(memberName);
    // const mySpaceHistory = await dbModels.MySpaceHistory(
    // 	{

    // 		space_id: spaceId[0].space_id,
    // 		doc_id: data.docId,
    // 		// 1 이면 스페이스, 2 면 도큐먼트

    // 		type: 2,

    // 		content: data.meetingTitle + ' 미팅이 생겼습니다.'
    // 	}
    // )
    // // console.log(mySpaceHistory);
    // await mySpaceHistory.save();
    //////////////////////////////////////

    //// notification //////////
    for (let index = 0; index < data.enlistedMembers.length; index++) {
      const element = data.enlistedMembers[index];
      console.log(element);
      const notification = await dbModels.Notification(
        {
          sender: req.decoded._id,
          receiver: element,
          notiType: 'meeting-created',
          isRead: false,
          iconText: 'video_camera_front',
          notiLabel: 'A new meeting has been created.\nMeeting Title : ' + data.meetingTitle,
          navigate: 'collab/space/' + data.spaceId
        }
      )
      await notification.save();
    }
    ///////////////////////////////

    const meetingList = await dbModels.Meeting.find(
      {
        spaceId: data.spaceId
      }
    )


    return res.status(200).send({
      message: 'create meeting',
      meetingList
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'create meeting Error'
    })
  }
}

exports.getMeetingList = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Meeting List 
  router.get('/space/doc/getMeetingList'), docController.getMeetingList;

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.query;
  console.log(data);
  try {
    const meetingList = await dbModels.Meeting.find(
      {
        spaceId: data.spaceId
      }
    )
    // console.log(meetingList);
    return res.status(200).send({
      message: 'get meeting list',
      meetingList
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'get meeting list Error'
    })
  }

}



exports.deleteMeeting = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Meeting 
  router.delete('/space/doc/deleteMeeting', docController.deleteMeeting);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.query;
  // console.log(data);
  try {

    const deleteMeeting = await dbModels.Meeting.findOneAndDelete(
      {
        _id: data._id
      }
    )
    // console.log(deleteMeeting);


    //////  mySpaceHistory  ////////
    // const spaceTime = await dbModels.Document.findOne(
    // 	{
    // 		_id: deleteMeeting.docId,
    // 	}
    // )
    // const spaceId = await dbModels.Space.findOne(
    // 	{
    // 		_id: spaceTime.spaceTime_id
    // 	}
    // )
    // console.log(inviteSpaceMember);
    // console.log(memberName);
    // const mySpaceHistory = await dbModels.MySpaceHistory(
    // 	{
    // 		space_id: spaceId._id,
    // 		// 1 이면 스페이스, 2 면 도큐먼트

    // 		type: 1,

    // 		content: deleteMeeting.meetingTitle + ' 미팅이 삭제되었습니다.'
    // 	}
    // )

    // await mySpaceHistory.save();
    ////////////////////////////////////

    const meetingList = await dbModels.Meeting.find(
      {
        spaceId: deleteMeeting.spaceId
      }
    )


    return res.status(200).send({
      message: 'delete meeting',
      meetingList
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'delete meeting Error'
    })
  }

}

exports.openMeeting = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Meeting status change 'Open'
  router.post('/space/doc/openMeeting', docController.openMeeting);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);
  try {
    const openMeeting = await dbModels.Meeting.findOneAndUpdate(
      {
        _id: data._id
      },
      {
        status: data.status
      }
    )

    const meetingList = await dbModels.Meeting.find(
      {
        spaceId: data.spaceId
      }
    )
    // console.log(meetingInDoc);
    return res.status(200).send({
      message: 'get meeting list',
      meetingList
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'get meeting list Error'
    })
  }

}
exports.closeMeeting = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Meeting status change 'Close'
  router.post('/space/doc/closeMeeting', docController.closeMeeting);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);
  try {
    const openMeeting = await dbModels.Meeting.findOneAndUpdate(
      {
        _id: data._id
      },
      {
        status: data.status
      }
    )

    const meetingList = await dbModels.Meeting.find(
      {
        spaceId: data.spaceId
      }
    )
    // console.log(meetingInDoc);
    return res.status(200).send({
      message: 'get meeting list',
      meetingList
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'get meeting list Error'
    })
  }

}

exports.scrumEditDocStatus = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Doc Change Status
  router.put('/space/doc/scrumEditDocStatus', docController.scrumEditDocStatus);

--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);
  try {

    const editDocStatus = await dbModels.Document.findOneAndUpdate(
      {
        _id: data._id
      },
      {
        status: data.status
      }
    )

    ////////////// scrumboard////////////////

    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: editDocStatus.spaceTime_id
      }
    )

    let temp;

    // status 변경해주고 순서 바꿔주는거
    // status 변경될거 빼오기
    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const children = scrumBoard.scrum[i].children

      // doc 찾는중
      for (let j = 0; j < children.length; j++) {
        const doc_id = children[j].doc_id;
        // console.log(doc_id);
        // 찾은 doc 이랑 받아온 doc 이랑 같으면
        if (doc_id == data._id) {

          // 옮길거 temp에 옮겨두고 
          // console.log(scrumBoard.scrum[i].children[j])
          temp = scrumBoard.scrum[i].children[j];
          // 원래값 빼기
          scrumBoard.scrum[i].children.splice(data.swapPre, 1);
          break;
        }
      }
    }

    // status 변경, 순서 변경
    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const status = scrumBoard.scrum[i].label;

      if (status == data.status) {
        scrumBoard.scrum[i].children.splice(data.swapCur, 0, temp);
      }
    }

    await scrumBoard.save();

    ////////////// scrumboard////////////////

    const spaceDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: ObjectId(editDocStatus.spaceTime_id)
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            creator_id: '$creator'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$creator_id']
                }
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'creator'
        },

      },
      // {
      // 	$unwind: {
      // 		path: '$creator',
      // 		preserveNullAndEmptyArrays: true
      // 	}
      // },
      {
        $project: {
          docTitle: 1,
          docContent: 1,
          spaceTime_id: 1,
          status: 1,
          creator: '$creator.name',
          creator_id: '$creator._id',
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          color: 1,

        }
      }
    ]);




    return res.status(200).send({
      message: 'change doc status',
      spaceDocs,
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'change doc status error'
    })
  }

}

exports.scrumEditStatusSequence = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Doc status sequence Change
  router.put('/space/doc/scrumEditStatusSequence', docController.scrumEditStatusSequence);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);
  try {

    const status = await dbModels.Space.findOne(
      {
        _id: data._id
      }
    )

    const temp = status.docStatus[data.swapPre];
    status.docStatus[data.swapPre] = status.docStatus[data.swapCur];
    status.docStatus[data.swapCur] = temp;

    ////////////// scrumboard////////////////

    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: data._id
      }
    )
    // console.log(scrumBoard);
    const scrumTemp = scrumBoard.scrum[data.swapPre];
    scrumBoard.scrum[data.swapPre] = scrumBoard.scrum[data.swapCur];
    scrumBoard.scrum[data.swapCur] = scrumTemp;
    ////////////// scrumboard////////////////
    // console.log(scrumBoard);

    await status.save();
    await scrumBoard.save();

    return res.status(200).send({
      message: 'change doc status sequence',

    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'change doc status sequence error'
    })
  }
}


exports.scrumAddDocStatus = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Doc status add
  router.put('/space/doc/scrumAddDocStatus', docController.scrumAddDocStatus);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);
  try {
    const space = await dbModels.Space.findOneAndUpdate(
      {
        _id: data.space_id
      },
      {
        $push: {
          docStatus: data.addStatus
        }
      },
      {
        new: true
      }
    )
    console.log(space);

    const scrumboard = await dbModels.ScrumBoard.findOneAndUpdate(
      {
        space_id: data.space_id
      },
      {
        $push: {
          scrum: {
            "label": data.addStatus,
            "children": [],
          }
        }
      },
      {
        new: true
      }
    )
    console.log(scrumboard);


    return res.status(200).send({
      message: 'add doc status',
      scrumboard,
      space
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'add doc status error'
    })
  }
}

exports.scrumDeleteDocStatus = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Doc status delete
  router.put('/space/doc/scrumDeleteDocStatus', docController.scrumDeleteDocStatus);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);
  try {
    const space = await dbModels.Space.findOneAndUpdate(
      {
        _id: data.space_id
      },
      {
        $pull: {
          docStatus: data.label
        }
      },
      {
        new: true
      }
    )
    console.log(space);

    const scrumboard = await dbModels.ScrumBoard.findOneAndUpdate(
      {
        space_id: data.space_id
      },
      {
        $pull: {
          scrum: {
            "label": data.label,
            // "children": [],
          }
        }
      },
      {
        new: true
      }
    )
    console.log(scrumboard);

    const document = await dbModels.Document.deleteMany(
      {
        spaceTime_id: data.space_id,
        status: data.label
      }
    )

    return res.status(200).send({
      message: 'delete doc status',
      scrumboard,
      // space
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'delete doc status error'
    })
  }
}


exports.statusNameChange = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Doc status name change
  router.put('/space/doc/statusNameChange', docController.statusNameChange);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);
  try {


    const space = await dbModels.Space.findOneAndUpdate(
      {
        _id: data.spaceId
      },
      {
        $set: {
          [`docStatus.${data.statusIndex}`]: data.changeStatus
        }
      },
      {
        new: true
      }
    )


    const scrum = await dbModels.ScrumBoard.findOneAndUpdate(
      {
        space_id: data.spaceId,
      },
      {
        $set: { [`scrum.${data.statusIndex}.label`]: data.changeStatus }
      }
    )

    const previousStatus = scrum.scrum[data.statusIndex].label;

    const document = await dbModels.Document.updateMany(
      {
        spaceTime_id: data.spaceId,
        status: previousStatus

      },
      {
        status: data.changeStatus
      }
    )

    const scrumboard = await dbModels.ScrumBoard.findOne(
      {
        space_id: data.spaceId,
      }
    )
    console.log(data.spaceId)
    const updateDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: Object(space._id)
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            creator_id: '$creator'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$creator_id']
                }
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'creator'
        },
      },
      {
        $project: {
          docTitle: 1,
          docContent: 1,
          spaceTime_id: 1,
          status: 1,
          creator: '$creator.name',
          creator_id: '$creator._id',
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          color: 1
        }
      }
    ]);

    console.log(updateDocs)


    return res.status(200).send({
      message: 'Doc status name change',
      scrumboard,
      updateDocs
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'Doc status name change error'
    })
  }
}

//
exports.titleChange = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Doc title change
  router.put('/space/doc/titleChange', docController.titleChange);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  try {


    const space = await dbModels.Document.findOneAndUpdate(
      {
        _id: data.doc_id
      },
      {
        $set: {
          ["docTitle"]: data.changeTitle
        }
      },
      {
        new: true
      }
    )


    const scrumBoard = await dbModels.ScrumBoard.findOne(

      {
        scrum: {
          "$elemMatch": {
            "$and": [{
              children: {
                "$elemMatch": {
                  "$and": [{
                    doc_id: data.doc_id
                  }]

                }

              }
            }

            ]

          }

        }
      }
    )

    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const docs = scrumBoard.scrum[i].children;

      for (let j = 0; j < docs.length; j++) {
        const doc_id = docs[j].doc_id;

        if (doc_id == data.doc_id) {
          scrumBoard.scrum[i].children[j].docTitle = data.changeTitle;
        }
      }
    }
    await scrumBoard.save();


    const updateDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: Object(space.spaceTime_id)
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            creator_id: '$creator'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$creator_id']
                }
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'creator'
        },
      },
      {
        $project: {
          docTitle: 1,
          docContent: 1,
          spaceTime_id: 1,
          status: 1,
          creator: '$creator.name',
          creator_id: '$creator._id',
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          color: 1
        }
      }
    ]);

    return res.status(200).send({
      message: 'Doc title change',
      scrumBoard,
      updateDocs
      // space
    });

  } catch (err) {
    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'Doc title change error'
    })
  }

}

