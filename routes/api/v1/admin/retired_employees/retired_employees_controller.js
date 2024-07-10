const moment = require("moment");

// 퇴사 직원 목록
exports.getRetiredEmployeeList = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : get retired employee list
	router.get('/retired_employees', retiredEmployeesCtrl.getRetiredEmployeeList);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const { nameFormControl, emailFormControl, active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

    const limit = parseInt(pageSize, 10);
    const skip = parseInt(pageIndex, 10) * limit;
    const sortCriteria = {
        [active]: direction === "desc" ? -1 : 1,
    };

    try {
        const companyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id,
            },
            {
                company_id: 1,
            }
        );

        if (companyId.company_id == null || companyId.company_id == "") {
            return res.status(500).send({
                message: "noCompany",
            });
        }

        let query = {
            // 대소문자 상관없는 정규표현식으로 바꾸는 코드
            name: new RegExp(nameFormControl, "i"),
            email: new RegExp(emailFormControl, "i"),
        };

        const myEmployeeList = await dbModels.Member.aggregate([
            {
                $match: {
                    company_id: companyId.company_id,
                    isAdmin: false,
                    retired: true,
                    ...query,
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
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    year: 1,
                    position: 1,
                    location: 1,
                    emp_start_date: 1,
                    emp_end_date: 1,
                    isManager: 1,
                    totalLeave: {
                        $arrayElemAt: ["$totalLeave.leave_standard", "$year"],
                    },
                    usedLeave: 1,
                    resignation_date: 1,
                },
            },
            {
                $sort: {
                    isManager: 1,
                },
            },
            {
                $facet: {
                    paginatedResults: [{ $sort: sortCriteria }, { $skip: skip }, { $limit: limit }],
                    totalCount: [{ $count: "count" }],
                },
            },
        ]);

        const results = myEmployeeList[0].paginatedResults;
        const totalCount = myEmployeeList[0].totalCount[0] ? myEmployeeList[0].totalCount[0].count : 0;

        return res.status(200).send({
            message: "found",
            data: results,
            totalCount,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

// 직원 목록
exports.getEmployeeList = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : get employee list
	router.get('/retired_employees/getEmployeeList', retiredEmployeesCtrl.getEmployeeList);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const { nameFormControl, emailFormControl, active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

    const limit = parseInt(pageSize, 10);
    const skip = parseInt(pageIndex, 10) * limit;
    const sortCriteria = {
        [active]: direction === "desc" ? -1 : 1,
    };

    try {
        const companyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id,
            },
            {
                company_id: 1,
            }
        );

        if (!companyId.company_id) {
            return res.status(500).send({
                message: "noCompany",
            });
        }

        let query = {
            // 대소문자 상관없는 정규표현식으로 바꾸는 코드
            name: new RegExp(nameFormControl, "i"),
            email: new RegExp(emailFormControl, "i"),
        };

        const myEmployeeList = await dbModels.Member.aggregate([
            {
                $match: {
                    company_id: companyId.company_id,
                    isAdmin: false,
                    retired: false,
                    ...query,
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
                $lookup: {
                    from: "managers",
                    localField: "_id",
                    foreignField: "myId",
                    as: "manager",
                },
            },
            {
                $addFields: {
                    dateDiff: {
                        $dateDiff: {
                            startDate: "$emp_start_date",
                            endDate: "$$NOW",
                            unit: "year",
                        },
                    },
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
                $addFields: {
                    dateCompare: {
                        $cond: [
                            {
                                $and: [{ $gte: ["$emp_start", "$now_date"] }],
                            },
                            0,
                            1,
                        ],
                    },
                },
            },
            {
                $addFields: {
                    year: {
                        $cond: [
                            { $gte: [{ $subtract: ["$dateDiff", "$dateCompare"] }, 0] },
                            { $subtract: ["$dateDiff", "$dateCompare"] },
                            0,
                        ],
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
                                            sum: { $sum: "$leaveDuration" },
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
                                            sum: { $sum: "$leaveDuration" },
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
                                            sum: { $sum: "$leaveDuration" },
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
                                            sum: { $sum: "$leaveDuration" },
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
                $addFields: {
                    usedLeave: {
                        $arrayElemAt: ["$usedLeave", 0],
                    },
                },
            },
            {
                $unwind: {
                    path: "$manager",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $unwind: {
                    path: "$totalLeave",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    usedLeave: {
                        used_annual_leave: { $ifNull: [{ $arrayElemAt: ["$usedLeave.used_annual_leave.sum", 0] }, 0] },
                        used_rollover: { $ifNull: [{ $arrayElemAt: ["$usedLeave.used_rollover.sum", 0] }, 0] },
                        used_sick_leave: { $ifNull: [{ $arrayElemAt: ["$usedLeave.used_sick_leave.sum", 0] }, 0] },
                        used_replacement_leave: { $ifNull: [{ $arrayElemAt: ["$usedLeave.used_replacement_leave.sum", 0] }, 0] },
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    year: 1,
                    position: 1,
                    location: 1,
                    emp_start_date: 1,
                    emp_end_date: 1,
                    isManager: 1,
                    department: 1,
                    totalLeave: {
                        $arrayElemAt: ["$totalLeave.leave_standard", "$year"],
                    },
                    usedLeave: 1,
                    managerId: "$manager.myManager",
                },
            },
            {
                $lookup: {
                    from: "members",
                    localField: "managerId",
                    foreignField: "_id",
                    as: "manager",
                },
            },
            {
                $unwind: {
                    path: "$manager",
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
                    email: 1,
                    year: 1,
                    position: 1,
                    location: "$countryName.countryName",
                    emp_start_date: 1,
                    emp_end_date: 1,
                    isManager: 1,
                    department: 1,
                    totalLeave: 1,
                    usedLeave: 1,
                    managerId: "$manager.email",
                },
            },
            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" },
                },
            },
            {
                $replaceRoot: { newRoot: "$doc" },
            },
            {
                $facet: {
                    paginatedResults: [{ $sort: sortCriteria }, { $skip: skip }, { $limit: limit }],
                    totalCount: [{ $count: "count" }],
                },
            },
        ]);

        const results = myEmployeeList[0].paginatedResults;
        const totalCount = myEmployeeList[0].totalCount[0] ? myEmployeeList[0].totalCount[0].count : 0;

        return res.status(200).send({
            message: "found",
            data: results,
            totalCount,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

// 직원 퇴사
exports.editRetiredEmployee = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : edit retired employee
  router.patch('/retired_employees', retiredEmployeesCtrl.editRetiredEmployee);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const data = req.body;

    const criteria = {
        _id: data.id,
    };

    const updateData = {
        resignation_date: data.resignation_date,
        retired: true,
    };

    try {
        const retireEmployee = await dbModels.Member.findOneAndUpdate(criteria, updateData);
        if (!retireEmployee) {
            return res.status(500).send("the update1 has failed");
        }
        // 매니저가 퇴사 시 직원들에게 등록된 매니저 삭제
        const myManager = await dbModels.Manager.find({ myManager: data.id });

        // 매니저가 퇴사 시 매니저에게 신청한 휴가 삭제
        // 삭제할 휴가 되돌려 주기
        // rollover 처리
        for (let i = 0; i < myManager.length; i++) {
            if (myManager[i].leaveType == "annual_leave") {
                // 휴가 신청자 계약일 받아오고
                const userYear = await dbModels.Member.findOne({
                    _id: myManager[i].requestor,
                });

                // 년차 뽑아옴
                const today = moment(new Date());
                const empStartDate = moment(userYear.emp_start_date);
                const careerYear = today.diff(empStartDate, "years") + 1;

                // rollover 값을 우선 찾는다..
                const rolloverTotal = await dbModels.PersonalLeaveStandard.findOne({
                    member_id: myManager[i].requestor,
                });

                // rollover 변수에 duration 을 뺀 값을 저장
                if (rolloverTotal.leave_standard[careerYear]["rollover"] != undefined) {
                    rollover = rolloverTotal.leave_standard[careerYear].rollover + myManager[i].leaveDuration;

                    // 위에서 구한 변수로 set
                    // 여기서 한번에 다 하고 싶었으나 안됨..
                    const rolloverCal = await dbModels.PersonalLeaveStandard.findOneAndUpdate(
                        {
                            member_id: myManager[i].requestor,
                            "leave_standard.year": careerYear + 1,
                        },
                        {
                            $set: {
                                "leave_standard.$.rollover": rollover,
                            },
                        },
                        { new: true }
                    );
                }
            }
        }

        const deletePendingReqest = await dbModels.LeaveRequest.deleteMany({ approver: data.id, status: "pending" });

        const deleteMyManager = await dbModels.Manager.deleteMany({ myManager: data.id });

        return res.status(200).send({
            message: "connect retireEmployee",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "DB Error",
        });
    }
};

// 직원 퇴사 취소
exports.cancelRetireEmployee = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : edit retired cancel
  router.patch('/retired_employees/cancelRetireEmployee', retiredEmployeesCtrl.cancelRetireEmployee);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const data = req.body;

    const criteria = {
        _id: data.id,
    };

    const updateData = {
        resignation_date: "",
        retired: false,
    };

    try {
        const retireEmployee = await dbModels.Member.findOneAndUpdate(criteria, updateData);
        if (!retireEmployee) {
            return res.status(500).send("the update1 has failed");
        }

        return res.status(200).send({
            message: "cancel Retire Employee",
        });
    } catch (error) {
        return res.status(500).send({
            message: "DB Error",
        });
    }
};
