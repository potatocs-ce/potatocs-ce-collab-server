const { default: mongoose } = require("mongoose");

exports.getLeaveRequest = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Leave Request Pending List
  router.get('/pending-leave-request', approvalMngmtCtrl.getLeaveRequest);
--------------------------------------------------`);
	const dbModels = global.DB_MODELS;
	const { active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

	const limit = parseInt(pageSize, 10);
	const skip = parseInt(pageIndex, 10) * limit;
	const sortCriteria = {
		[active]: direction === "desc" ? -1 : 1,
	};
	try {
		const pendingLeaveReqList = await dbModels.LeaveRequest.aggregate([
			{
				$match: {
					approver: new mongoose.Types.ObjectId(req.decoded._id),
					status: "pending",
				},
			},
			{
				$lookup: {
					from: "members",
					localField: "requestor",
					foreignField: "_id",
					as: "requesterInfo",
				},
			},
			{
				$unwind: {
					path: "$requesterInfo",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$project: {
					requestorName: "$requesterInfo.name",
					requestor: 1,
					leaveType: 1,
					leaveDuration: 1,
					leave_start_date: 1,
					leave_end_date: 1,
					leave_reason: 1,
					status: 1,
					createdAt: 1,
					retired: "$requesterInfo.retired",
					rdRequest: 1,
				},
			},
			{
				$match: {
					retired: false,
				},
			},
			{ $sort: sortCriteria },
			{ $skip: skip },
			{ $limit: limit },
		]);

		console.log(pendingLeaveReqList);

		return res.status(200).send({
			message: "getPendingData",
			pendingLeaveReqList,
			total_count: pendingLeaveReqList.length,
		});
	} catch (err) {
		console.log(err);
		return res.status(500).send({
			message: "DB Error",
		});
	}
};

exports.approvedLeaveRequest = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Approved Leave Request Pending List
  File : leaves_controller
  router.put('/approved-leave-request', approvalMngmtCtrl.approvedLeaveRequest);
  query: ${JSON.stringify(req.body._id)} pending leave request document id
--------------------------------------------------`);
	const dbModels = global.DB_MODELS;
	const data = req.body;
	console.log(data);
	try {
		const criteria = {
			_id: data._id,
		};

		const updateData = {
			status: "approve",
		};

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
			return res.status(404).send("the update1 has failed");
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
			leaveDuration: updatedRequest.leaveDuration,
		};
		const usedLeaveRes = dbModels.UsedLeave(usedLeaveData);
		await usedLeaveRes.save();
		if (!usedLeaveRes) {
			return res.status(404).send("the update4 has failed");
		}

		//// notification ////
		const notification = await dbModels.Notification({
			sender: req.decoded._id,
			receiver: data.requestor,
			notiType: "leave-request-approve",
			isRead: false,
			iconText: "event_available",
			notiLabel: "A leave request approved",
			navigate: "leave/my-status",
		});

		await notification.save();
		///////////////////////

		return res.status(200).send({
			message: "approve",
		});
	} catch (err) {
		console.log(err);
		return res.status(500).send({
			message: "DB Error",
		});
	}
};
