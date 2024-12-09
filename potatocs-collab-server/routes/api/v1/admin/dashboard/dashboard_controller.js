const mongoose = require("mongoose");

// 대쉬보드
exports.getDashboard = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : get dashboard
  router.post('/dashboard', dashboardCtrl.getDashboard);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const adUser = await dbModels.Admin.findOne({
            _id: req.decoded._id,
        }).lean();

        if (adUser.company_id == null || adUser.company_id == "") {
            return res.send({
                message: "not found",
            });
        }

        const pendingCompany = await dbModels.PendingCompanyRequest.find({
            company_id: adUser.company_id,
            status: "pending",
        }).lean();

        const countEmploymentCountractRequest = pendingCompany.length;

        const companyEmployee = await dbModels.Member.find({
            company_id: adUser.company_id,
            isAdmin: false,
        }).lean();

        const companyRetiredEmployee = await dbModels.Member.find({
            company_id: adUser.company_id,
            isAdmin: false,
            retired: true,
        }).lean();

        const countCompanyEmployee = companyEmployee.length;
        const countCompanyRetiredEmployee = companyRetiredEmployee.length;

        const findHoliday = await dbModels.Company.aggregate([
            {
                $match: {
                    _id: adUser.company_id,
                },
            },
            {
                $facet: {
                    paginatedResults: [
                        { $unwind: "$company_holiday" }, // company_holiday 배열 풀기
                        { $replaceRoot: { newRoot: "$company_holiday" } }, // 결과를 company_holiday 객체로 교체
                    ],
                    totalCount: [{ $unwind: "$company_holiday" }, { $count: "count" }],
                },
            },
        ]);

        const countHoliday = findHoliday[0].totalCount[0] ? findHoliday[0].totalCount[0].count : 0;

        return res.send({
            message: "Successfully dashboard",
            countCompanyEmployee,
            countCompanyRetiredEmployee,
            countEmploymentCountractRequest,
            countHoliday,
        });
    } catch (err) {
        console.error("[ ERROR ]", error);
        res.status(500).json({
            message: "Error fetching dashboard",
        });
    }
};
