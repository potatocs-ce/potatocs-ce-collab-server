const { ObjectId } = require('bson');

exports.getAdminList = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Admin List Info
  router.get('/getAdminList', adminMngmtCtrl.getAdminList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const adminList = await dbModels.Admin.find().populate('company_id');

        // console.log(adminList);

        return res.status(200).send({
            message: 'get admin list',
            adminList
        })


    } catch (err) {
        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'get admin list Error'
        })
    }
};



exports.connectAdminCompany = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Connect company and admin
  router.put('/connectAdminCompany', adminMngmtCtrl.connectAdminCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;
    console.log(data);
    try {

        const adminInfo = await dbModels.Admin.findOneAndUpdate(
            {
                _id : data.admin_id
            },
            {
                company_id : data.company_id,
            },
            {
				new: true
			}
        )
        console.log(adminInfo);

        return res.status(200).send({
            message: 'connect company and admin',
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'connect company and admin Error'
        })
    }
};

exports.disconnectAdminCompany = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Connect company and admin
  router.put('/disconnectAdminCompany', adminMngmtCtrl.disconnectAdminCompany);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.body;
    console.log(data);
    try {

        await dbModels.Admin.findOneAndUpdate(
            {
                _id: data.admin_id
            },
            {
                company_id : null
            }
        )
        

        return res.status(200).send({
            message: 'disconnect company and admin',
        })


    } catch (err) {

        console.log('[ ERROR ]', err);
        res.status(500).send({
            message: 'disconnect company and admin Error'
        })
    }
};