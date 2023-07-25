const { ObjectId } = require('bson');

// 회사 공휴일 목록 불러오기
exports.getCompanyHolidayList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add company
  router.post('/getCompanyHolidayList', companyMngmtCtrl.getCompanyHolidayList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        // company id 가져오기
        const findCompanyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id
            },
            {
                _id: 0,
                company_id: 1,
            }
        )


        const findCompanyHoliday = await dbModels.Company.findOne({
            _id: findCompanyId.company_id
        },
            {
                _id: 0,
                company_holiday: 1
            }
        );

        return res.status(200).send({
            message: 'Success find company holiday',
            findCompanyHoliday
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'Loadings company holiday Error'
        })
    }
};

exports.getCompanyHolidayList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add company
  router.post('/getCompanyHolidayList', companyMngmtCtrl.getCompanyHolidayList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        // company id 가져오기
        const findCompanyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id
            },
            {
                _id: 0,
                company_id: 1,
            }
        )


        const findCompanyHoliday = await dbModels.Company.findOne({
            _id: findCompanyId.company_id
        },
            {
                _id: 0,
                company_holiday: 1
            }
        );

        return res.status(200).send({
            message: 'Success find company holiday',
            findCompanyHoliday
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'Loadings company holiday Error'
        })
    }
};

// 회사 공휴일 등록
exports.addCompanyHoliday = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add company
  router.post('/addCompanyHoliday', companyMngmtCtrl.addCompanyHoliday);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        // company id 가져오기
        const findCompanyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id
            },
            {
                _id: 0,
                company_id: 1,
            }
        )

        // // company_holiday 중복체크
        // const CompanyHolidayCheck = await dbModels.Company.findOne({
        //     _id: findCompanyId.company_id,
        //     company_holiday: [{ ch_date:
        //         {$in:req.body.ch_date}
        //     }]

        //     })

        // console.log(CompanyHolidayCheck)

        // if (CompanyHolidayCheck){
        //     return res.status(500).send({
        //         message: 'Duplicate company holiday error.'
        //     })
        // }

        const updateCompanyHoliday = await dbModels.Company.findOneAndUpdate({
            _id: findCompanyId.company_id,
        },
            {
                $push: {
                    company_holiday: {
                        "ch_name": req.body.ch_name,
                        "ch_date": req.body.ch_date,
                    }
                }
            },
            {
                upsert: true,
            }
        ).exec();

        return res.status(200).send({
            message: 'Success add company holiday',
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'Adding company holiday Error'
        })
    }
};

// 회사 공휴일 삭제
exports.deleteCompanyHoliday = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : delete company holiday
  router.post('/deleteCompanyHoliday', companyMngmtCtrl.deleteCompanyHoliday);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        console.log(req.body)
        // company id 가져오기
        const findCompanyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id
            },
            {
                _id: 0,
                company_id: 1,
            }
        )


        const updateCompanyHoliday = await dbModels.Company.findOneAndUpdate({
            _id: findCompanyId.company_id
        },
            {
                $pull: {
                    company_holiday: {
                        "_id": req.body._id,
                    }
                }
            },
            {
                upsert: true,
            }
        ).exec();

        return res.status(200).send({
            message: 'Success delete company holiday',
        })


    } catch (err) {

        res.status(500).send({
            message: 'Deleting company holiday Error'
        })
    }
};

