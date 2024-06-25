const { ObjectId } = require("bson");
const moment = require("moment");

exports.getEmployees = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : get my company employee
	router.get('/getEmployees', employeeCtrl.getEmployees);
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;

    const { nameFormControl, active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

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

        const query = {
            // 대소문자 상관없는 정규표현식으로 바꾸는 코드
            name: new RegExp(nameFormControl, "i"),
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
            myEmployeeList: results,
            totalCount,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

exports.getManagerEmployee = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : get my company manager employee
	router.get('/getManagerEmployee', adEmployeeCtrl.getManagerEmployee);
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;
    const data = req.query;
    // console.log(data);

    try {
        const manager = await dbModels.Manager.find(
            {
                myManager: ObjectId(data.managerID),
            },
            {
                myId: 1,
                accepted: 1,
            }
        ).lean();
        // console.log(manager);
        const mngEmployee = [];

        for (let index = 0; index < manager.length; index++) {
            const element = manager[index].myId;
            mngEmployee.push(element);
        }
        // console.log(mngEmployee);

        const myManagerEmployeeList = await dbModels.Member.aggregate([
            {
                $match: {
                    _id: { $in: mngEmployee },
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

            //////////// mongo 5.0 이상에서
            // {
            //     $addFields:{
            //         year11: {
            //             $dateDiff: {
            //                 startDate: '$emp_start_date', endDate:"$$NOW", unit: "year"
            //             }
            //         }
            //     }
            // },
            ///////////

            // {
            //     usedLeave:{
            //         $elemMatch:{
            //             "leaveType" : "annual_leave"
            //         }
            //     }

            // },
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

        // console.log(myManagerEmployeeList);

        return res.send({
            message: "getManagerEmployee HIHI",
            myManagerEmployeeList,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

exports.getEmployeeInfo = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : get edit employee info
	router.get('/getEmployeeInfo', adEmployeeCtrl.getEmployeeInfo);
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;
    // console.log(req.params.id);
    try {
        // totalLeave: {
        //     $arrayElemAt: ["$totalLeave.leave_standard","$year"]
        // },

        const employeeInfo = await dbModels.Member.findOne({
            _id: req.params.id,
        });
        // console.log(employeeInfo);

        // user location name 찾아오기
        const nationName = await dbModels.NationalHoliday.findOne({
            _id: employeeInfo.location,
        });

        // console.log(nationName);

        const today = moment(new Date());
        const empStartDate = moment(employeeInfo.emp_start_date);
        const careerYear = today.diff(empStartDate, "years");

        const personalLeave = await dbModels.PersonalLeaveStandard.findOne({
            member_id: req.params.id,
        });
        const totalLeave = personalLeave.leave_standard[careerYear];

        employee = {
            name: employeeInfo.name,
            position: employeeInfo.position,
            location: nationName?._id,
            emp_start_date: employeeInfo.emp_start_date,
            emp_end_date: employeeInfo.emp_end_date,
            annual_leave: employeeInfo.emp_start_date ? totalLeave.annual_leave : 0,
            sick_leave: employeeInfo.emp_start_date ? totalLeave.sick_leave : 0,
            replacement_leave: employeeInfo.emp_start_date ? totalLeave.replacement_leave : 0,
        };

        // national holiday list
        const nationList = await dbModels.NationalHoliday.find();

        return res.send({
            message: "getEmployeeInfo",
            employee,
            nationList,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

exports.editEmployeeProfileInfo = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Edit employ profile info
	router.put('/editEmployeeProfileInfo', adEmployeeCtrl.editEmployeeProfileInfo);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;
    console.log(data);

    try {
        // const nationName = await dbModels.NationalHoliday.findOne(
        //     {
        //         location: data.location
        //     }
        // )

        const editEmployee = await dbModels.Member.findOneAndUpdate(
            {
                _id: data.employeeId,
            },
            {
                name: data.name,
                position: data.position,
                location: data.location,
                emp_start_date: data.emp_start_date,
                emp_end_date: data.emp_end_date,
            }
        );

        // const today = moment(new Date());
        // const empStartDate = moment(data.emp_start_date);
        // const careerYear = (today.diff(empStartDate, 'years')) + 1;
        //     // console.log(careerYear);
        // const editTotalLeave = await dbModels.PersonalLeaveStandard.findOneAndUpdate(
        //     {
        //         member_id: data.employeeId,
        //         "leave_standard.year": careerYear
        //     },
        //     {
        //         $set: {
        //             "leave_standard.$.annual_leave": data.annual_leave,
        //             'leave_standard.$.sick_leave': data.sick_leave,
        //             "leave_standard.$.replacement_leave": data.replacement_leave,
        //         },
        //     }
        // )
        // console.log(editTotalLeave)
        return res.send({
            message: "updated",
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

exports.editEmployeeLeaveInfo = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Edit employ leave info
	router.put('/editEmployeeLeaveInfo', adEmployeeCtrl.editEmployeeLeaveInfo);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;

    try {
        const memberInfo = await dbModels.Member.findOne(
            {
                _id: data.employeeId,
            },
            {
                emp_start_date: 1,
            }
        );
        // console.log(memberInfo);

        const today = moment(new Date());
        const empStartDate = moment(memberInfo.emp_start_date);
        const careerYear = today.diff(empStartDate, "years") + 1;

        // console.log(careerYear);

        const editTotalLeave = await dbModels.PersonalLeaveStandard.findOneAndUpdate(
            {
                member_id: data.employeeId,
                "leave_standard.year": careerYear,
            },
            {
                $set: {
                    "leave_standard.$.annual_leave": data.annual_leave,
                    "leave_standard.$.sick_leave": data.sick_leave,
                    "leave_standard.$.replacement_leave": data.replacement_leave,
                },
            }
        );

        return res.send({
            message: "updated",
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

exports.employeeLeaveListSearch = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : employ leave list search
	router.get('/employeeLeaveListSearch', adEmployeeCtrl.employeeLeaveListSearch);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.query;

    // console.log(data);
    if (data.emailFind == "" || data.emailFind == "null") {
        data.emailFind = "all";
    }

    startDatee = new Date(data.leave_start_date);
    endDatee = new Date(data.leave_end_date);

    try {
        const companyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id,
            },
            {
                company_id: 1,
                _id: false,
            }
        );
        // console.log(companyId);
        const myEmployeeLeaveListSearch = await dbModels.Member.aggregate([
            {
                $match: {
                    company_id: ObjectId(companyId.company_id),
                    retired: false,
                },
            },
            {
                $lookup: {
                    from: "leaverequests",
                    localField: "_id",
                    foreignField: "requestor",
                    as: "leave",
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
                $unwind: {
                    path: "$manager",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "members",
                    localField: "manager.myManager",
                    foreignField: "_id",
                    as: "managerName",
                },
            },
            {
                $unwind: {
                    path: "$leave",
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
                    name: 1,
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
                    email: 1,
                    status: "$leave.status",
                    emailStand: {
                        $cond: {
                            if: { $eq: ["$email", data.emailFind] },
                            then: "$email",
                            else: "all",
                        },
                    },
                    leave_reason: "$leave.leave_reason",
                    approver: "$managerName.name",
                    createdAt: "$leave.createdAt",
                    rejectReason: "$leave.rejectReason",
                },
            },
            {
                $match: {
                    startDate: { $gte: startDatee, $lte: endDatee },
                    emailStand: data.emailFind,
                    leaveTypeStand: data.type,
                },
            },
            // {
            //     $sort: {
            //         startDate: 1
            //     }
            // }
        ]);

        // console.log(myEmployeeLeaveListSearch);

        const myEmployeeList = await dbModels.Member.aggregate([
            {
                $match: {
                    company_id: ObjectId(companyId.company_id),
                    retired: false,
                },
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                },
            },
        ]);
        return res.send({
            myEmployeeLeaveListSearch,
            myEmployeeList,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

// 퇴사자 목록
exports.getMyRetiredEmployee = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : get my company employee
	router.get('/getMyRetiredEmployee', adEmployeeCtrl.getMyRetiredEmployee);
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;
    try {
        // company id 가져오기
        const companyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id,
            },
            {
                company_id: 1,
            }
        );
        // console.log(companyId);

        if (companyId.company_id == null || companyId.company_id == "") {
            return res.status(500).send({
                message: "noCompany",
            });
        }

        const myEmployeeList = await dbModels.Member.aggregate([
            {
                $match: {
                    company_id: companyId.company_id,
                    isAdmin: false,
                    retired: true,
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
        ]);

        console.log(myEmployeeList);

        return res.status(200).send({
            message: "found",
            myEmployeeList,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

// search for member
// 퇴사 시킬 직원 찾기
exports.searchEmployee = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : search member 
  router.get('/searchEmployee', adEmployeeCtrl.searchEmployee);
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;
    const data = req.query;
    // console.log(data);

    try {
        const searchEmployee = await dbModels.Member.findOne({
            email: data.email,
        });

        return res.status(200).send({
            message: "searchEmployee",
            searchEmployee,
        });
    } catch {
        return res.status(500).send({
            message: "searchEmployee Error",
        });
    }
};

// retire member
// 직원 퇴사

exports.retireEmployee = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : retireEmployee
  router.patch('/retireEmployee', adEmployeeCtrl.retireEmployee);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const data = req.body;
    // console.log(data);

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
        // console.log('myManager---------------------------------------------------')
        // console.log(myManager)
        // console.log('---------------------------------------------------')

        // 매니저가 퇴사 시 매니저에게 신청한 휴가 삭제
        // 삭제할 휴가 되돌려 주기
        ////////////////////
        // rollover 처리
        for (let i = 0; i < myManager.length; i++) {
            if (myManager[i].leaveType == "annual_leave") {
                // 휴가 신청자 계약일 받아오고
                const userYear = await dbModels.Member.findOne({
                    _id: myManager[i].requestor,
                });
                // console.log(userYear);

                // 년차 뽑아옴
                const date = new Date();
                const today = moment(new Date());
                const empStartDate = moment(userYear.emp_start_date);
                const careerYear = today.diff(empStartDate, "years") + 1;
                // console.log(careerYear);

                // rollover 값을 우선 찾는다..
                const rolloverTotal = await dbModels.PersonalLeaveStandard.findOne({
                    member_id: myManager[i].requestor,
                });
                // rollover 변수에 duration 을 뺀 값을 저장

                // console.log(rolloverTotal.leave_standard[careerYear]);
                // console.log(rolloverTotal.leave_standard[careerYear]['rollover'] != undefined);

                if (rolloverTotal.leave_standard[careerYear]["rollover"] != undefined) {
                    rollover = rolloverTotal.leave_standard[careerYear].rollover + myManager[i].leaveDuration;
                    // console.log(rollover);

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
                    // console.log(rolloverCal.leave_standard[careerYear+1]);
                }
            }
        }

        const deletePendingReqest = await dbModels.LeaveRequest.deleteMany({ approver: data.id, status: "pending" });
        // console.log(deletePendingReqest)

        const deleteMyManager = await dbModels.Manager.deleteMany({ myManager: data.id });
        // console.log(deleteMyManager)

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

// retire member
// 직원 퇴사 취소

exports.cancelRetireEmployee = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : cancelRetireEmployee
  router.patch('/cancelRetireEmployee', adEmployeeCtrl.cancelRetireEmployee);
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

    // 직원 퇴사 취소
    try {
        const retireEmployee = await dbModels.Member.findOneAndUpdate(criteria, updateData);
        if (!retireEmployee) {
            return res.status(500).send("the update1 has failed");
        }

        // console.log(updatedDisplayName);

        return res.status(200).send({
            message: "cancel Retire Employee",
        });
    } catch (error) {
        return res.status(500).send({
            message: "DB Error",
        });
    }
};

// admin Employee List excel import
// 직원 리스트 excel 파일 업로드
exports.importEmployeeList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : import employee list 
  router.post('/importEmployeeList', adEmployeeCtrl.importEmployeeList);
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;
    const data = req.body;
    // data 는 엑셀에 입력된 회원정보 array
    try {
        // admin의 회사 아이디 검색
        const findCompanyId = await dbModels.Admin.findOne({ _id: req.decoded._id }, { _id: false, company_id: true });
        const companyId = findCompanyId.company_id;

        // 인자값 유효성 검사 (엑셀 데이터 확인)
        // 배열인 인자값을 for문으로 푼다.
        for (let i = 0; i < data.length; i++) {
            //data엔 email밖에 없어 _id를 찾아온다.
            const findMemberId = await dbModels.Member.findOne({ email: data[i].email }, { _id: true, retired: true });
            // 엑셀에 입력된 이메일이 없으면
            if (!findMemberId) {
                return res.status(500).send({
                    message: "not found email",
                });
                // 엑셀에 입력된 계약시작일이 없으면
            } else if (!data[i].emp_start_date) {
                return res.status(500).send({
                    message: "not found emp_start_date",
                });
                // 엑셀에 입력된 입사일 형식이 잘못됐거나, 셀의 표시형식이 '일반'이 아닌 '날짜'인 경우
            } else if (moment(data[i].emp_start_date, "YYYY-MM-DD", true).isValid() == false) {
                return res.status(500).send({
                    message: "not match date",
                });
            } else if (data[i].managerId) {
                const checkManagerId = await dbModels.Member.findOne({ email: data[i].managerId }, { _id: true, retired: true });
                // 엑셀에 입력된 매니저 ID가 퇴사자이면
                if (checkManagerId.retired == true) {
                    return res.status(500).send({
                        message: "found retired manager",
                    });
                    // 엑셀에 입력된 매니저 ID가 Member DB에 없으면
                } else if (!checkManagerId) {
                    return res.status(500).send({
                        message: "not found manager id",
                    });
                }
                // 엑셀에 입력된 아이디가 DB에 없거나, 회원가입된 아이디가 아니면 에러 메시지
            } else if (!findMemberId) {
                return res.status(500).send({
                    message: "not found Member",
                });
                // 엑셀에 입력된 아이디가 퇴사자면
            } else if (findMemberId.retired == true) {
                return res.status(500).send({
                    message: "found retired Employee",
                });
            }
        }

        // 인자값에 문제가 없을 경우 데이터를 DB에 넣는다.
        // 배열인 data를 for문으로 푼다.
        for (let i = 0; i < data.length; i++) {
            //data엔 email밖에 없어 _id를 찾아온다.
            const findEmployeeId = await dbModels.Member.findOne({ email: data[i].email }, { _id: true, retired: true });
            const employeeId = findEmployeeId._id;

            // addCompany-------------------------------
            // 회사 등록 요청을 상태 변경 (pending을 approve로)
            // 회사 등록이 없는 사람은 바로 추가
            const confirmCompany = await dbModels.PendingCompanyRequest.findOneAndUpdate(
                { member_id: employeeId },
                { company_id: companyId, status: "approve" },
                { new: true }
            );
            // 만약 PendingCompanyRequest에 member_id가 없으면
            // 직접 DB에 추가
            if (!confirmCompany) {
                const addApproveCompany = await dbModels.PendingCompanyRequest({
                    member_id: employeeId,
                    company_id: companyId,
                    status: "approve",
                });
                await addApproveCompany.save();
            }
            // member에 있는 유저, 회사등록
            const memberCompanyId = await dbModels.Member.findOneAndUpdate(
                {
                    _id: employeeId,
                },
                {
                    company_id: companyId,
                    emp_start_date: data[i].emp_start_date,
                    emp_end_date: data[i].emp_end_date,
                    // years: careerYear
                }
            );

            //// leave_standard 스키마 만들어주기
            //// Company 에서 leave_standard가져오기
            const companyLeaveStandard = await dbModels.Company.findOne({
                _id: companyId,
            }).lean();

            const confirmLeaveStandard = await dbModels.PersonalLeaveStandard.findOne({ member_id: employeeId });
            if (!confirmLeaveStandard) {
                const createLeaveStandard = dbModels.PersonalLeaveStandard({
                    member_id: employeeId,
                    leave_standard: companyLeaveStandard.leave_standard,
                });
                await createLeaveStandard.save();
            }
            // --------------------------------------------

            // addManger-------------------------------
            // 매니저 ID(email)가 있으면
            if (data[i].managerId) {
                const findMangerId = await dbModels.Member.findOne({ email: data[i].managerId });
                const mangerId = findMangerId.id;
                // 매니저 Id가 있으면 매니저 ID가 같은 직원을 매니저권한으로 변경
                const updateIsManger = await dbModels.Member.findOneAndUpdate({ _id: mangerId }, { isManager: true }, { new: true });

                // 직원들의 매니저 변경
                const updateManager = await dbModels.Manager.findOneAndUpdate(
                    { myId: employeeId },
                    { myManager: mangerId, accepted: true },
                    { new: true }
                );

                // 만약 직원들의 매니저가 없으면
                // 직접 DB에 추가
                if (!updateManager) {
                    const addManager = await dbModels.Manager({
                        myManager: mangerId,
                        myId: employeeId,
                        accepted: true,
                        requestedDate: new Date(),
                    });
                    await addManager.save();
                }
            }
            const memberData = {
                email: data[i].email,
                name: data[i].name,
                department: data[i].department,
                emp_start_date: data[i].emp_start_date,
                emp_end_date: data[i].emp_end_date,
                company_id: data[i].company_id,
            };

            const updateMember = await dbModels.Member.findOneAndUpdate({ _id: employeeId }, memberData, { new: true });

            if (!updateMember) {
                return res.status(400).send({
                    message: "Cannot update Member",
                });
            }
        }

        return res.status(200).send({
            message: "success",
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "failed",
        });
    }
};
