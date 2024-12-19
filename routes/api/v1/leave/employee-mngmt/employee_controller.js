const member = require("../../../../../models/member_schema");
const mongoose = require("mongoose");

exports.getPendingList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Pending List
  router.get('/pending-list', employeeMngmtCtrl.getPendingList);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const pendingList = await dbModels.Manager.aggregate([
            {
                $match: {
                    myManager: new mongoose.Types.ObjectId(req.decoded._id),
                    accepted: false,
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
                    _id: 1,
                },
            },
            {
                $match: {
                    retired: false,
                },
            },
        ]);

        return res.status(200).send({
            message: "found",
            pendingList,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "DB Error",
        });
    }
};

exports.cancelRequest = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Cancel Employee's request
	router.delete('/cancel-request', employeeMngmtCtrl.cancelRequest);

	manager_id  : ${req.params.id}
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        const criteria = {
            _id: req.params.id,
        };

        const deleteManager = await dbModels.Manager.findOneAndDelete(criteria);
        // 2024-07-19 park
        // 이미 deleteManager.myManager가 다른 멤버의 매니저인 경우, isManager를 false로 바꾸면 안되기 때문에
        // 다른 멤버의 매니저인지 확인
        const isManager = await dbModels.Manager.findOne({ myManager: deleteManager.myManager });

        if (!isManager) {
            await member.findOneAndUpdate(
                {
                    _id: deleteManager.myManager,
                },
                {
                    isManager: false,
                }
            );
        }
        return res.status(200).send({
            message: "canceled",
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "DB Error",
        });
    }
};

exports.acceptRequest = async (req, res) => {
    console.log(`
--------------------------------------------------  
	User : ${req.decoded._id}  
	API  : put acceptRequest
	router.put('/accept-request', employeeMngmtCtrl.acceptRequest) 
	query: ${JSON.stringify(req.body)} docId, userId
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;

    try {
        const updateCriteria = {
            _id: req.body.docId,
            myId: req.body.userId,
        };

        const updateData = {
            accepted: true,
        };

        const updatedData = await dbModels.Manager.findOneAndUpdate(updateCriteria, updateData);
        if (!updatedData) {
            return res.status(404).send("the update has failed");
        }

        const criteria = {
            _id: req.decoded._id,
        };

        const updateManagerData = {
            isManager: true,
        };

        const updatedUser = await dbModels.Member.findOneAndUpdate(criteria, updateManagerData);
        if (!updatedUser) {
            return res.status(404).send("the user update has failed");
        }

        return res.status(200).send({
            message: "accepted",
        });
    } catch (err) {
        return res.status(500).send({
            message: "DB Error",
        });
    }
};

exports.myEmployeeList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get my Employee List
  router.get('/myEmployee-list', employeeMngmtCtrl.myEmployeeList);
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;

    try {
        // 관리하고 있는 직원들 in manager
        // myManager > 매니저 아이디, myId > 직원 아이디, accepted: true or false, 펜딩 or 수락

        const manager = await dbModels.Manager.find(
            {
                myManager: new mongoose.Types.ObjectId(req.decoded._id),
            },
            {
                myId: 1,
                accepted: 1,
            }
        ).lean();

        const mngEmployee = [];

        for (let index = 0; index < manager.length; index++) {
            const element = manager[index].myId;
            mngEmployee.push(element);
        }

        const myEmployeeList = await dbModels.Member.aggregate([
            {
                $match: {
                    _id: { $in: mngEmployee },
                    retired: false,
                },
            },
            {
                $lookup: {
                    from: "personalleavestandards",
                    localField: "_id",
                    foreignField: "member_id",
                    as: "totalLeave",
                },
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
                            unit: "year",
                        },
                    },

                    // dateCompare : 그래서 이 친구가 필요, 이 친구가 현재와 계약 달, 일을 비교해서 1을 빼줄지 말지 정해줌 -> 오류
                    // 오류 수정을 위한 수정된 코드
                    // 달끼리 일끼리 비교하니까 오류가 나서 달일 달일 로 비교하기 위한 방법
                    emp_start: {
                        $dateFromParts: {
                            year: { $year: "$$NOW" },
                            month: { $month: "$$NOW" },
                            day: { $dayOfMonth: "$$NOW" },
                        },
                    },
                    now_date: {
                        $dateFromParts: {
                            year: { $year: "$$NOW" },
                            month: { $month: "$emp_start_date" },
                            day: { $dayOfMonth: "$emp_start_date" },
                        },
                    },
                },
            },
            {
                // 위의 emp_start, now_date 를 가지고 dateCompare
                $addFields: {
                    dateCompare: {
                        $cond: [
                            {
                                $and: [
                                    // {$gte: [ {$month: '$$NOW'}, {$month:'$emp_start_date'}]},
                                    // {$gte: [ {$dayOfMonth :"$$NOW"}, {$dayOfMonth: '$emp_start_date'}]},
                                    { $gte: ["$emp_start", "$now_date"] },
                                ],
                            },
                            0,
                            1,
                        ],
                    },
                },
            },
            {
                // dateDiff 와 dateCompare 의 차 를 year로
                $addFields: {
                    year: {
                        $subtract: ["$dateDiff", "$dateCompare"],
                    },
                },
            },
            {
                $lookup: {
                    from: "leaverequests",
                    let: {
                        userId: "$_id",
                        years: "$year",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ["$requestor", "$$userId"] }, { $eq: ["$year", "$$years"] }],
                                },
                            },
                        },
                        {
                            $facet: {
                                used_annual_leave: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$leaveType", "annual_leave"] },
                                                    {
                                                        $or: [{ $eq: ["$status", "approve"] }, { $eq: ["$status", "pending"] }],
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                    {
                                        $group: {
                                            _id: null,
                                            sum: {
                                                $sum: "$leaveDuration",
                                            },
                                        },
                                    },
                                ],
                                used_rollover: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$leaveType", "rollover"] },
                                                    {
                                                        $or: [{ $eq: ["$status", "approve"] }, { $eq: ["$status", "pending"] }],
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                    {
                                        $group: {
                                            _id: null,
                                            sum: {
                                                $sum: "$leaveDuration",
                                            },
                                        },
                                    },
                                ],
                                used_sick_leave: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$leaveType", "sick_leave"] },
                                                    {
                                                        $or: [{ $eq: ["$status", "approve"] }, { $eq: ["$status", "pending"] }],
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                    {
                                        $group: {
                                            _id: null,
                                            sum: {
                                                $sum: "$leaveDuration",
                                            },
                                        },
                                    },
                                ],
                                used_replacement_leave: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$leaveType", "replacement_leave"] },
                                                    {
                                                        $or: [{ $eq: ["$status", "approve"] }, { $eq: ["$status", "pending"] }],
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                    {
                                        $group: {
                                            _id: null,
                                            sum: {
                                                $sum: "$leaveDuration",
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                    as: "usedLeave",
                },
            },
            {
                $unwind: {
                    path: "$totalLeave",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $unwind: {
                    path: "$usedLeave",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "nationalholidays",
                    localField: "location",
                    foreignField: "_id",
                    as: "countryName",
                },
            },
            {
                $unwind: {
                    path: "$countryName",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    year: 1,
                    position: 1,
                    location: "$countryName.countryName",
                    emp_start_date: 1,
                    emp_end_date: 1,
                    isManager: 1,
                    totalLeave: {
                        $arrayElemAt: ["$totalLeave.leave_standard", "$year"],
                    },
                    usedLeave: 1,
                },
            },
        ]);

        return res.status(200).send({
            message: "found",
            myEmployeeList,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "DB Error",
        });
    }
};

exports.getEmployeeInfo = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get my Employee Info to edit
  router.get('/employee-info', employeeMngmtCtrl.getEmployeeInfo);
  a employee_id : ${req.params.id}
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;

    try {
        const criteria = {
            _id: req.params.id,
        };

        const projection = "name position location emp_start_date emp_end_date annual_leave sick_leave replacementday_leave";

        const employee = await dbModels.Member.findOne(criteria, projection);

        if (!employee) {
            return res.status(400).send({
                message: "Cannot find the manager",
            });
        }

        return res.status(200).send({
            message: "found",
            employee,
        });
    } catch (err) {
        return res.status(500).send("DB Error");
    }
};

exports.UpdateEmployeeInfo = async (req, res) => {
    console.log(`
--------------------------------------------------  
	User : ${req.decoded._id}  
	API  : put UpdateEmployeeInfo
	router.put('/put-employee-info', employeeMngmtCtrl.UpdateEmployeeInfo) 
	query: ${JSON.stringify(req.body)} update UserInfo
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;

    try {
        const criteria = {
            _id: req.body.employeeId,
        };

        const updateData = {
            name: req.body.name,
            position: req.body.position,
            location: req.body.location,
            emp_start_date: req.body.emp_start_date,
            emp_end_date: req.body.emp_end_date,
            annual_leave: req.body.annual_leave,
            sick_leave: req.body.sick_leave,
            replacementday_leave: req.body.replacementday_leave,
        };

        const employee = await dbModels.Member.findOneAndUpdate(criteria, updateData);

        if (!employee) {
            return res.status(400).send({
                message: "Cannot find the manager",
            });
        }

        return res.status(200).send({
            message: "updated",
        });
    } catch (err) {
        return res.status(500).send("DB Error");
    }
};

exports.myEmployeeLeaveListSearch = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get my Employee Leave List
  router.get('/myEmployee-leaveList', employeeMngmtCtrl.myEmployeeLeaveList);
--------------------------------------------------`);

    const { active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

    const limit = parseInt(pageSize, 10);
    const skip = parseInt(pageIndex, 10) * limit;
    const sortCriteria = {
        [active]: direction === "desc" ? -1 : 1,
    };

    const data = req.query;

    if (data.emailFind == "" || data.emailFind == "null") {
        data.emailFind = "all";
    }

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
                },
            },
            {
                $lookup: {
                    from: "leaverequests",
                    localField: "myId",
                    foreignField: "requestor",
                    as: "leave",
                },
            },
            {
                $lookup: {
                    from: "members",
                    localField: "myId",
                    foreignField: "_id",
                    as: "memberName",
                },
            },
            {
                $lookup: {
                    from: "members",
                    localField: "myManager",
                    foreignField: "_id",
                    as: "approverName",
                },
            },
            {
                $unwind: {
                    path: "$leave",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $unwind: {
                    path: "$memberName",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    leaveTypeStand: "all",
                    emailStand: "all",
                },
            },
            {
                $project: {
                    requestId: "$leave._id",
                    name: "$memberName.name",
                    duration: "$leave.leaveDuration",
                    leaveType: "$leave.leaveType",
                    leaveTypeStand: {
                        $cond: {
                            if: { $eq: ["$leave.leaveType", data.type] },
                            then: data.type,
                            else: "all",
                        },
                    },
                    startDate: "$leave.leave_start_date",
                    endDate: "$leave.leave_end_date",
                    email: "$memberName.email",

                    emailStand: {
                        $cond: {
                            if: { $eq: ["$memberName.email", data.emailFind] },
                            then: "$memberName.email",
                            else: "all",
                        },
                    },
                    status: "$leave.status",
                    createdAt: "$leave.createdAt",
                    approver: "$approverName.name",
                    leave_reason: "$leave.leave_reason",
                    rejectReason: "$leave.rejectReason",
                    retired: "$memberName.retired",
                },
            },
            {
                $match: {
                    startDate: { $gte: startDatee, $lte: endDatee },
                    emailStand: data.emailFind,
                    leaveTypeStand: data.type,
                    retired: false,
                },
            },
            {
                $sort: {
                    startDate: -1,
                },
            },
            { $sort: sortCriteria },
            { $skip: skip },
            { $limit: limit },
        ]);

        const totalCount = await dbModels.Manager.aggregate([
            {
                $match: {
                    myManager: new mongoose.Types.ObjectId(req.decoded._id),
                },
            },
            {
                $lookup: {
                    from: "leaverequests",
                    localField: "myId",
                    foreignField: "requestor",
                    as: "leave",
                },
            },
            {
                $lookup: {
                    from: "members",
                    localField: "myId",
                    foreignField: "_id",
                    as: "memberName",
                },
            },
            {
                $lookup: {
                    from: "members",
                    localField: "myManager",
                    foreignField: "_id",
                    as: "approverName",
                },
            },
            {
                $unwind: {
                    path: "$leave",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $unwind: {
                    path: "$memberName",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    leaveTypeStand: "all",
                    emailStand: "all",
                },
            },
            {
                $project: {
                    requestId: "$leave._id",
                    name: "$memberName.name",
                    duration: "$leave.leaveDuration",
                    leaveType: "$leave.leaveType",
                    leaveTypeStand: {
                        $cond: {
                            if: { $eq: ["$leave.leaveType", data.type] },
                            then: data.type,
                            else: "all",
                        },
                    },
                    startDate: "$leave.leave_start_date",
                    endDate: "$leave.leave_end_date",
                    email: "$memberName.email",
                    emailStand: {
                        $cond: {
                            if: { $eq: ["$memberName.email", data.emailFind] },
                            then: "$memberName.email",
                            else: "all",
                        },
                    },
                    status: "$leave.status",
                    createdAt: "$leave.createdAt",
                    approver: "$approverName.name",
                    leave_reason: "$leave.leave_reason",
                    rejectReason: "$leave.rejectReason",
                    retired: "$memberName.retired",
                },
            },
            {
                $match: {
                    startDate: { $gte: startDatee, $lte: endDatee },
                    emailStand: data.emailFind,
                    leaveTypeStand: data.type,
                    retired: false,
                },
            },
            {
                $count: "totalCount",
            },
        ]);

        const totalDocuments = totalCount[0] ? totalCount[0].totalCount : 0;
        const myEmployeeList = await dbModels.Manager.aggregate([
            {
                $match: {
                    myManager: new mongoose.Types.ObjectId(req.decoded._id),
                    accepted: true,
                },
            },
            {
                $lookup: {
                    from: "members",
                    localField: "myId",
                    foreignField: "_id",
                    as: "myEmployeeInfo",
                },
            },
            {
                $unwind: {
                    path: "$myEmployeeInfo",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    name: "$myEmployeeInfo.name",
                    email: "$myEmployeeInfo.email",
                },
            },
        ]);

        return res.status(200).send({
            message: "my Employee Leave list",
            myEmployeeLeaveListSearch,
            myEmployeeList,
            total_count: totalDocuments,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send("DB Error");
    }
};

// exports.myEmployeeLeaveListSearch = async (req, res) => {
// 	console.log(`
// --------------------------------------------------
//   User : ${req.decoded._id}
//   API  : Get my Employee Leave List
//   router.get('/myEmployee-leaveList', employeeMngmtCtrl.myEmployeeLeaveList);
// --------------------------------------------------`);

// 	const data = req.query;

// 	if (data.emailFind == "" || data.emailFind == "null") {
// 		data.emailFind = "all";
// 	}

// 	startDatee = new Date(data.leave_start_date);
// 	endDatee = new Date(data.leave_end_date);

// 	const dbModels = global.DB_MODELS;
// 	try {
// 		// 관리하고 있는 직원들 in manager
// 		// myManager > 매니저 아이디, myId > 직원 아이디, accepted: true or false, 펜딩 or 수락

// 		const myEmployeeLeaveListSearch = await dbModels.Manager.aggregate([
// 			{
// 				$match: {
// 					myManager: new mongoose.Types.ObjectId(req.decoded._id),
// 				},
// 			},
// 			{
// 				$lookup: {
// 					from: "leaverequests",
// 					localField: "myId",
// 					foreignField: "requestor",
// 					as: "leave",
// 				},
// 			},
// 			{
// 				$lookup: {
// 					from: "members",
// 					localField: "myId",
// 					foreignField: "_id",
// 					as: "memberName",
// 				},
// 			},
// 			{
// 				$lookup: {
// 					from: "members",
// 					localField: "myManager",
// 					foreignField: "_id",
// 					as: "approverName",
// 				},
// 			},
// 			{
// 				$unwind: {
// 					path: "$leave",
// 					preserveNullAndEmptyArrays: true,
// 				},
// 			},
// 			{
// 				$unwind: {
// 					path: "$memberName",
// 					preserveNullAndEmptyArrays: true,
// 				},
// 			},
// 			{
// 				$addFields: {
// 					leaveTypeStand: "all",
// 					emailStand: "all",
// 				},
// 			},
// 			{
// 				$project: {
// 					requestId: "$leave._id",
// 					name: "$memberName.name",
// 					duration: "$leave.leaveDuration",
// 					leaveType: "$leave.leaveType",
// 					leaveTypeStand: {
// 						$cond: {
// 							if: { $eq: ["$leave.leaveType", data.type] },
// 							then: data.type,
// 							else: "all",
// 						},
// 					},
// 					startDate: "$leave.leave_start_date",
// 					endDate: "$leave.leave_end_date",
// 					email: "$memberName.email",

// 					emailStand: {
// 						$cond: {
// 							if: { $eq: ["$memberName.email", data.emailFind] },
// 							then: "$memberName.email",
// 							else: "all",
// 						},
// 					},
// 					status: "$leave.status",
// 					createdAt: "$leave.createdAt",
// 					approver: "$approverName.name",
// 					leave_reason: "$leave.leave_reason",
// 					rejectReason: "$leave.rejectReason",
// 					retired: "$memberName.retired",
// 				},
// 			},
// 			{
// 				$match: {
// 					startDate: { $gte: startDatee, $lte: endDatee },
// 					emailStand: data.emailFind,
// 					leaveTypeStand: data.type,
// 					retired: false,
// 				},
// 			},
// 			{
// 				$sort: {
// 					startDate: -1,
// 				},
// 			},
// 		]);

// 		const myEmployeeList = await dbModels.Manager.aggregate([
// 			{
// 				$match: {
// 					myManager: new mongoose.Types.ObjectId(req.decoded._id),
// 					accepted: true,
// 				},
// 			},
// 			{
// 				$lookup: {
// 					from: "members",
// 					localField: "myId",
// 					foreignField: "_id",
// 					as: "myEmployeeInfo",
// 				},
// 			},
// 			{
// 				$unwind: {
// 					path: "$myEmployeeInfo",
// 					preserveNullAndEmptyArrays: true,
// 				},
// 			},
// 			{
// 				$project: {
// 					name: "$myEmployeeInfo.name",
// 					email: "$myEmployeeInfo.email",
// 				},
// 			},
// 		]);

// 		return res.status(200).send({
// 			message: "my Employee Leave list",
// 			myEmployeeLeaveListSearch,
// 			myEmployeeList,
// 		});
// 	} catch (err) {
// 		return res.status(500).send("DB Error");
// 	}
// };

// exports.myManagerEmployeeList = async (req, res) => {
// 	console.log(`
// --------------------------------------------------
//   User : ${req.decoded._id}
//   API  : Get my Employee Leave List
//   router.get('/myManager-employee-list', employeeMngmtCtrl.myManagerEmployeeList);
// --------------------------------------------------`);
// 	data = req.query;

// 	const dbModels = global.DB_MODELS;
// 	try {
// 		// const myManagerEmployeeList = await dbModels.Manager.aggregate([
// 		// 	{
// 		// 		$match: {
// 		// 			myManager: new mongoose.Types.ObjectId(data.managerID),
// 		// 			accepted: true
// 		// 		}
// 		// 	},
// 		// 	{
// 		// 		$lookup: {
// 		// 			from: 'members',
// 		// 			localField: 'myId',
// 		// 			foreignField: '_id',
// 		// 			as: 'myEmployeeInfo'
// 		// 		},
// 		// 	},
// 		// 	{
// 		// 		$unwind: {
// 		// 			path: '$myEmployeeInfo',
// 		// 			preserveNullAndEmptyArrays: true
// 		// 		}
// 		// 	},
// 		// 	{
// 		// 		$project: {
// 		// 			_id: 1,
// 		// 			myEmployeeId: '$myEmployeeInfo._id',
// 		// 			name: '$myEmployeeInfo.name',
// 		// 			// annual_leave: '$myEmployeeInfo.annual_leave',
// 		// 			// sick_leave: '$myEmployeeInfo.sick_leave',
// 		// 			// replacementday_leave: '$myEmployeeInfo.replacementday_leave',
// 		// 			location: '$myEmployeeInfo.location',
// 		// 			emp_start_date: '$myEmployeeInfo.emp_start_date',
// 		// 			emp_end_date: '$myEmployeeInfo.emp_end_date',
// 		// 			position: '$myEmployeeInfo.position'
// 		// 		}
// 		// 	}
// 		// ]);

// 		const manager = await dbModels.Manager.find(
//             {
//                 myManager: new mongoose.Types.ObjectId(data.managerID)
//             },
//             {
//                 myId: 1,
//                 accepted: 1,
//             }
//         ).lean()

//         const mngEmployee = [];

//         for (let index = 0; index < manager.length; index++) {
//             const element = manager[index].myId;
//             mngEmployee.push(element);
//         }

// 		const myManagerEmployeeList = await dbModels.Member.aggregate([
//             {
//                 $match: {
//                     _id: { $in: mngEmployee }
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'PersonalLeaveStandards',
//                     localField: '_id',
//                     foreignField: 'member_id',
//                     as: 'totalLeave'
//                 }
//             },
//             {
//                 $addFields: {
//                     year: {
//                         $floor: {
//                             $let: {
//                                 vars: {
//                                     diff: {
//                                         $subtract: [new Date(), "$emp_start_date"]
//                                     }
//                                 },
//                                 in: {
//                                     $divide: ["$$diff", (365 * 24 * 60 * 60 * 1000)]
//                                 }
//                             }
//                         }
//                     }
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'leaverequests',
//                     let: {
//                         userId: '$_id',
//                         years: '$year',
//                     },
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: {
//                                     $and: [
//                                         { $eq: ["$requestor", "$$userId"] },
//                                         { $eq: ["$year", "$$years"] }

//                                     ]
//                                 }
//                             }
//                         },
//                         {
//                             $facet: {
//                                 used_annual_leave: [
//                                     {
//                                         $match: {
//                                             $expr: {
//                                                 $eq: ["$leaveType", 'annual_leave']
//                                             }
//                                         }
//                                     },
//                                     {
//                                         $group: {
//                                             _id: null,
//                                             sum: {
//                                                 "$sum": "$leaveDuration"
//                                             }
//                                         }
//                                     }
//                                 ],
//                                 used_sick_leave: [
//                                     {
//                                         $match: {
//                                             $expr: {
//                                                 $eq: ["$leaveType", 'sick_leave']
//                                             }
//                                         }
//                                     },
//                                     {
//                                         $group: {
//                                             _id: null,
//                                             sum: {
//                                                 "$sum": "$leaveDuration"
//                                             }
//                                         }
//                                     }
//                                 ],
//                                 used_replacement_leave: [
//                                     {
//                                         $match: {
//                                             $expr: {
//                                                 $eq: ["$leaveType", 'replacement_leave']
//                                             }
//                                         }
//                                     },
//                                     {
//                                         $group: {
//                                             _id: null,
//                                             sum: {
//                                                 "$sum": "$leaveDuration"
//                                             }
//                                         }
//                                     }
//                                 ]
//                             }
//                         }
//                     ]
//                     , as: "usedLeave"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$totalLeave',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$usedLeave',
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     name: 1,
//                     year: 1,
//                     position: 1,
//                     location: 1,
//                     emp_start_date: 1,
//                     emp_end_date: 1,
//                     isManager: 1,
//                     totalLeave: {
//                         $arrayElemAt: ["$totalLeave.leave_standard", "$year"]
//                     },
//                     usedLeave: 1
//                 }
//             }
//         ]);

// 		return res.status(200).send({
// 			message: 'connected managerEmployeeList',
// 			myManagerEmployeeList
// 		});

// 	} catch (error) {
// 		return res.status(500).send('DB Error');
// 	}
// };
