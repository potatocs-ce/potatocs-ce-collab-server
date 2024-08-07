const { ObjectId } = require("bson");
const LeaveRequestHistory = require("../../../../../models/leave_request_history_schema");
const LeaveRequest = require("../../../../../models/leave_request_schema");
const moment = require("moment");
const mongoose = require("mongoose");

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

		// console.log(pendingLeaveReqList);

		return res.status(200).send({
			message: "getPendingData",
			pendingLeaveReqList,
		});
	} catch (err) {
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
	const session = await dbModels.LeaveRequest.startSession();

	try {
		const criteria = {
			_id: data._id,
		};

		const updateData = {
			status: "approve",
		};

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
			return res.status(404).send("the update1 has failed");
		}

		console.log("block chain code start");
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
		const network = await gateway.getNetwork("vice-krchannel");
		console.log("11111111111111111111111");
		// 스마트 컨트랙트 가져오기
		const contract = network.getContract("leave");
		console.log("22222222222222222222222222222222");

		try {
			console.log("체인코드 초기화 시작");
			// 체인코드 초기화
			// await contract.submitTransaction("Init");
			// console.log("체인코드 초기화 완료");

			console.log("3333333333333333333333333333");
			const result = await contract.submitTransaction(
				"CreateLeaveRequest", // 스마트 컨트랙트의 함수 이름
				updatedRequest._id,
				updatedRequest.requestor,
				updatedRequest.leaveType,
				updatedRequest.leaveDay,
				updatedRequest.leaveDuration,
				updatedRequest.leave_start_date.toISOString(),
				updatedRequest.leave_end_date.toISOString(),
				updatedRequest.leave_reason
			);
			console.log("Transaction has been submitted", result);
		} catch (bcError) {
			console.error("Blockchain transaction failed:", bcError);
			throw bcError;
		}

		console.log("4444444444444444444444444444444");
		await gateway.disconnect();
		// 트랜잭션 커밋
		await session.commitTransaction();
		session.endSession();

		console.log("block chain 끝");
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
		await session.abortTransaction();
		session.endSession();

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
	const dbModels = global.DB_MODELS;
	console.log(data);
	console.log("-------------------------------------------------");
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

			// 년차 뽑아옴
			const date = new Date();
			const today = moment(new Date());
			const empStartDate = moment(userYear.emp_start_date);
			const careerYear = today.diff(empStartDate, "years") + 1;
			console.log(careerYear);

			///////////////////////////////////////마이너스 연차 복구하는 부분 /////////////////////////////////////////////////
			const criteria = {
				_id: data.requestor,
			};

			const projection = "emp_start_date";

			// 계약일 가져오기
			const userContractInfo = await dbModels.Member.findOne(criteria, projection);
			// console.log(userContractInfo)
			if (userContractInfo.emp_start_date == null) {
				return res.send({
					message: "yet",
				});
			}

			// 년차 일 가져오기
			const startYear = moment(userContractInfo.emp_start_date.getTime())
				.add(careerYear - 1, "y")
				.format("YYYY-MM-DD");
			// console.log(startYear);

			const endYear = moment(userContractInfo.emp_start_date.getTime())
				.add(careerYear, "y")
				.subtract(1, "d")
				.format("YYYY-MM-DD");
			// console.log(endYear);

			//내가 사용한 연차
			const usedLeave = await dbModels.LeaveRequest.find({
				requestor: data.requestor,
				leave_start_date: { $gte: startYear, $lte: endYear },
				status: {
					$in: ["pending", "approve"],
				},
			});

			//전체 연차
			const totalLeave = await dbModels.PersonalLeaveStandard.findOne({ member_id: data.requestor });

			//내 연차
			const MyTotalLeave = totalLeave.leave_standard.find((item) => item.year == careerYear);
			let NextYearTotalLeave = totalLeave.leave_standard.find((item) => item.year == careerYear + 1);
			/////////////////////////////////////////////////
			// 넥스트이어 연차가 없을 경우, 0으로 초기화해줌
			if (!NextYearTotalLeave) {
				NextYearTotalLeave = { annual_leave: 0 };
			} else if (!NextYearTotalLeave.hasOwnProperty("annual_leave")) {
				NextYearTotalLeave.annual_leave = 0;
			}
			////////////////////////////////////////////////
			let used_annual_leave = 0;
			for (let index = 0; index < usedLeave.length; index++) {
				if (usedLeave[index].leaveType == "annual_leave") {
					used_annual_leave += usedLeave[index].leaveDuration;
				}
			}

			//내가 사용한 연차 + 내가 취소할 연차 + 내 연차
			//그럼MyTotalLeave.annual_leave - used_annual_leave   하면 현재 내 연차 상태가 나오겠네
			//그리고 MyTotalLeave.annual_leave - used_annual_leave + req.body.leaveDuration 하면 현재 내 연차가 어떻게 될지 나오겠네
			console.log(
				"used_annual_leave:",
				used_annual_leave,
				"req.body:",
				req.body.leaveDuration,
				"MyTotalLeave.annual_leave:",
				MyTotalLeave.annual_leave
			);

			// 올해연차가 + 인상황에서 - 가 됐을때는  이렇게 계산해야되고
			if (MyTotalLeave.annual_leave - used_annual_leave < 0) {
				//지금 reject하려는 연차일수(Days)가 내년연차에서 -된 것보다 클때
				if (MyTotalLeave.annual_leave - used_annual_leave + req.body.leaveDuration > 0) {
					NextYearTotalLeave.annual_leave =
						NextYearTotalLeave.annual_leave + (used_annual_leave - MyTotalLeave.annual_leave);
				} else {
					NextYearTotalLeave.annual_leave = NextYearTotalLeave.annual_leave + req.body.leaveDuration;
				}
			}
			//저장할때 NextYearTotalLeave.annual_leave가 마이너스면 저장안하고 리턴
			if (NextYearTotalLeave?.annual_leave < 0) {
				console.log("왜 여기서 터지지???", NextYearTotalLeave?.annual_leave);
				return res.status(500).send({
					message: "no next annual leave",
				});
			}

			await dbModels.PersonalLeaveStandard.updateOne(
				{ member_id: data.requestor },
				{ $set: { [`leave_standard.${careerYear}.annual_leave`]: NextYearTotalLeave?.annual_leave } }
			).then((res) => {
				console.log(res);
			});

			////////////////////////////////////////임호균 박재현 수정 완료 부분///////////////////

			// rollover 값을 우선 찾는다..
			const rolloverTotal = await dbModels.PersonalLeaveStandard.findOne({
				member_id: data.requestor,
			});
			// rollover 변수에 duration 을 뺀 값을 저장

			// console.log(rolloverTotal.leave_standard[careerYear]);
			// console.log(rolloverTotal.leave_standard[careerYear]['rollover'] != undefined);

			if (
				rolloverTotal.leave_standard[careerYear] &&
				rolloverTotal.leave_standard[careerYear]["rollover"] != undefined
			) {
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
	console.log("----------------------data---------------------------");
	console.log(data);
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
		console.log("----------------------vv----------------------");
		console.log(userYear);

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
		]);

		totalCount = rdConfirmRequest.length;

		return res.status(200).send({
			message: "rdConfirmRequest",
			rdConfirmRequest,
			totalCount,
		});
	} catch (err) {
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
	try {
		await dbModels.RdRequest.findOneAndUpdate(
			{
				_id: data._id,
			},
			{
				rejectReason: data.rejectReason,
				status: "reject",
			}
		);

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
	try {
		await dbModels.RdRequest.findOneAndUpdate(
			{
				_id: data._id,
			},
			{
				status: "approve",
			}
		);

		// personalLeaveRequest 에 더해줘야함
		// 원래 replacement 개수 찾기
		const replacementTotal = await dbModels.PersonalLeaveStandard.findOne({
			member_id: data.requestor,
		});
		// 사원 계약일 찾기
		const memberInfo = await dbModels.Member.findOne(
			{
				_id: data.requestor,
			},
			{
				emp_start_date: 1,
			}
		);

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

		return res.status(200).send({
			message: "approve",
		});
	} catch (err) {
		return res.status(500).send({
			message: "DB Error",
		});
	}
};
