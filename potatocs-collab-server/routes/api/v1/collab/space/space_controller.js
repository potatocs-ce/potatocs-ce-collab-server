const { ObjectId } = require('bson');
const { db } = require('../../../../../models/meeting_schema');

exports.getSpace = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get my Space
  router.get(/space/:spaceTime', spaceController.getSpace);
  Params: ${req.params.spaceTime}
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;

  try {

    // console.log(spaceNav);
    // https://crmrelease.tistory.com/131 파이프라인
    const spaceMembers = await dbModels.Space.aggregate([
      // {
      // 	$match: {
      // 		$expr: {
      // 			$eq: ['$_id', req.params.spaceTime]
      // 		}
      // 	}
      // },
      {
        $match: {
          _id: ObjectId(req.params.spaceTime)
        }
      },
      {
        $addFields: {
          isAdmin: {
            $cond: [
              { $in: [ObjectId(req.decoded._id), '$admins'] },
              true,
              false,
            ]
          },
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            memberArray: '$members'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$memberArray']
                }
              }
            },
            {
              $project: {
                email: 1,
                name: 1,
                profile_img: 1,
                retired: 1,
              }
            },
            {
              $match: {
                retired: false,
              }
            },
          ],
          as: 'memberObjects'
        }
      },
      {
        $project: {
          displayName: 1,
          displayBrief: 1,
          spaceTime: '$_id',
          isAdmin: 1,
          memberObjects: 1,
          admins: 1,
          docStatus: 1,
          labels: 1
        }
      },

    ]);

    // list of docs START
    const criteria = {
      spaceTime_id: req.params.spaceTime
    }

    const spaceDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: ObjectId(req.params.spaceTime)
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
          done: 1,
          color: 1,
          labels: 1
        }
      }
    ]);

    // console.log('spaceMember')
    // console.log(spaceMembers);

    // scrumBoard//////////////////

    const scrumBoard = await dbModels.ScrumBoard.findOne(
      {
        space_id: req.params.spaceTime
      }
    )

    // scrumBoard//////////////////

    // console.log('spaceDocs')
    // console.log("야라호",spaceDocs);
    return res.status(200).send({
      message: 'getSpace',
      spaceMembers,
      spaceDocs,
      scrumBoard,
    })


  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'loadUpateMenu Error'
    })
  }

}

exports.getDocs = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get my docs
  router.get(/space/getDocs/:spaceTime', spaceController.getDocs);
  Params: ${req.params.spaceTime}
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;

  try {

    // const criteria = {
    // 	spaceTime_id: req.params.spaceTime
    // }

    // const spaceDocs = await dbModels.Document.find(criteria);

    // console.log(spaceDocs);

    return res.status(200).send({
      message: 'getDocs',

    })


  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'Loadings Docs Error'
    })
  }
}

exports.changeSpaceName = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Change my Space Name
  router.put('/change-space-name', spaceController.changeSpaceName);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;

  const data = req.body;
  // console.log(data);

  const criteria = {
    _id: data.id
  }

  const updateData = {
    displayName: data.displayName
  }

  // 휴가 승인 업데이트
  try {
    const updatedDisplayName = await dbModels.Space.findOneAndUpdate(criteria, updateData);
    if (!updatedDisplayName) {
      return res.status(404).send('the update1 has failed');
    }

    // console.log(updatedDisplayName);

    return res.status(200).send({
      message: "connect changeSpaceName",
    });

  } catch (error) {
    return res.status(500).send({
      message: 'DB Error'
    });
  }
}

exports.changeSpaceBrief = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Change my Space Brief
  router.put('/change-space-name', spaceController.changeSpaceBrief);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);

  const criteria = {
    _id: data.id
  }

  const updateData = {
    displayBrief: data.displayBrief
  }

  // 휴가 승인 업데이트
  try {
    const updatedDisplayName = await dbModels.Space.findOneAndUpdate(criteria, updateData);
    if (!updatedDisplayName) {
      return res.status(404).send('the update1 has failed');
    }

    // console.log(updatedDisplayName);

    return res.status(200).send({
      message: "connect changeSpaceName",
    });

  } catch (error) {
    return res.status(500).send({
      message: 'DB Error'
    });
  }
}

exports.deleteSpaceMember = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Space Memeber
  router.put('/delete-space-member', spaceController.deleteSpaceMember);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);

  const updateDeleteMember = await dbModels.Space.findOneAndUpdate(
    {
      _id: ObjectId(data.id)
    },
    {
      $pull: {
        members: data.member_id,
        admins: data.member_id
      },

    },
    {
      new: true
    }
  )
  console.log('updateDeleteMember', updateDeleteMember);

  const getDocId = await dbModels.Document.aggregate([
    {
      $match: {
        spaceTime_id: ObjectId(updateDeleteMember._id)
      }
    },
    {
      $project: {
        _id: 1,
      }
    }
  ]);

  console.log('getDocId', getDocId);

  // // meeting이 doc 안에 있었을때 
  // for (let index = 0; index < getDocId.length; index++) {
  // 	const element = getDocId[index]._id;
  // 	console.log(element)
  // 	const enlistMeeting = await dbModels.Meeting.updateMany(
  // 		{
  // 			docId: element
  // 		},
  // 		{
  // 			$pull: { 
  // 				// currentMembers 도 반영해준다.
  // 				currentMembers: {
  // 					member_id : data.member_id						
  // 				},
  // 				enlistedMembers: data.member_id,
  // 			}
  // 		}
  // 	)
  // }
  const enlistMeeting = await dbModels.Meeting.updateMany(
    {
      spaceId: data.id
    },
    {
      $pull: {
        // currentMembers 도 반영해준다.
        currentMembers: {
          member_id: data.member_id
        },
        enlistedMembers: data.member_id,
      }
    }
  )


  const deleteMemberMenuside = await dbModels.MenuSide.findOneAndUpdate(
    {
      member_id: data.member_id
    },
    {
      $pull: {
        space_list: ObjectId(data.id)
      }
    },
    {
      new: true
    }
  )
  console.log(deleteMemberMenuside);


  //// notification ////
  const notification = await dbModels.Notification(
    {
      sender: req.decoded._id,
      receiver: data.member_id,
      notiType: 'space-exported',
      isRead: false,
      iconText: 'group_remove',
      notiLabel: 'You were taken out of space.',
      navigate: 'main'
    }
  )

  await notification.save();
  ///////////////////////


  //////  mySpaceHistory  ////////
  const memberName = await dbModels.Member.findOne(
    {
      _id: data.member_id,
    }
  )
  // console.log(inviteSpaceMember);
  // console.log(memberName);
  // const mySpaceHistory = await dbModels.MySpaceHistory(
  // 	{
  // 		space_id: updateDeleteMember._id,
  // 		// 1 이면 스페이스, 2 면 도큐먼트
  // 		type: 1,

  // 		content: memberName.name + ' 님이 탈퇴 했습니다.'
  // 	}
  // )

  // await mySpaceHistory.save();
  //////////////////////////////////////

  return res.status(200).send({
    message: 'deleteSpaceMember'
  });

}

exports.quitSpaceAdmin = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Quit Space Admin
  router.put('/quit-space-admin', spaceController.quitSpaceAdmin);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.body
  // console.log(data.id);
  // console.log(data.member_id);

  const updateQuitAdmin = await dbModels.Space.updateOne(
    {
      _id: ObjectId(data.id)
    },
    {
      $pull: { admins: ObjectId(data.member_id) }
    }
  )

  return res.status(200).send({
    message: 'quitSpaceAdmin'
  });
}

exports.addSpaceAdmin = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Space Admin
  router.put('/get-space-member', spaceController.getSpaceAdmin);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.body
  // console.log(data);
  // console.log(data.id);

  const updateGetAdmin = await dbModels.Space.updateOne(
    {
      _id: ObjectId(data.id)
    },
    {
      $addToSet: { admins: ObjectId(data.member_id) }
    }
  )

  // console.log(updateGetAdmin);

  return res.status(200).send({
    message: 'getSpaceAdmin'
  });
}



exports.searchSpaceMember = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : search space member 
  router.get('/searchSpaceMember', spaceController.searchSpaceMember);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.query;
  // console.log(data);

  try {
    const searchSpaceMember = await dbModels.Member.findOne(
      {
        email: data.email
      },
    )
    // console.log(searchSpaceMember);

    if (searchSpaceMember == null) {
      return res.status(200).send({
        message: 'dont find this member'
      })
    }
    else if (searchSpaceMember.retired == true) {
      return res.status(200).send({
        message: 'retired spaceMember',
      });
    }

    return res.status(200).send({
      message: 'searchSpaceMember',
      searchSpaceMember
    });
  }
  catch (err) {
    console.log(err);
    return res.status(500).send({
      message: 'searchSpaceMember Error'
    });
  }
}

exports.inviteSpaceMember = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Invite Space Member
  router.put('/inviteSpaceMember', spaceController.inviteSpaceMember);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);


  try {
    const confirmMember = await dbModels.Space.aggregate([
      {
        $match: {
          members: ObjectId(data.member_id),
          _id: ObjectId(data.spaceTime)
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'members',
          foreignField: '_id',
          as: 'spaceMember'
        },
      },
      {
        $unwind: {
          path: '$spaceMember',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          id: '$spaceMember._id',
          name: '$spaceMember.name',
          email: '$spaceMember.email',
          retired: '$spaceMember.retired'
        }
      },
      {
        $match: {
          id: ObjectId(data.member_id)
        }
      },
    ]);
    console.log('myEmployeeList----------------------------')
    console.log(confirmMember);
    console.log('-----------------------------------------')


    if (confirmMember.length != 0 && confirmMember[0].retired == true) {
      return res.status(500).send({
        message: 'This member already retired.'
      })
    } else if (confirmMember.length != 0) {
      return res.status(500).send({
        message: 'This member already participated.'
      })
    }

    // 멤버가 아니니까 addToSet 으로 스페이스에 추가
    const inviteSpaceMember = await dbModels.Space.findOneAndUpdate(
      {
        _id: data.spaceTime
      },
      {
        $addToSet: { members: data.member_id }
      },
      {
        new: true
      }
    )
    // console.log('invite space member',inviteSpaceMember);

    const inviteMemberMenuside = await dbModels.MenuSide.updateOne(
      {
        member_id: data.member_id
      },
      {
        $addToSet: { space_list: inviteSpaceMember._id }
      },
    )

    // console.log('data.spaceTime', data.spaceTime);

    const getDocId = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: ObjectId(data.spaceTime)
        }
      },
      {
        $project: {
          _id: 1,
        }
      }
    ]);

    let currentMember = {
      member_id: data.member_id,
      role: 'Presenter',
      online: false
    }

    // console.log(getDocId.length);

    // // meeting 이 dooc 안에 있을때
    // for (let index = 0; index < getDocId.length; index++) {
    // 	const element = getDocId[index]._id;
    // 	// console.log(element)
    // 	const enlistMeeting = await dbModels.Meeting.updateMany(
    // 		{
    // 			docId: element
    // 		},
    // 		{
    // 			$push: {
    // 				enlistedMembers: data.member_id,
    // 				currentMembers: currentMember // currentMembers 도 반영해준다.
    // 		 	}
    // 		}
    // 	)
    // 	// console.log('enlistMeeting', enlistMeeting);
    // }

    const enlistMeeting = await dbModels.Meeting.updateMany(
      {
        spaceId: data.spaceTime
      },
      {
        $push: {
          enlistedMembers: data.member_id,
          currentMembers: currentMember // currentMembers 도 반영해준다.
        }
      }
    )

    //////  mySpaceHistory  ////////
    // const memberName = await dbModels.Member.findOne(
    // 	{
    // 		_id: data.member_id,
    // 	}
    // )
    // console.log(inviteSpaceMember);
    // console.log(memberName);
    // const mySpaceHistory = await dbModels.MySpaceHistory(
    // 	{
    // 		space_id: inviteSpaceMember._id,
    // 		// 1 이면 스페이스, 2 면 도큐먼트
    // 		type: 1,

    // 		content: memberName.name + ' 님이 새로운 멤버가 되었습니다.'
    // 	}
    // )

    // await mySpaceHistory.save();
    //////////////////////////////////////

    //// notification ////
    const notification = await dbModels.Notification(
      {
        sender: req.decoded._id,
        receiver: data.member_id,
        notiType: 'space-invite',
        isRead: false,
        iconText: 'group_add',
        notiLabel: 'You have been invited to a new space.',
        navigate: 'collab/space/' + data.spaceTime
      }
    )

    await notification.save();
    ///////////////////////

    return res.status(200).send({
      message: 'inviteSpaceMember',
    });
  }
  catch (err) {
    console.log(err);
    return res.status(500).send({
      message: 'inviteSpaceMember Error'
    });
  }
}

//hokyun - 2022-08-16
exports.addSpaceLabel = async (req, res) => {
  console.log(`
    --------------------------------------------------
      User : ${req.decoded._id}
      API  : Get Space Label
      router.put('/get-space-label', spaceController.getSpaceLabel);
    --------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.body;

  try {
    const confirmMember = await dbModels.Space.findOneAndUpdate(
      {
        _id: data.spaceTime
      },
      {
        $addToSet: { labels: { color: data.color, title: data.title } }
      }, {
      new: true
    }
    )
    if (confirmMember) {
      return res.status(200).send({
        message: 'success',
        spaceTime: confirmMember.spaceTime
      })
    }
    return res.status(404).send({
      message: '서버 에러'
    })
  } catch (err) {
    console.log(err)
    return res.status(500).send({
      message: '에러 에러 에러'
    })
  }
}

//라벨 삭제
exports.deleteSpaceLabel = async (req, res) => {
  console.log(`
    --------------------------------------------------
      User : ${req.decoded._id}
      API  : Delete Space Label
      router.put('/delete-space-label', spaceController.deleteSpaceLabel);
    --------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);

  try {
    const deletedLabelSpace = await dbModels.Space.findOneAndUpdate(
      { _id: data.spaceTime },
      { $pull: { labels: { 'color': data.color, 'title': data.title } } }
    )
    const scrumBoard = await dbModels.ScrumBoard.findOne({ space_id: data.spaceTime })

    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const docs = scrumBoard.scrum[i].children;

      for (let j = 0; j < docs.length; j++) {
        docs[j].labels = docs[j].labels.filter(o => { return o.color !== data.color || o.title !== data.title })
      }
    }
    await scrumBoard.save();

    await dbModels.Document.updateMany({ spaceTime_id: data.spaceTime }, { $pull: { labels: { 'color': data.color, 'title': data.title } } })


    const spaceMembers = await dbModels.Space.aggregate([
      // {
      // 	$match: {
      // 		$expr: {
      // 			$eq: ['$_id', req.params.spaceTime]
      // 		}
      // 	}
      // },
      {
        $match: {
          _id: ObjectId(data.spaceTime)
        }
      },
      {
        $addFields: {
          isAdmin: {
            $cond: [
              { $in: [ObjectId(req.decoded._id), '$admins'] },
              true,
              false,
            ]
          },
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            memberArray: '$members'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$memberArray']
                }
              }
            },
            {
              $project: {
                email: 1,
                name: 1,
                profile_img: 1,
                retired: 1,
              }
            },
            {
              $match: {
                retired: false,
              }
            },
          ],
          as: 'memberObjects'
        }
      },
      {
        $project: {
          displayName: 1,
          displayBrief: 1,
          spaceTime: '$_id',
          isAdmin: 1,
          memberObjects: 1,
          admins: 1,
          docStatus: 1,
          labels: 1
        }
      },

    ]);

    const spaceDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: ObjectId(data.spaceTime)
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
          done: 1,
          color: 1,
          labels: 1
        }
      }
    ]);

    if (deletedLabelSpace) {
      return res.status(200).send({
        message: 'success',
        spaceTime: data.spaceTime,
        scrumBoard,
        spaceMembers,
        spaceDocs
      })
    }



    return res.status(404).send({
      message: 'server error',

    })
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: '에러 에러 에러'
    })
  }
}

//라벨 수정
exports.editSpaceLabel = async (req, res) => {
  console.log(`
    --------------------------------------------------
      User : ${req.decoded._id}
      API  : Edit Space Label
      router.put('/edit-space-label', spaceController.editSpaceLabel);
    --------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data)

  try {
    const deletedLabelSpace = await dbModels.Space.findOneAndUpdate(
      { _id: data.spaceTime, "labels.color": data.color, "labels.title": data.title },
      { $set: { "labels.$.title": data.editTitle } },
      false);

    const scrumBoard = await dbModels.ScrumBoard.findOne({ space_id: data.spaceTime })

    for (let i = 0; i < scrumBoard.scrum.length; i++) {
      const docs = scrumBoard.scrum[i].children;

      for (let j = 0; j < docs.length; j++) {
        docs[j].labels = docs[j].labels.map(item => {
          if (item.color === data.color && item.title === data.title) return { color: item.color, title: data.editTitle };
          return item
        })
      }
    }

    await scrumBoard.save();

    await dbModels.Document.updateMany({ spaceTime_id: data.spaceTime, "labels.color": data.color, "labels.title": data.title },
      { $set: { "labels.$.title": data.editTitle } })

    const spaceMembers = await dbModels.Space.aggregate([
      // {
      // 	$match: {
      // 		$expr: {
      // 			$eq: ['$_id', req.params.spaceTime]
      // 		}
      // 	}
      // },
      {
        $match: {
          _id: ObjectId(data.spaceTime)
        }
      },
      {
        $addFields: {
          isAdmin: {
            $cond: [
              { $in: [ObjectId(req.decoded._id), '$admins'] },
              true,
              false,
            ]
          },
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            memberArray: '$members'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$memberArray']
                }
              }
            },
            {
              $project: {
                email: 1,
                name: 1,
                profile_img: 1,
                retired: 1,
              }
            },
            {
              $match: {
                retired: false,
              }
            },
          ],
          as: 'memberObjects'
        }
      },
      {
        $project: {
          displayName: 1,
          displayBrief: 1,
          spaceTime: '$_id',
          isAdmin: 1,
          memberObjects: 1,
          admins: 1,
          docStatus: 1,
          labels: 1
        }
      },

    ]);

    const spaceDocs = await dbModels.Document.aggregate([
      {
        $match: {
          spaceTime_id: ObjectId(data.spaceTime)
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
          done: 1,
          color: 1,
          labels: 1
        }
      }
    ]);



    if (deletedLabelSpace) {
      return res.status(200).send({
        message: 'success',
        spaceTime: data.spaceTime,
        scrumBoard,
        spaceMembers,
        spaceDocs
      })
    }



    return res.status(404).send({
      message: 'server error',

    })

  } catch (err) {
    console.log(err)
    return res.status(500).send({
      message: '에러 발생'
    })
  }
}

///////////
// exports.getAllMember = async (req, res) => {

// 	console.log(`
// --------------------------------------------------
//   User : ${req.decoded._id}
//   API  : Get All Member
//   router.get('/getAllMember', spaceController.getAllMember);
// --------------------------------------------------`);

// 	const dbModels = global.DB_MODELS;

// 	const members = await dbModels.Member.aggregate([
// 		{
// 			$project: {
// 				_id: 1,
// 				name: 1,
// 				email: 1,
// 			}
// 		}
// 	]);
// 	console.log(members);

// 	try{
// 		return res.status(200).send({
// 			message: 'getAllMember',
// 			members
// 		});
// 	}
// 	catch{
// 		return res.status(500).send({
// 			message: 'DB Error'
// 		});
// 	}
// }

