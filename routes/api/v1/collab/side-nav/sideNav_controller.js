const mongoose = require("mongoose");

/* 
  Create a folder
*/
exports.createFolder = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Create a folder
	router.get('/create-folder', sideNavContollder.createFolder);

	folder_name : ${req.body.folder_name}
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;

    const count_folder = await dbModels.Folder.countDocuments();
    const count_space = await dbModels.Space.countDocuments();

    const order = count_folder + count_space;

    try {
        const criteria = {
            member_id: req.decoded._id,
            displayName: req.body.folder_name,
            in_order: order + 1,
        };

        const newFolder = dbModels.Folder(criteria);

        ////////////////
        const menuside = await dbModels.MenuSide.updateOne(
            {
                member_id: new mongoose.Types.ObjectId(req.decoded._id),
            },
            {
                $addToSet: { folder_list: newFolder._id },
            }
        );

        await newFolder.save();

        return res.status(200).send({
            message: "created",
        });
    } catch (err) {
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

exports.updateFolder = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Update My Folder
  router.get(/load-update-menu', sideNavContollder.updateSpace);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const folderNav = await dbModels.Folder.aggregate([
            {
                $match: {
                    member_id: new mongoose.Types.ObjectId(req.decoded._id),
                },
            },
        ]);

        return res.status(200).send({
            message: "updated",
            folderNav,
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "loadUpateMenu Error",
        });
    }
};

/*`
  Create a spce
*/
exports.createSpace = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Create a Space
	router.post('/create-space', sideNavContollder.createSpace);

	spaceName : ${req.body.spaceName}
	spaceBrief : ${req.body.spaceBrief}
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;
    // let timeDigit = new Date().getTime().toString();
    // timeDigit = timeDigit.slice(9, 13);

    const count_folder = await dbModels.Folder.countDocuments();
    const count_space = await dbModels.Space.countDocuments();

    const order = count_folder + count_space;

    try {
        const criteria = {
            displayName: req.body.spaceName,
            displayBrief: req.body.spaceBrief,
            // spaceTime: new Date().getMilliseconds().toString() + timeDigit,
            members: [req.decoded._id],
            admins: [req.decoded._id],
            in_order: order + 1,
            docStatus: ["submitted", "onGoing", "Done"],
            faceAuthentication: req.body.faceOption,
        };
        const Space = dbModels.Space(criteria);

        const scrumBoard = dbModels.ScrumBoard({
            space_id: Space._id,
            scrum: [
                {
                    label: "submitted",
                    children: [],
                },
                {
                    label: "onGoing",
                    children: [],
                },
                {
                    label: "Done",
                    children: [],
                },
            ],
        });
        await scrumBoard.save();

        ///////////////////////////////////
        // 2024-06-13 박재현
        // 안쓰는 것 같아서 주석 처리함
        // if (req.body.folderId === undefined || req.body.folderId == "thisplace") {

        const test = await dbModels.MenuSide.findOne(
            // const menuside = await dbModels.MenuSide.updateOne(
            {
                member_id: new mongoose.Types.ObjectId(req.decoded._id),
            }
        );

        const menuside = await dbModels.MenuSide.findOneAndUpdate(
            // const menuside = await dbModels.MenuSide.updateOne(
            {
                member_id: new mongoose.Types.ObjectId(req.decoded._id),
            },
            {
                $addToSet: { space_list: Space._id },
            }
        );
        // }
        // else {
        // 	const updateFolder = {
        // 		children: [
        // 			{
        // 				_id: new mongoose.Types.ObjectId(Space._id),
        // 			},
        // 		],
        // 	};
        // 	const folder = await dbModels.Folder.findOneAndUpdate(
        // 		{
        // 			_id: req.body.folderId,
        // 		},
        // 		{
        // 			$addToSet: updateFolder,
        // 		}
        // 	);
        // }
        //////////////////////////////////////

        await Space.save();

        return res.status(200).send({
            message: "created",
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "creatintg a space had an error",
        });
    }
};

exports.deleteFolder = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : delete my folder
  router.delete('/deleteFolder', sideNavContoller.deleteFolder);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.query;

    try {
        const deleteFolder = await dbModels.Folder.deleteOne({
            _id: data.folderId,
        });
        const deleteFolderForMenuSide = await dbModels.MenuSide.updateOne(
            {
                member_id: new mongoose.Types.ObjectId(req.decoded._id),
            },
            {
                $pull: { folder_list: new mongoose.Types.ObjectId(data.folderId) },
            }
        );

        return res.status(200).send({
            message: "delete folder",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "delete folder Error",
        });
    }
};

//2024-06-19 박재현
//space controller로 옮김
// exports.deleteSpace = async (req, res) => {
// 	console.log(`
// --------------------------------------------------
//   User : ${req.decoded._id}
//   API  : delete my space
//   router.delete('/delete-space', sideNavContoller.deleteSpace);
// --------------------------------------------------`);
// 	const dbModels = global.DB_MODELS;
// 	const data = req.query;

// 	try {
// 		const spaceInMember = await dbModels.Space.findOne({
// 			_id: data.spaceTime,
// 		});

// 		// spaceTime으로 space 안에 있는 문서들 가져오기
// 		const spaceInDoc = await dbModels.Document.find({
// 			spaceTime_id: data.spaceTime,
// 		});

// 		// 문서와 문서 안에 있는 파일 삭제
// 		for (let i = 0; i < spaceInDoc.length; i++) {
// 			const element = spaceInDoc[i]._id;

// 			// 문서 안에 있는 파일을 가져오기 위한 문서 아이디
// 			const docInUploadFile = await dbModels.UploadFile.find({
// 				doc_id: element,
// 			});

// 			// 업로드된 파일 삭제하고 디비에서도 삭제
// 			for (let j = 0; j < docInUploadFile.length; j++) {
// 				const element = docInUploadFile[j].filename;
// 				// await unlinkAsync('uploads/upload_file/' + element);
// 				await dbModels.UploadFile.deleteOne({
// 					filename: element,
// 				});
// 			}
// 			// 채팅 제거
// 			const deleteChat = await dbModels.Chat.deleteMany({
// 				docId: element,
// 			});

// 			// // 미팅 제거
// 			// const deleteMeeting = await dbModels.Meeting.deleteMany(
// 			// 	{
// 			// 		docId : element
// 			// 	}
// 			// )

// 			// 파일들 다 삭제 되면 문서 삭제
// 			await dbModels.Document.deleteOne({
// 				_id: element,
// 			});
// 		}

// 		const deleteMeeting = await dbModels.Meeting.deleteMany({
// 			spaceId: data.spaceTime,
// 		});

// 		// 문서도 다 삭제 되면 스페이스 삭제
// 		await dbModels.Space.deleteOne({
// 			_id: data.spaceTime,
// 		});

// 		await dbModels.ScrumBoard.deleteOne({
// 			space_id: data.spaceTime,
// 		});

// 		for (let index = 0; index < spaceInMember.members.length; index++) {
// 			const element = spaceInMember.members[index];

// 			await dbModels.MenuSide.updateOne(
// 				{
// 					member_id: element,
// 				},
// 				{
// 					$pull: { space_list: spaceInMember._id },
// 				}
// 			);
// 		}

// 		return res.status(200).send({
// 			message: "delete space and doc, upload file",
// 		});
// 	} catch (err) {
// 		console.log("[ ERROR ]", err);
// 		res.status(500).send({
// 			message: "delete space Error",
// 		});
// 	}
// };

exports.updateSideMenu = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Update my folder, space
  router.get(/update-side-menu', sideNavContollder.updateSideMenu);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        //////////////////

        const menuside = await dbModels.MenuSide.aggregate([
            {
                $match: {
                    member_id: new mongoose.Types.ObjectId(req.decoded._id),
                },
            },
            {
                $lookup: {
                    from: "folders",
                    let: { folder_list: "$folder_list" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$folder_list"],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "spaces",
                                let: { folderchildren: "$children" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $in: ["$_id", "$$folderchildren"],
                                            },
                                        },
                                    },
                                ],
                                as: "folderchildren",
                            },
                        },
                    ],
                    as: "folder",
                },
            },
            {
                $lookup: {
                    from: "spaces",
                    localField: "space_list",
                    foreignField: "_id",
                    as: "spaces",
                },
            },
            {
                $project: {
                    folders: "$folder",
                    spaces: "$spaces",
                },
            },
        ]);

        const folderNav = await dbModels.Folder.aggregate([
            {
                $match: {
                    member_id: new mongoose.Types.ObjectId(req.decoded._id),
                },
            },
        ]);

        // const navList = menuside[0].folders;
        // // const navList = spaceNav;
        // navList.push(...menuside[0].spaces);

        const navList = menuside;

        folderNav.push({ _id: "thisplace", displayName: "Main" });
        return res.status(200).send({
            message: "updated",
            navList,
            folderNav,
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "loadUpateMenu Error",
        });
    }
};

exports.updateSpacePlace = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Update my space place
  router.put('/update-space-place', sideNavContoller.updateSpacePlace);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;
    const space_id = data.spaceFlag.space_id;
    const folder_id = data.folderId;

    try {
        // 현재 폴더에 있는 space id 제거, 없으면 그냥 지나가지
        const deleteFolderSpace = await dbModels.Folder.updateOne(
            {
                children: new mongoose.Types.ObjectId(space_id),
            },
            {
                $pull: { children: new mongoose.Types.ObjectId(space_id) },
            }
        );

        // 밖으로 뺄경우 -> 메뉴사이드 스페이스리스트에 추가
        if (folder_id == "thisplace") {
            const addMenuSideSpaceList = await dbModels.MenuSide.updateOne(
                {
                    member_id: new mongoose.Types.ObjectId(req.decoded._id),
                },
                {
                    $addToSet: { space_list: new mongoose.Types.ObjectId(space_id) },
                }
            );
        }
        // 다른폴더에 넣을경우 -> 폴더 children 에 추가
        else {
            const updateSpacePlace = await dbModels.Folder.updateOne(
                {
                    _id: new mongoose.Types.ObjectId(folder_id),
                },
                {
                    $addToSet: { children: new mongoose.Types.ObjectId(space_id) },
                }
            );
            const deleteMenuSideSpaceList = await dbModels.MenuSide.updateOne(
                {
                    member_id: new mongoose.Types.ObjectId(req.decoded._id),
                },
                {
                    $pull: { space_list: new mongoose.Types.ObjectId(space_id) },
                }
            );
        }

        return res.status(200).send({
            message: "update space place data",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "updateSpacePlace Error",
        });
    }
};
