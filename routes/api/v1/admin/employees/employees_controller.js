const moment = require("moment");

// 직원 목록
exports.getEmployeeList = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : get employees
	router.get('/employees', employeesCtrl.getEmployeeList);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const { nameFormControl, managerID, active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

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
        };

        // employee 버튼을 눌렀을 경우
        if (managerID !== "") {
            const manager = await dbModels.Manager.find(
                {
                    myManager: managerID,
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

            query = {
                // 대소문자 상관없는 정규표현식으로 바꾸는 코드
                name: new RegExp(nameFormControl, "i"),
                _id: { $in: mngEmployee },
            };
        }

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

// 직원 휴가 목록
exports.getEmployeeLeaveStatus = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : employ leave list search
	router.get('/employeeLeaveListSearch', adEmployeeCtrl.employeeLeaveListSearch);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const { emailFormControl, active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

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
                _id: false,
            }
        );

        let query = {
            // 대소문자 상관없는 정규표현식으로 바꾸는 코드
            email: new RegExp(emailFormControl, "i"),
        };

        const myEmployeeList = await dbModels.Member.aggregate([
            {
                $match: {
                    company_id: companyId.company_id,
                    retired: false,
                    ...query,
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
                    startDate: "$leave.leave_start_date",
                    endDate: "$leave.leave_end_date",
                    email: 1,
                    status: "$leave.status",
                    leave_reason: "$leave.leave_reason",
                    approver: "$managerName.name",
                    createdAt: "$leave.createdAt",
                    rejectReason: "$leave.rejectReason",
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

        return res.send({
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

// 직원 상세 조회
exports.getEmployeeInfo = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : get employee
	router.get('/employees/:id', employeesCtrl.getEmployeeInfo);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const employeeInfo = await dbModels.Member.findOne({
            _id: req.params.id,
        });

        // user location name 찾아오기
        const nationName = await dbModels.NationalHoliday.findOne({
            _id: employeeInfo.location,
        });

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

// 직원 디테일 수정
exports.editEmployeeDetail = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Edit employee detail
	router.put('/employees/editEmployeeDetail', employeesCtrl.editEmployeeDetail);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;

    try {
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

// 직원 휴가 수정
exports.editEmployeeLeave = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Edit employee leave
	router.put('/employees/editEmployeeLeave', employeesCtrl.editEmployeeLeave);
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

        const today = moment(new Date());
        const empStartDate = moment(memberInfo.emp_start_date);
        const careerYear = today.diff(empStartDate, "years") + 1;

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

// admin Employee List excel import
// 직원 목록 excel 추가
exports.addExcelEmployeeList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : import employee list 
  router.post('/employees/addExcelEmployeeList', employeesCtrl.addExcelEmployeeList);
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
