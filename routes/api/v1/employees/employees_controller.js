
const { ObjectId } = require('bson');
const { default: mongoose } = require('mongoose');
const { buildCCP } = require('../../../../utils/ca-utils');
const { Gateway, Wallet } = require('fabric-network');
const { MongoWallet } = require('../../../../utils/mongo-wallet');

exports.myEmployeeList = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get my Employee List
  router.get('/myEmployee-list', employeeMngmtCtrl.myEmployeeList);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const {
    active = 'createdAt',
    direction = 'asc',
    pageIndex = '0',
    pageSize = '10'
  } = req.query;

  const limit = parseInt(pageSize, 10);
  const skip = parseInt(pageIndex, 10) * limit;
  const sortCriteria = {
    [active]: direction === 'desc' ? -1 : 1,
  };
  try {

    // 관리하고 있는 직원들 in manager
    // myManager > 매니저 아이디, myId > 직원 아이디, accepted: true or false, 펜딩 or 수락


    const manager = await dbModels.Manager.find(
      {
        myManager: new mongoose.Types.ObjectId(req.decoded._id)
      },
      {
        myId: 1,
        accepted: 1,
      }
    ).lean()
    // console.log(manager);
    const mngEmployee = [];

    for (let index = 0; index < manager.length; index++) {
      const element = manager[index].myId;
      mngEmployee.push(element);
    }

    const myEmployeeList = await dbModels.Member.aggregate([
      {
        $match: {
          _id: { $in: mngEmployee },
          retired: false
        }
      },
      {
        $lookup: {
          from: 'personalleavestandards',
          localField: '_id',
          foreignField: 'member_id',
          as: 'totalLeave'
        }
      },
      {
        $addFields: {
          // year: {
          //     $floor: {
          //         $let: {
          //             vars: {
          //                 diff: {
          //                     $subtract: [new Date(), "$emp_start_date"]
          //                 }
          //             },
          //             in: {
          //                 $divide: ["$$diff", (365 * 24 * 60 * 60 * 1000)]
          //             }
          //         }
          //     }
          // }

          // dateDiff : 년차를 계산 -> 단 년만 보고 계산함 월이랑 일은 생각안함
          dateDiff: {
            $dateDiff: {
              startDate: "$emp_start_date",
              endDate: "$$NOW",
              unit: "year"
            }
          },

          // dateCompare : 그래서 이 친구가 필요, 이 친구가 현재와 계약 달, 일을 비교해서 1을 빼줄지 말지 정해줌 -> 오류
          // 오류 수정을 위한 수정된 코드
          // 달끼리 일끼리 비교하니까 오류가 나서 달일 달일 로 비교하기 위한 방법
          emp_start: {
            $dateFromParts: {
              'year': { $year: '$$NOW' }, 'month': { $month: '$$NOW' }, 'day': { $dayOfMonth: '$$NOW' }
            }
          },
          now_date: {
            $dateFromParts: {
              'year': { $year: '$$NOW' }, 'month': { $month: '$emp_start_date' }, 'day': { $dayOfMonth: '$emp_start_date' }
            }
          },
        }
      },
      {
        // 위의 emp_start, now_date 를 가지고 dateCompare
        $addFields: {
          dateCompare: {
            $cond: [{
              $and: [
                // {$gte: [ {$month: '$$NOW'}, {$month:'$emp_start_date'}]},
                // {$gte: [ {$dayOfMonth :"$$NOW"}, {$dayOfMonth: '$emp_start_date'}]},
                { $gte: ['$emp_start', '$now_date'] },
              ]
            }, 0, 1
            ]
          },
        }
      },
      {   // dateDiff 와 dateCompare 의 차 를 year로
        $addFields: {
          year: {
            $subtract: ["$dateDiff", "$dateCompare"]
          }
        }
      },
      {
        $lookup: {
          from: 'leaverequests',
          let: {
            userId: '$_id',
            years: '$year',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$requestor", "$$userId"] },
                    { $eq: ["$year", "$$years"] }

                  ]
                }
              }
            },
            {
              $facet: {
                used_annual_leave: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$leaveType", 'annual_leave'] },
                          {
                            $or: [
                              { $eq: ["$status", 'approve'] },
                              { $eq: ["$status", 'pending'] }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      sum: {
                        "$sum": "$leaveDuration"
                      }
                    }
                  }
                ],
                used_rollover: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$leaveType", 'rollover'] },
                          {
                            $or: [
                              { $eq: ["$status", 'approve'] },
                              { $eq: ["$status", 'pending'] }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      sum: {
                        "$sum": "$leaveDuration"
                      }
                    }
                  }
                ],
                used_sick_leave: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$leaveType", 'sick_leave'] },
                          {
                            $or: [
                              { $eq: ["$status", 'approve'] },
                              { $eq: ["$status", 'pending'] }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      sum: {
                        "$sum": "$leaveDuration"
                      }
                    }
                  }
                ],
                used_replacement_leave: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$leaveType", 'replacement_leave'] },
                          {
                            $or: [
                              { $eq: ["$status", 'approve'] },
                              { $eq: ["$status", 'pending'] }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      sum: {
                        "$sum": "$leaveDuration"
                      }
                    }
                  }
                ]
              }
            }
          ]
          , as: "usedLeave"
        }
      },
      {
        $unwind: {
          path: '$totalLeave',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$usedLeave',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'nationalholidays',
          localField: 'location',
          foreignField: '_id',
          as: 'countryName'
        }
      },
      {
        $unwind: {
          path: '$countryName',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          year: 1,
          position: 1,
          location: '$countryName.countryName',
          emp_start_date: 1,
          emp_end_date: 1,
          isManager: 1,
          totalLeave: {
            $arrayElemAt: ["$totalLeave.leave_standard", "$year"]
          },
          usedLeave: 1
        }
      },
      { $sort: sortCriteria },
      { $skip: skip },
      { $limit: limit }
    ]);


    // console.log(myEmployeeList)
    return res.status(200).send({
      message: 'found',
      myEmployeeList
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: 'DB Error'
    });
  }

};

exports.approvedLeaveRequest = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Approved Leave Request Pending List
  router.put('/approved-leave-request', approvalMngmtCtrl.approvedLeaveRequest);
  query: ${JSON.stringify(req.body._id)} pending leave request document id
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;
  console.log(data);
  const session = await dbModels.LeaveRequest.startSession();

  try {

    const criteria = {
      _id: data._id
    }

    const updateData = {
      status: 'approve'
    }

    // 휴가 승인 업데이트
    await session.startTransaction();

    const updatedRequest = await dbModels.LeaveRequest.findOneAndUpdate(criteria, updateData);

    //////////////// 일단 보류 LeaveRequestHistory
    // const leaveReqHistory = {	
    // 	requestor: updatedRequest.requestor,
    // 	approver: updatedRequest.approver,
    // 	leaveType: updatedRequest.leaveType,
    // 	leaveDay: updatedRequest.leaveDay,
    // 	leaveDuration: updatedRequest.leaveDuration,
    // 	leave_start_date: updatedRequest.leave_start_date,
    // 	leave_end_date: updatedRequest.leave_end_date,
    // 	leave_reason: updatedRequest.leave_reason,
    // 	status: 'approve',
    // 	year: updatedRequest.year 	
    // }

    // const leaveRequestHistory = dbModels.LeaveRequestHistory(leaveReqHistory);
    // console.log(leaveRequestHistory);
    // await leaveRequestHistory.save();
    ////////////////

    if (!updatedRequest) {
      return res.status(404).send('the update1 has failed');
    }

    /**-----------------------------------
* blockchain 코드 시작 -------------------------------------------
*/
    const foundMember = await dbModels.Member.findOne(
      {
        _id: data.requestor
      }
    ).lean()

    if (!foundMember) {
      return res.status(400).json({
        message: 'Member was not found!'
      })
    }

    const store = new MongoWallet();
    const wallet = new Wallet(store);
    const userIdentity = await wallet.get(data.requestor.toString());

    const findMyManagerCriteria = {
      myId: req.decoded._id,
      accepted: true
    }

    const getManagerData = await dbModels.Manager.findOne(findMyManagerCriteria).populate('myManager', 'email');


    const foundCompany = await dbModels.Company.findById(userYear._id).lean();

    console.log(foundCompany)

    let selectedCompany = '';
    let mspId = '';
    let channelId = '';
    switch (foundCompany.company_name) {
      case 'nsmartsolution':
        selectedCompany = 'nsmarts'
        mspId = "NsmartsMSP"
        channelId = "nsmartschannel"
        break;
      case 'vice':
        selectedCompany = 'vice'
        mspId = "ViceMSP"
        channelId = "vicechannel"
        break;
      default:
        selectedCompany = 'vice-kr'
        mspId = "ViceKRMSP"
        channelId = "vice-krchannel"
        break;
    }
    const ccp = buildCCP(selectedCompany);
    const gateway = new Gateway();

    await gateway.connect(ccp, { wallet, identity: userIdentity, discovery: { enabled: false, asLocalhost: false } });

    // 네트워크 채널 가져오기
    // 휴가는 전체 채널에 공유
    // 계약서만 따로 따로
    // vice-krchannel nsmarts, vice, vicekr 3조직 다있는 채널 사용. 
    const network = await gateway.getNetwork('vice-krchannel');

    // 스마트 컨트랙트 가져오기
    const contract = network.getContract('leave');

    try {
      const result = await contract.submitTransaction(
        'CreateLeaveRequest', // 스마트 컨트랙트의 함수 이름
        updatedRequest._id,
        updatedRequest.requestor,
        getManagerData.myManager,
        updatedRequest.leaveType,
        updatedRequest.leaveDay,
        updatedRequest.leaveDuration,
        updatedRequest.leave_start_date.toISOString(),
        updatedRequest.leave_end_date.toISOString(),
        updatedRequest.leave_reason,
        updatedRequest.status,
        updatedRequest.year
      );
    } catch (bcError) {
      console.error('Blockchain transaction failed:', bcError);
      throw bcError;
    }

    await gateway.disconnect();
    // 트랜잭션 커밋
    await session.commitTransaction();
    session.endSession();

    // blockchain 코드 끝 ------------------------------------

    // // 해당 직원 정보 > 가지고 있는 휴가처리 (마이너스 처리)
    // const findRequestor = {
    // 	_id: updatedRequest.requestor
    // }
    // const requestorInfo = await dbModels.Member.findOne(findRequestor);
    // if (!updatedRequest) {
    // 	return res.status(404).send('the update2 has failed');
    // }
    // // console.log('leftLeave before >>', requestorInfo);
    // // 처리과정
    // const leftLeave = requestorInfo[updatedRequest.leaveType] - updatedRequest.leaveDuration

    // if (updatedRequest.leaveType == 'annual_leave') {
    // 	updateRequestorLeave = {
    // 		annual_leave: leftLeave
    // 	}
    // } else if (updatedRequest.leaveType == 'sick_leave') {
    // 	updateRequestorLeave = {
    // 		sick_leave: leftLeave
    // 	}
    // } else if (updatedRequest.leaveType == 'replacementday_leave') {
    // 	updateRequestorLeave = {
    // 		replacementday_leave: leftLeave
    // 	}
    // }

    // // 처리후 업데이트
    // const updateRequestorInfo = await dbModels.Member.findOneAndUpdate(findRequestor, updateRequestorLeave);
    // if (!updateRequestorInfo) {
    // 	return res.status(404).send('the update3 has failed');
    // }

    // used_leave_schema 에 남기기 requestor, leaveType, leaveDuration
    const usedLeaveData = {
      requestor: updatedRequest.requestor,
      leaveType: updatedRequest.leaveType,
      leaveDuration: updatedRequest.leaveDuration
    }
    const usedLeaveRes = dbModels.UsedLeave(usedLeaveData);
    await usedLeaveRes.save();
    if (!usedLeaveRes) {
      return res.status(404).send('the update4 has failed');
    }

    //// notification ////
    const notification = await dbModels.Notification(
      {
        sender: req.decoded._id,
        receiver: data.requestor,
        notiType: 'leave-request-approve',
        isRead: false,
        iconText: 'event_available',
        notiLabel: 'A leave request approved',
        navigate: 'leave/my-status'
      }
    )

    await notification.save();
    ///////////////////////

    return res.status(200).send({
      message: 'approve',
    })

  } catch (err) {
    console.log(err);
    await session.abortTransaction();
    session.endSession();

    return res.status(500).send({
      message: 'DB Error'
    });
  }
};


// 신청한 휴가 delete
exports.deleteLeaveRequest = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Leave Request Pending List
  router.put('/delete-leave-request', approvalMngmtCtrl.deleteLeaveRequest);
  
--------------------------------------------------`);

  const data = req.body;
  // console.log(data);
  const dbModels = global.DB_MODELS;
  const session = await dbModels.LeaveRequest.startSession();
  const session2 = await dbModels.PersonalLeaveStandard.startSession();
  const session3 = await dbModels.RdRequest.startSession();

  try {
    const criteria = {
      _id: data._id
    }
    const updateData = {
      status: 'reject',
      rejectReason: data.rejectReason
    }
    ////////////////////
    // rollover 처리

    // leave type 이 annual_leave 일때만 rollover
    if (req.body.leaveType == 'annual_leave') {

      // 휴가 신청자 계약일 받아오고
      const userYear = await dbModels.Member.findOne(
        {
          _id: data.requestor
        }
      )
      // console.log(userYear);

      // 년차 뽑아옴
      const date = new Date();
      const today = moment(new Date());
      const empStartDate = moment(userYear.emp_start_date);
      const careerYear = (today.diff(empStartDate, 'years')) + 1;
      // console.log(careerYear);

      await session.startTransaction();
      await session2.startTransaction();
      await session3.startTransaction();
      // rollover 값을 우선 찾는다..
      const rolloverTotal = await dbModels.PersonalLeaveStandard.findOne(
        {
          member_id: data.requestor
        }
      )
      // rollover 변수에 duration 을 뺀 값을 저장

      // console.log(rolloverTotal.leave_standard[careerYear]);
      // console.log(rolloverTotal.leave_standard[careerYear]['rollover'] != undefined);

      if (rolloverTotal.leave_standard[careerYear]['rollover'] != undefined) {

        rollover = rolloverTotal.leave_standard[careerYear].rollover + req.body.leaveDuration;
        // console.log(rollover);

        // 위에서 구한 변수로 set
        // 여기서 한번에 다 하고 싶었으나 안됨..
        const rolloverCal = await dbModels.PersonalLeaveStandard.findOneAndUpdate(
          {
            member_id: data.requestor,
            'leave_standard.year': careerYear + 1
          },
          {
            $set: {
              'leave_standard.$.rollover': rollover
            }
          }, { new: true }
        )
        // console.log(rolloverCal.leave_standard[careerYear + 1]);
      }
    }
    ////////////////////
    if (req.body.leaveType == 'replacement_leave') {

      const ReplacementTaken = await dbModels.RdRequest.findOne(
        {
          _id: req.body.rdRequest
        }
      )
      // console.log(ReplacementTaken);

      const taken = ReplacementTaken.taken - req.body.leaveDuration

      await dbModels.RdRequest.findOneAndUpdate(
        {
          _id: req.body.rdRequest
        },
        {
          taken: taken
        }
      )
    }



    const leaveRequest = await LeaveRequest.findOneAndUpdate(criteria, updateData, { new: true });
    // // console.log(leaveRequest);

    // // 일단 보류 LeaveRequestHistory 
    // // const leaveRequestHistory = {	
    // // 	requestor: leaveRequest.requestor,
    // // 	approver: leaveRequest.approver,
    // // 	leaveType: leaveRequest.leaveType,
    // // 	leaveDay: leaveRequest.leaveDay,
    // // 	leaveDuration: leaveRequest.leaveDuration,
    // // 	leave_start_date: leaveRequest.leave_start_date,
    // // 	leave_end_date: leaveRequest.leave_end_date,
    // // 	leave_reason: leaveRequest.leave_reason,
    // // 	status: 'reject',
    // // 	year: leaveRequest.year 	
    // // }

    // // // await LeaveRequest.deleteOne(criteria);
    // // const leaveReqHistory = await LeaveRequestHistory(leaveRequestHistory)
    // // await leaveReqHistory.save();
    /**-----------------------------------
* blockchain 코드 시작 -------------------------------------------
*/
    const store = new MongoWallet();
    const wallet = new Wallet(store);
    const userIdentity = await wallet.get(userYear._id.toString());

    const findMyManagerCriteria = {
      myId: req.decoded._id,
      accepted: true
    }

    const getManagerData = await dbModels.Manager.findOne(findMyManagerCriteria).populate('myManager', 'email');


    const foundCompany = await dbModels.Company.findById(userYear._id).lean();

    console.log(foundCompany)

    let selectedCompany = '';
    let mspId = '';
    let channelId = '';
    switch (foundCompany.company_name) {
      case 'nsmartsolution':
        selectedCompany = 'nsmarts'
        mspId = "NsmartsMSP"
        channelId = "nsmartschannel"
        break;
      case 'vice':
        selectedCompany = 'vice'
        mspId = "ViceMSP"
        channelId = "vicechannel"
        break;
      default:
        selectedCompany = 'vice-kr'
        mspId = "ViceKRMSP"
        channelId = "vice-krchannel"
        break;
    }
    const ccp = buildCCP(selectedCompany);
    const gateway = new Gateway();

    await gateway.connect(ccp, { wallet, identity: userIdentity, discovery: { enabled: false, asLocalhost: false } });

    // 네트워크 채널 가져오기
    // 휴가는 전체 채널에 공유
    // 계약서만 따로 따로
    // vice-krchannel nsmarts, vice, vicekr 3조직 다있는 채널 사용. 
    const network = await gateway.getNetwork('vice-krchannel');

    // 스마트 컨트랙트 가져오기
    const contract = network.getContract('leave');

    try {
      const result = await contract.submitTransaction(
        'CreateLeaveRequest', // 스마트 컨트랙트의 함수 이름
        leaveRequest._id,
        leaveRequest.requestor,
        getManagerData.myManager,
        leaveRequest.leaveType,
        leaveRequest.leaveDay,
        leaveRequest.leaveDuration,
        leaveRequest.leave_start_date.toISOString(),
        leaveRequest.leave_end_date.toISOString(),
        leaveRequest.leave_reason,
        leaveRequest.status,
        leaveRequest.year
      );
    } catch (bcError) {
      console.error('Blockchain transaction failed:', bcError);
      throw bcError;
    }

    await gateway.disconnect();
    // 트랜잭션 커밋
    await session.commitTransaction();
    session.endSession();

    // blockchain 코드 끝 ------------------------------------




    //// notification ////
    const notification = await dbModels.Notification(
      {
        sender: req.decoded._id,
        receiver: data.requestor,
        notiType: 'leave-request-reject',
        isRead: false,
        iconText: 'event_busy',
        notiLabel: 'A leave request rejected',
        navigate: 'leave/my-status'
      }
    )

    await notification.save();
    ///////////////////////
    await session2.commitTransaction();
    await session3.commitTransaction();
    session2.endSession();
    session3.endSession();

    return res.status(200).send({
      message: 'delete'
    });

  } catch (err) {
    console.log(err);
    // 트랜잭션 롤백
    await session.abortTransaction();
    await session2.abortTransaction();
    await session3.abortTransaction();
    session.endSession();
    session2.endSession();
    session3.endSession();
    return res.status(500).send({
      message: 'DB Error'
    });
  }

};