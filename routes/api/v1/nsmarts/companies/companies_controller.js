const randomize = require("randomatic");

// 회사 목록 조회
exports.getCompanyList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Company List
  router.get('/companies', companies.getCompanyList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const { nameFormControl, active, direction, pageIndex, pageSize } = req.query;

    const sortOption = {};
    sortOption[active] = direction === "asc" ? 1 : -1;

    const query = {
        // 대소문자 상관없는 정규표현식으로 바꾸는 코드
        company_name: new RegExp(nameFormControl, "i"),
    };

    try {
        const foundCompanyList = await dbModels.Company.find(query)
            .select("rollover rollover_max_day rollover_max_month company_code company_name")
            .sort(sortOption)
            .skip(pageIndex * pageSize)
            .limit(pageSize)
            .lean();

        const totalCount = await dbModels.Company.countDocuments(query);

        return res.status(200).send({
            message: "Successfully retrieved the company list",
            foundCompanyList,
            totalCount,
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error fetching company list",
        });
    }
};

// 회사 등록
exports.addCompany = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Add Company
  router.post('/companies', companies.addCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    let company_code = randomize("aA0", 6);

    const findCompanyCode = await dbModels.Company.findOne({
        company_code: company_code,
    });

    if (findCompanyCode) {
        company_code = randomize("aA0", 6);
    }

    try {
        let addCompanyData;
        addCompanyData = {
            company_code: company_code,
            company_name: req.body.company_name,
            leave_standard: req.body.leave_standard,
            rollover: req.body.rollover,
            rollover_max_month: req.body.rollover == true ? req.body.rollover_max_month : null,
            rollover_max_day: req.body.rollover == true ? req.body.rollover_max_day : null,
            isReplacementDay: req.body.isReplacementDay,
            isMinusAnnualLeave: req.body.isMinusAnnualLeave,
            rd_validity_term: req.body.isReplacementDay == true ? req.body.rd_validity_term : null,
            annual_policy: req.body.annual_policy === "byYear" ? "byYear" : req.body.annual_policy == "byContract" ? "byContract" : null,
            leaveStandardsLength: req.body.leaveStandardsLength,
        };

        const addCompany = dbModels.Company(addCompanyData);
        await addCompany.save();

        return res.status(200).send({
            message: "Successfully added the company",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error adding the company",
        });
    }
};

// 회사 상세 조회
exports.getCompanyInfo = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Company Info
  router.get('/companies/:id', companies.getCompanyInfo);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const criteria = {
            _id: req.params.id,
        };

        const foundCompany = await dbModels.Company.findOne(criteria);

        return res.status(200).send({
            message: "Successfully retrieved the company info",
            data: foundCompany,
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error fetching company info",
        });
    }
};

// 회사 수정
exports.editCompany = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Edit Company
  router.patch('/companies/:id', companies.editCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        let editCompany = {
            company_name: req.body.company_name,
            leave_standard: req.body.leave_standard,
            rollover: req.body.rollover,
            rollover_max_month: req.body.rollover == true ? req.body.rollover_max_month : null,
            rollover_max_day: req.body.rollover == true ? req.body.rollover_max_day : null,
            isReplacementDay: req.body.isReplacementDay,
            isMinusAnnualLeave: req.body.isMinusAnnualLeave,
            rd_validity_term: req.body.isReplacementDay == true ? req.body.rd_validity_term : null,
            annual_policy: req.body.annual_policy === "byYear" ? "byYear" : req.body.annual_policy == "byContract" ? "byContract" : null,
            leaveStandardsLength: req.body.leaveStandardsLength,
        };

        const updateCompany = await dbModels.Company.findOneAndUpdate({ _id: req.params.id }, editCompany);

        return res.status(200).send({
            message: "Successfully edited the company",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error editing the company",
        });
    }
};

// 회사 삭제
exports.deleteCompany = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Company
  router.delete('/deleteCompany/:id', companies.deleteCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        const deleteCompany = await dbModels.Company.deleteOne({ _id: req.params.id });

        return res.status(200).send({
            message: "Successfully deleted the company",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error deleting the company",
        });
    }
};
