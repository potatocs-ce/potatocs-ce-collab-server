const { default: mongoose } = require('mongoose');
const moment = require("moment");

exports.getLeaveRequest = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Leave Request Pending List
  router.get('/pending-leave-request', approvalMngmtCtrl.getLeaveRequest);
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

    const pendingLeaveReqList = await dbModels.LeaveRequest.aggregate([
      {
        $match: {
          approver: new mongoose.Types.ObjectId(req.decoded._id),
          status: 'pending'
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'requestor',
          foreignField: '_id',
          as: 'requesterInfo'
        },
      },
      {
        $unwind: {
          path: '$requesterInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          requestorName: '$requesterInfo.name',
          requestor: 1,
          leaveType: 1,
          leaveDuration: 1,
          leave_start_date: 1,
          leave_end_date: 1,
          leave_reason: 1,
          status: 1,
          createdAt: 1,
          retired: '$requesterInfo.retired',
          rdRequest: 1,
        }
      }, {
        $match: {
          retired: false
        }
      },
      { $sort: sortCriteria },
      { $skip: skip },
      { $limit: limit }
    ]);


    console.log(pendingLeaveReqList);

    return res.status(200).send({
      message: 'getPendingData',
      pendingLeaveReqList,
      total_count: pendingLeaveReqList.length

    })
  } catch (err) {
    console.log(err)
    return res.status(500).send({
      message: 'DB Error'
    });
  }

}



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



// 신청한 휴가 거절
exports.rejectLeaveRequest = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Leave Request Pending List
  router.put('/employees/leaves/requests', approvalMngmtCtrl.rejectLeaveRequest);
  
--------------------------------------------------`);

  const data = req.body;
  console.log(data);
  const dbModels = global.DB_MODELS;

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
      console.log(userYear);

      // 년차 뽑아옴
      const date = new Date();
      const today = moment(new Date());
      const empStartDate = moment(userYear.emp_start_date);
      const careerYear = (today.diff(empStartDate, 'years')) + 1;
      console.log(careerYear);

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
        console.log(rolloverCal)
        console.log(rolloverCal.leave_standard[careerYear + 1]);
      }
    }
    ////////////////////
    if (req.body.leaveType == 'replacement_leave') {

      const ReplacementTaken = await dbModels.RdRequest.findOne(
        {
          _id: req.body.rdRequest
        }
      )
      console.log(ReplacementTaken);

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



    const leaveRequest = await dbModels.LeaveRequest.findOneAndUpdate(criteria, updateData);
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

    return res.status(200).send({
      message: 'delete'
    });

  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: 'DB Error'
    });
  }

};

// pending 상태의 자기가 신청한 휴가 취소
exports.cancelMyRequestLeave = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Get My Reqeust List Search
  User: ${req.decoded._id}
  router.delete('/delete-request-leave', leaveMngmtCtrl.deleteRequestLeave); // 신청한 휴가 취소
--------------------------------------------------`);


  const data = req.body;
  // console.log(data);

  // console.log(match_criteria);

  const dbModels = global.DB_MODELS;
  try {
    ////////////////////
    // rollover 처리
    // leave type 이 annual_leave 일때만 rollover
    // 휴가 신청자 계약일 받아오고
    // console.log(data.requestor);
    const userYear = await dbModels.Member.findOne(
      {
        _id: data.requestor
      }
    )
    // console.log('userYear');
    // console.log(userYear);

    // 년차 뽑아옴
    const date = new Date();
    const today = moment(new Date());
    const empStartDate = moment(userYear.emp_start_date);
    const careerYear = (today.diff(empStartDate, 'years')) + 1;
    // console.log(careerYear);



    // rollover 값을 우선 찾는다..
    // console.log(data);
    const rolloverTotal = await dbModels.PersonalLeaveStandard.findOne(
      {
        member_id: data.requestor
      }
    )


    const leaveRequest = await dbModels.LeaveRequest.findOneAndUpdate(
      {
        _id: data._id
      },
      {
        status: 'Cancel'
      }
    )
    // console.log(leaveRequest)
    // rollover 변수에 duration 을 뺀 값을 저장

    // console.log(rolloverTotal);
    // console.log(rolloverTotal.leave_standard[careerYear]);
    // console.log(rolloverTotal.leave_standard[careerYear]['rollover'] != undefined);

    if (rolloverTotal.leave_standard[careerYear]['rollover'] != undefined) {
      if (req.body.leaveType == 'annual_leave') {

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

    if (data.leaveType == 'replacement_leave') {
      const rdTaken = await dbModels.RdRequest.findOne(
        {
          _id: leaveRequest.rdRequest
        }
      )
      // console.log(rdTaken);
      const taken = rdTaken.taken - data.leaveDuration
      const rdRequest = await dbModels.RdRequest.findOneAndUpdate(
        {
          _id: leaveRequest.rdRequest
        },
        {
          taken: taken
        }
      )
    }



    return res.status(200).send({
      message: 'hihi'
    });

  } catch (error) {
    console.log(error)
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};