const { ObjectId } = require('bson');

exports.getAdminList = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Admin List Info
  router.get('/getAdminList', admins.getAdminList);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const {
    active = 'createdAt',
    direction = 'asc',
    pageIndex = '0',
    pageSize = '10'
  } = req.query;

  const limit = parseInt(pageSize, 10);
  const skip = parseInt(pageIndex, 10) * limit;
  const sortCriteria = {
    [active]: direction === 'desc' ? -1 : 1,
  };

  try {
    const [total, adminList] = await Promise.all([
      dbModels.Admin.countDocuments(),
      dbModels.Admin.find()
        .populate('company_id')
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
    ]);

    res.status(200).json({
      message: 'Get admin list successful',
      data: adminList,
      total_count: total
    });
  } catch (error) {
    console.error('[ ERROR ]', error);
    res.status(500).json({
      message: 'Error fetching admin list',
      error: error.message // 제공된 에러 메시지를 사용자에게 반환
    });
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
        _id: data.admin_id
      },
      {
        company_id: data.company_id,
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
        company_id: null
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