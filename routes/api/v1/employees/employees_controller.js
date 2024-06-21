
const { ObjectId } = require('bson');
const { default: mongoose } = require('mongoose');

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
  try {

    const criteria = {
      _id: data._id
    }

    const updateData = {
      status: 'approve'
    }

    // 휴가 승인 업데이트
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
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};