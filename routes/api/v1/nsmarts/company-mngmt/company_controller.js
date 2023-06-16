const { ObjectId } = require('bson');
const randomize = require('randomatic');

exports.getCompanyList = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get company Info
  router.get('/getCompanyList', companyMngmtCtrl.getCompanyList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {

        // const criteria = {
        // 	spaceTime_id: req.params.spaceTime
        // }

        const getCompany = await dbModels.Company.find();

        console.log(getCompany);

        return res.status(200).send({
            message: 'getDocs',
            getCompany
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'Loadings Docs Error'
        })
    }
};



// 회사 등록
exports.addCompany = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add company
  router.post('/addCompany', companyMngmtCtrl.addCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    let company_code = randomize('aA0', 6);


    const findCompanyCode = await dbModels.Company.findOne({
        company_code : company_code
    });

    if(findCompanyCode) {
        company_code = randomize('aA0', 6);
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
            rd_validity_term: req.body.isReplacementDay == true ? req.body.rd_validity_term : null,
            annual_policy: req.body.annual_policy === 'byYear' ? 'byYear' : req.body.annual_policy == 'byContract' ? 'byContract': null,
        }
        
        const addCompany = dbModels.Company(addCompanyData);
        await addCompany.save();

        return res.status(200).send({
            message: 'Success add company',
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'Loadings Docs Error'
        })
    }
};



// 회사 정보 가져오기
exports.getCompanyInfo = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : get company info
  router.get('/getCompanyInfo', companyMngmtCtrl.getCompanyInfo);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {

        console.log(req.query._id)

        const criteria = {
        	_id: req.query._id
        }


       
        const getCompany = await dbModels.Company.findOne(
            criteria
        )

        return res.status(200).send({
            message: 'getCompany',
            getCompany
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'Loadings Docs Error'
        })
    }
};

exports.getCompanyList = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get company Info
  router.get('/getCompanyList', companyMngmtCtrl.getCompanyList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const getCompany = await dbModels.Company.find();
        return res.status(200).send({
            message: 'getDocs',
            getCompany
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'Loadings Docs Error'
        })
    }
};



// 회사 수정
exports.editCompany = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add company
  router.post('/addCompany', companyMngmtCtrl.addCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        let editCompany;

     
        editCompany = {
                company_name: req.body.company_name,
                leave_standard: req.body.leave_standard,
                rollover: req.body.rollover,
                rollover_max_month: req.body.rollover == true ? req.body.rollover_max_month : null,
                rollover_max_day: req.body.rollover == true ? req.body.rollover_max_day : null,
                isReplacementDay: req.body.isReplacementDay,
                rd_validity_term: req.body.isReplacementDay == true ? req.body.rd_validity_term : null,
                annual_policy: req.body.annual_policy === 'byYear' ? 'byYear' : req.body.annual_policy == 'byContract' ? 'byContract': null,
            } 
     
            

        const updateCompany = await dbModels.Company.findOneAndUpdate({_id: req.body._id}, editCompany )
        
        return res.status(200).send({
            message: 'Success edit company',
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'Loadings Docs Error'
        })
    }
};

exports.deleteCompany = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get company Info
  router.get('/deleteCompany', companyMngmtCtrl.deleteCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {

        const deleteCompany = await dbModels.Company.deleteOne({_id : req.query._id});

        return res.status(200).send({
            message: 'delete company',
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'Loadings Docs Error'
        })
    }
};