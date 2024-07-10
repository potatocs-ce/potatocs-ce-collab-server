// 어드민 목록 조회
exports.getAdminList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Admin List
  router.get('/admins', admins.getAdminList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const { nameFormControl, emailFormControl, active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

    const limit = parseInt(pageSize, 10);
    const skip = parseInt(pageIndex, 10) * limit;
    const sortCriteria = {
        [active]: direction === "desc" ? -1 : 1,
    };

    const query = {
        // 대소문자 상관없는 정규표현식으로 바꾸는 코드
        name: new RegExp(nameFormControl, "i"),
        email: new RegExp(emailFormControl, "i"),
    };

    try {
        const [total, adminList] = await Promise.all([
            dbModels.Admin.countDocuments(query),
            dbModels.Admin.find(query).populate("company_id").sort(sortCriteria).skip(skip).limit(limit),
        ]);

        res.status(200).json({
            message: "Successfully retrieved the admin list",
            data: adminList,
            total_count: total,
        });
    } catch (error) {
        console.error("[ ERROR ]", error);
        res.status(500).json({
            message: "Error fetching admin list",
        });
    }
};

// 어드민과 회사 연결
exports.connectAdminCompany = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Connect Admin And Company
  router.patch('/admins/connectAdminCompany', admins.connectAdminCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;

    try {
        await dbModels.Admin.findOneAndUpdate(
            {
                _id: data.admin_id,
            },
            {
                company_id: data.company_id,
            },
            {
                new: true,
            }
        );

        return res.status(200).send({
            message: "Successfully connected the admin and the company",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error connecting the admin and the company",
        });
    }
};

// 어드민과 회사 연결해제
exports.disconnectAdminCompany = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Disconnect Admin And Company
  router.patch('/admins/disconnectAdminCompany', admins.disconnectAdminCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;

    try {
        await dbModels.Admin.findOneAndUpdate(
            {
                _id: data.admin_id,
            },
            {
                company_id: null,
            }
        );

        return res.status(200).send({
            message: "Successfully disconnected the admin and the company",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error disconnecting the admin and the company",
        });
    }
};
