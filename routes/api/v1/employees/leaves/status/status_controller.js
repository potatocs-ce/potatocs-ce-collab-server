
const { default: mongoose } = require('mongoose');


exports.myEmployeesLeavesListSearch = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get my Employee Leave List
  router.get('/myEmployee-leaveList', employeeMngmtCtrl.myEmployeeLeaveList);
--------------------------------------------------`);
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

  const data = req.query;
  // console.log(data.emailFind);
  if (data.emailFind == '' || data.emailFind == 'null') {
    data.emailFind = 'all';
  }
  // console.log(data.emailFind);
  // console.log(data);

  startDatee = new Date(data.leave_start_date);
  endDatee = new Date(data.leave_end_date);

  const dbModels = global.DB_MODELS;
  try {

    // 관리하고 있는 직원들 in manager
    // myManager > 매니저 아이디, myId > 직원 아이디, accepted: true or false, 펜딩 or 수락

    const myEmployeeLeaveListSearch = await dbModels.Manager.aggregate([
      {
        $match: {
          myManager: new mongoose.Types.ObjectId(req.decoded._id),
        }
      },
      {
        $lookup: {
          from: 'leaverequests',
          localField: 'myId',
          foreignField: 'requestor',
          as: 'leave'
        },
      },
      {
        $lookup: {
          from: 'members',
          localField: 'myId',
          foreignField: '_id',
          as: 'memberName'
        },
      },
      {
        $lookup: {
          from: 'members',
          localField: 'myManager',
          foreignField: '_id',
          as: 'approverName'
        },
      },
      {
        $unwind: {
          path: '$leave',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$memberName',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          leaveTypeStand: 'all',
          emailStand: 'all'
        }
      },
      {
        $project: {
          requestId: '$leave._id',
          name: '$memberName.name',
          duration: '$leave.leaveDuration',
          leaveType: '$leave.leaveType',
          leaveTypeStand: {
            $cond: {
              if: { $eq: ["$leave.leaveType", data.type] },
              then: data.type,
              else: 'all'
            }
          },
          startDate: '$leave.leave_start_date',
          endDate: '$leave.leave_end_date',
          email: '$memberName.email',

          emailStand: {
            $cond: {
              if: { $eq: ['$memberName.email', data.emailFind] },
              then: '$memberName.email',
              else: 'all'
            }
          },
          status: '$leave.status',
          createdAt: '$leave.createdAt',
          approver: '$approverName.name',
          leave_reason: '$leave.leave_reason',
          rejectReason: '$leave.rejectReason',
          retired: '$memberName.retired'
        }
      },
      {
        $match: {
          startDate: { $gte: startDatee, $lte: endDatee },
          emailStand: data.emailFind,
          leaveTypeStand: data.type,
          retired: false
        }
      },
      {
        $sort: {
          startDate: -1
        }
      },
      { $sort: sortCriteria },
      { $skip: skip },
      { $limit: limit }
    ]);
    // console.log(myEmployeeLeaveListSearch);


    const myEmployeeList = await dbModels.Manager.aggregate([
      {
        $match: {
          myManager: new mongoose.Types.ObjectId(req.decoded._id),
          accepted: true
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'myId',
          foreignField: '_id',
          as: 'myEmployeeInfo'
        },
      },
      {
        $unwind: {
          path: '$myEmployeeInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          name: '$myEmployeeInfo.name',
          email: '$myEmployeeInfo.email',
        }
      }
    ]);
    // console.log(myEmployeeList);

    return res.status(200).send({
      message: 'my Employee Leave list',
      myEmployeeLeaveListSearch,
      myEmployeeList,
      total_count: myEmployeeLeaveListSearch?.length
    });
  } catch (err) {
    console.log(err)
    return res.status(500).send('DB Error');
  }
};
