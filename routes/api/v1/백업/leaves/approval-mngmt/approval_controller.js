const { ObjectId } = require("bson");
const LeaveRequestHistory = require("../../../../../models/leave_request_history_schema");
const LeaveRequest = require("../../../../../models/leave_request_schema");
const moment = require("moment");
const { default: mongoose } = require("mongoose");
const { MongoWallet } = require("../../../../../utils/mongo-wallet");
const { Wallet, Gateway } = require("fabric-network");
const { buildCCP } = require("../../../../../utils/ca-utils");

exports.getLeaveRequest = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Leave Request Pending List
  router.get('/pending-leave-request', approvalMngmtCtrl.getLeaveRequest);
--------------------------------------------------`);
	const dbModels = global.DB_MODELS;

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

// 신청한 휴가 delete
exports.deleteLeaveRequest = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Leave Request Pending List
  router.put('/delete-leave-request', approvalMngmtCtrl.deleteLeaveRequest);
  
--------------------------------------------------`);

	const data = req.body;
	console.log(data);
	const dbModels = global.DB_MODELS;

	try {
		const criteria = {
			_id: data._id,
		};
		const updateData = {
			status: "reject",
			rejectReason: data.rejectReason,
		};
		////////////////////
		// rollover 처리

		// leave type 이 annual_leave 일때만 rollover
		if (req.body.leaveType == "annual_leave") {
			// 휴가 신청자 계약일 받아오고
			const userYear = await dbModels.Member.findOne({
				_id: data.requestor,
			});
			console.log(userYear);

			// 년차 뽑아옴
			const date = new Date();
			const today = moment(new Date());
			const empStartDate = moment(userYear.emp_start_date);
			const careerYear = today.diff(empStartDate, "years") + 1;
			console.log(careerYear);

			// rollover 값을 우선 찾는다..
			const rolloverTotal = await dbModels.PersonalLeaveStandard.findOne({
				member_id: data.requestor,
			});
			// rollover 변수에 duration 을 뺀 값을 저장

			// console.log(rolloverTotal.leave_standard[careerYear]);
			// console.log(rolloverTotal.leave_standard[careerYear]['rollover'] != undefined);

			if (rolloverTotal.leave_standard[careerYear]["rollover"] != undefined) {
				rollover = rolloverTotal.leave_standard[careerYear].rollover + req.body.leaveDuration;
				// console.log(rollover);

				// 위에서 구한 변수로 set
				// 여기서 한번에 다 하고 싶었으나 안됨..
				const rolloverCal = await dbModels.PersonalLeaveStandard.findOneAndUpdate(
					{
						member_id: data.requestor,
						"leave_standard.year": careerYear + 1,
					},
					{
						$set: {
							"leave_standard.$.rollover": rollover,
						},
					},
					{ new: true }
				);
				console.log(rolloverCal);
				console.log(rolloverCal.leave_standard[careerYear + 1]);
			}
		}
		////////////////////
		if (req.body.leaveType == "replacement_leave") {
			const ReplacementTaken = await dbModels.RdRequest.findOne({
				_id: req.body.rdRequest,
			});
			console.log(ReplacementTaken);

			const taken = ReplacementTaken.taken - req.body.leaveDuration;

			await dbModels.RdRequest.findOneAndUpdate(
				{
					_id: req.body.rdRequest,
				},
				{
					taken: taken,
				}
			);
		}

		const leaveRequest = await LeaveRequest.findOneAndUpdate(criteria, updateData);
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
		const notification = await dbModels.Notification({
			sender: req.decoded._id,
			receiver: data.requestor,
			notiType: "leave-request-reject",
			isRead: false,
			iconText: "event_busy",
			notiLabel: "A leave request rejected",
			navigate: "leave/my-status",
		});

		await notification.save();
		///////////////////////

		return res.status(200).send({
			message: "delete",
		});
	} catch (err) {
		console.log(err);
		return res.status(500).send({
			message: "DB Error",
		});
	}
};

// 승인된 휴가 취소
exports.cancelEmployeeApproveLeave = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Cancel Employee Approve Leave
  router.put('/cancel-Employee-Approve-Leave', approvalMngmtCtrl.cancelEmployeeApproveLeave); // M approve 된 휴가 취소
  
--------------------------------------------------`);

	const data = req.body;
	// console.log(data);
	const dbModels = global.DB_MODELS;

	try {
		////////////////////
		// rollover 처리
		// leave type 이 annual_leave 일때만 rollover
		// 휴가 신청자 계약일 받아오고
		// console.log(data.requestor);
		const userYear = await dbModels.Manager.aggregate([
			{
				$match: {
					_id: new mongoose.Types.ObjectId(req.body.requestor),
				},
			},
			{
				$lookup: {
					from: "members",
					localField: "myId",
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
					retired: "$requesterInfo.retired",
					name: "$requesterInfo.name",
					email: "$requesterInfo.email",
					requesterInfoId: "$requesterInfo._id",
					emp_start_date: "$requesterInfo.emp_start_date",
				},
			},
		]);

		// console.log(userYear[0]);

		// 년차 뽑아옴
		const date = new Date();
		const today = moment(new Date());
		const empStartDate = moment(userYear[0].emp_start_date);
		const careerYear = today.diff(empStartDate, "years") + 1;
		// console.log(careerYear);

		// rollover 값을 우선 찾는다..
		const rolloverTotal = await dbModels.PersonalLeaveStandard.findOne({
			member_id: userYear[0].requesterInfoId,
		});

		// console.log(rolloverTotal)

		await dbModels.LeaveRequest.findOneAndUpdate(
			{
				_id: data._id,
			},
			{
				status: "Cancel",
			}
		);
		// rollover 변수에 duration 을 뺀 값을 저장

		// // console.log(rolloverTotal);
		// // console.log(rolloverTotal.leave_standard[careerYear]);
		// // console.log(rolloverTotal.leave_standard[careerYear]['rollover'] != undefined);

		if (rolloverTotal.leave_standard[careerYear]["rollover"] != undefined) {
			if (req.body.leaveType == "annual_leave") {
				rollover = rolloverTotal.leave_standard[careerYear].rollover + req.body.leaveDuration;
				// console.log(rollover);

				// 위에서 구한 변수로 set
				// 여기서 한번에 다 하고 싶었으나 안됨..
				const rolloverCal = await dbModels.PersonalLeaveStandard.findOneAndUpdate(
					{
						member_id: userYear[0].requesterInfoId,
						"leave_standard.year": careerYear + 1,
					},
					{
						$set: {
							"leave_standard.$.rollover": rollover,
						},
					},
					{ new: true }
				);
				console.log(rolloverCal.leave_standard[careerYear + 1]);
			}
		}

		return res.status(200).send({
			message: "hihi",
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({
			message: "DB Error",
		});
	}
};

exports.getConfirmRdRequest = async (req, res) => {
	console.log(`
--------------------------------------------------  
  API  : Get Confirm RD Request List
  User: ${req.decoded._id}
  router.get('/getConfirmRdRequest', approvalMngmtCtrl.getConfirmRdRequest) 
--------------------------------------------------`);

	const dbModels = global.DB_MODELS;
	const { active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

	const limit = parseInt(pageSize, 10);
	const skip = parseInt(pageIndex, 10) * limit;
	const sortCriteria = {
		[active]: direction === "desc" ? -1 : 1,
	};
	try {
		const rdConfirmRequest = await dbModels.RdRequest.aggregate([
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
				},
			},
			{ $sort: sortCriteria },
			{ $skip: skip },
			{ $limit: limit },
		]);

		return res.status(200).send({
			message: "rdConfirmRequest",
			rdConfirmRequest,
			total_count: rdConfirmRequest?.length,
		});
	} catch (err) {
		console.log(err);
		return res.status(500).send({
			message: "DB Error",
		});
	}
};

exports.rejectReplacementRequest = async (req, res) => {
	console.log(`
--------------------------------------------------  
  API  : Reject Replacement Request ( not leave request )
  User: ${req.decoded._id}
  router.put('/rejectReplacementRequest',approvalMngmtCtrl.rejectReplacementRequest);
--------------------------------------------------`);

	const dbModels = global.DB_MODELS;
	const data = req.body;
	console.log(data);
	const session = await dbModels.RdRequest.startSession();

	try {
		await session.startTransaction();

		const reRequest = await dbModels.RdRequest.findOneAndUpdate(
			{
				_id: data._id,
			},
			{
				rejectReason: data.rejectReason,
				status: "reject",
			},
			{
				new: true,
			}
		);

		/**-----------------------------------
		 * blockchain 코드 시작 -------------------------------------------
		 */
		const foundMember = await dbModels.Member.findOne({
			_id: data.requestor,
		}).lean();

		if (!foundMember) {
			return res.status(400).json({
				message: "Member was not found!",
			});
		}

		const store = new MongoWallet();
		const wallet = new Wallet(store);
		const userIdentity = await wallet.get(data.requestor.toString());

		const findMyManagerCriteria = {
			myId: req.decoded._id,
			accepted: true,
		};

		const getManagerData = await dbModels.Manager.findOne(findMyManagerCriteria).populate("myManager", "email");

		const foundCompany = await dbModels.Company.findById(foundMember.company_id).lean();

		console.log(foundCompany);

		let selectedCompany = "";
		let mspId = "";
		let channelId = "";
		switch (foundCompany.company_name) {
			case "nsmartsolution":
				selectedCompany = "nsmarts";
				mspId = "NsmartsMSP";
				channelId = "nsmartschannel";
				break;
			case "vice":
				selectedCompany = "vice";
				mspId = "ViceMSP";
				channelId = "vicechannel";
				break;
			default:
				selectedCompany = "vice-kr";
				mspId = "ViceKRMSP";
				channelId = "vice-krchannel";
				break;
		}
		const ccp = buildCCP(selectedCompany);
		const gateway = new Gateway();

		await gateway.connect(ccp, {
			wallet,
			identity: userIdentity,
			discovery: { enabled: false, asLocalhost: false },
		});

		// 네트워크 채널 가져오기
		// 휴가는 전체 채널에 공유
		// 계약서만 따로 따로
		// vice-krchannel nsmarts, vice, vicekr 3조직 다있는 채널 사용.
		const network = await gateway.getNetwork("vice-krchannel");

		// 스마트 컨트랙트 가져오기
		const contract = network.getContract("leave");

		try {
			const result = await contract.submitTransaction(
				"CreateLeaveRequest", // 스마트 컨트랙트의 함수 이름
				reRequest._id,
				reRequest.requestor,
				getManagerData.myManager,
				reRequest.leaveType,
				reRequest.leaveDay,
				reRequest.leaveDuration,
				reRequest.leave_start_date.toISOString(),
				reRequest.leave_end_date.toISOString(),
				reRequest.leave_reason,
				reRequest.status,
				""
			);
		} catch (bcError) {
			console.error("Blockchain transaction failed:", bcError);
			throw bcError;
		}

		await gateway.disconnect();
		// 트랜잭션 커밋
		await session.commitTransaction();
		session.endSession();

		// blockchain 코드 끝 ------------------------------------

		const notification = await dbModels.Notification({
			sender: req.decoded._id,
			receiver: data.requestor,
			notiType: "rd-request-reject",
			isRead: false,
			iconText: "assignment_late",
			notiLabel: "A replacement day request rejected",
			navigate: "leave/rd-request-list",
		});

		await notification.save();
		///////////////////////

		return res.status(200).send({
			message: "delete",
		});
	} catch (err) {
		console.log(err);
		await session.commitTransaction();
		session.endSession();
		return res.status(500).send({
			message: "DB Error",
		});
	}
};

exports.approveReplacementRequest = async (req, res) => {
	console.log(`
--------------------------------------------------  
  API  : Approve Replacement Request ( not leave request )
  User: ${req.decoded._id}
  router.put('/approveReplacementRequest',approvalMngmtCtrl.approveReplacementRequest);
--------------------------------------------------`);

	const dbModels = global.DB_MODELS;
	const data = req.body;
	console.log(data);
	const session = await dbModels.RdRequest.startSession();
	const session2 = await dbModels.PersonalLeaveStandard.startSession();
	try {
		await session.startTransaction();
		await session2.startTransaction();

		const reRequest = await dbModels.RdRequest.findOneAndUpdate(
			{
				_id: data._id,
			},
			{
				status: "approve",
			},
			{
				new: true,
			}
		);

		// personalLeaveRequest 에 더해줘야함
		// 원래 replacement 개수 찾기
		const replacementTotal = await dbModels.PersonalLeaveStandard.findOne({
			member_id: data.requestor,
		});
		// 사원 계약일 찾기
		const memberInfo = await dbModels.Member.findOne({
			_id: data.requestor,
		});

		// 년차 찾기
		const today = moment(new Date());
		const empStartDate = moment(memberInfo.emp_start_date);
		const careerYear = today.diff(empStartDate, "years");

		// 위에서 찾은거에 새로 들어온거 더해주기
		const replacementDay = replacementTotal.leave_standard[careerYear].replacement_leave + data.leaveDuration;

		// 더해준거 반영
		await dbModels.PersonalLeaveStandard.findOneAndUpdate(
			{
				member_id: data.requestor,
				"leave_standard.year": careerYear + 1,
			},
			{
				$set: {
					"leave_standard.$.replacement_leave": replacementDay,
				},
			}
		);

		/**-----------------------------------
		 * blockchain 코드 시작 -------------------------------------------
		 */
		const store = new MongoWallet();
		const wallet = new Wallet(store);
		const userIdentity = await wallet.get(memberInfo._id.toString());

		const findMyManagerCriteria = {
			myId: req.decoded._id,
			accepted: true,
		};

		const getManagerData = await dbModels.Manager.findOne(findMyManagerCriteria).populate("myManager", "email");

		const foundCompany = await dbModels.Company.findById(memberInfo.company_id).lean();

		console.log(foundCompany);

		let selectedCompany = "";
		let mspId = "";
		let channelId = "";
		switch (foundCompany.company_name) {
			case "nsmartsolution":
				selectedCompany = "nsmarts";
				mspId = "NsmartsMSP";
				channelId = "nsmartschannel";
				break;
			case "vice":
				selectedCompany = "vice";
				mspId = "ViceMSP";
				channelId = "vicechannel";
				break;
			default:
				selectedCompany = "vice-kr";
				mspId = "ViceKRMSP";
				channelId = "vice-krchannel";
				break;
		}
		const ccp = buildCCP(selectedCompany);
		const gateway = new Gateway();

		await gateway.connect(ccp, {
			wallet,
			identity: userIdentity,
			discovery: { enabled: false, asLocalhost: false },
		});

		// 네트워크 채널 가져오기
		// 휴가는 전체 채널에 공유
		// 계약서만 따로 따로
		// vice-krchannel nsmarts, vice, vicekr 3조직 다있는 채널 사용.
		const network = await gateway.getNetwork("vice-krchannel");

		// 스마트 컨트랙트 가져오기
		const contract = network.getContract("leave");

		try {
			const result = await contract.submitTransaction(
				"CreateLeaveRequest", // 스마트 컨트랙트의 함수 이름
				reRequest._id,
				reRequest.requestor,
				getManagerData.myManager,
				reRequest.leaveType,
				reRequest.leaveDay,
				reRequest.leaveDuration,
				reRequest.leave_start_date.toISOString(),
				reRequest.leave_end_date.toISOString(),
				reRequest.leave_reason,
				reRequest.status,
				""
			);
		} catch (bcError) {
			console.error("Blockchain transaction failed:", bcError);
			throw bcError;
		}

		await gateway.disconnect();
		// 트랜잭션 커밋
		await session.commitTransaction();
		session.endSession();

		// blockchain 코드 끝 ------------------------------------

		const notification = await dbModels.Notification({
			sender: req.decoded._id,
			receiver: data.requestor,
			notiType: "rd-request-approve",
			isRead: false,
			iconText: "assignment_turned_in",
			notiLabel: "A replacement day request approved",
			navigate: "leave/rd-request-list",
		});

		await notification.save();
		///////////////////////

		await session2.commitTransaction();
		session2.endSession();

		return res.status(200).send({
			message: "approve",
		});
	} catch (err) {
		console.log(err);

		await session.abortTransaction();
		await session2.abortTransaction();
		session.endSession();
		session2.endSession();

		return res.status(500).send({
			message: "DB Error",
		});
	}
};
