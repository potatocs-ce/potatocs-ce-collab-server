const mongoose = require("mongoose");

// 휴일 목록
exports.getHolidayList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : get holiday list
  router.post('/holidays', holidaysCtrl.getHolidayList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const { nameFormControl, active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

    const limit = parseInt(pageSize, 10);
    const skip = parseInt(pageIndex, 10) * limit;
    const sortCriteria = {
        [active]: direction === "desc" ? -1 : 1,
    };

    try {
        const findCompanyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id,
            },
            {
                _id: 0,
                company_id: 1,
            }
        );

        const findHoliday = await dbModels.Company.aggregate([
            {
                $match: {
                    _id: findCompanyId.company_id,
                },
            },
            {
                $facet: {
                    paginatedResults: [
                        { $unwind: "$company_holiday" }, // company_holiday 배열 풀기
                        { $match: { "company_holiday.ch_name": new RegExp(nameFormControl, "i") } }, // 대소문자 구분 없이 이름 검색
                        { $sort: sortCriteria },
                        { $skip: skip },
                        { $limit: limit },
                        { $replaceRoot: { newRoot: "$company_holiday" } }, // 결과를 company_holiday 객체로 교체
                    ],
                    totalCount: [
                        { $unwind: "$company_holiday" },
                        { $match: { "company_holiday.ch_name": new RegExp(nameFormControl, "i") } },
                        { $count: "count" },
                    ],
                },
            },
        ]);

        const results = findHoliday[0].paginatedResults;
        const totalCount = findHoliday[0].totalCount.length > 0 ? findHoliday[0].totalCount[0].count : 0;

        return res.status(200).send({
            message: "Success find company holiday",
            data: results,
            totalCount,
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Loadings company holiday Error",
        });
    }
};

// 휴일 등록
exports.addHoliday = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add holiday
  router.post('/holidays', holidaysCtrl.addHoliday);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const findCompanyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id,
            },
            {
                _id: 0,
                company_id: 1,
            }
        );

        const addHoliday = await dbModels.Company.findOneAndUpdate(
            {
                _id: findCompanyId.company_id,
            },
            {
                $push: {
                    company_holiday: {
                        ch_name: req.body.ch_name,
                        ch_date: req.body.ch_date,
                    },
                },
            },
            {
                upsert: true,
            }
        ).exec();

        return res.status(200).send({
            message: "Success add company holiday",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Adding company holiday Error",
        });
    }
};

// 휴일 삭제
exports.deleteholiday = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : delete holiday
  router.post('/holidays/deleteholidays', holidaysCtrl.deleteholiday);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const findCompanyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id,
            },
            {
                _id: 0,
                company_id: 1,
            }
        );

        const updateCompanyHoliday = await dbModels.Company.findOneAndUpdate(
            {
                _id: findCompanyId.company_id,
            },
            {
                $pull: {
                    company_holiday: {
                        _id: req.body._id,
                    },
                },
            },
            {
                upsert: true,
            }
        ).exec();

        return res.status(200).send({
            message: "Success delete company holiday",
        });
    } catch (err) {
        res.status(500).send({
            message: "Deleting company holiday Error",
        });
    }
};
