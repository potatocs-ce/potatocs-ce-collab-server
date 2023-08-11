const { ObjectId } = require("bson");

exports.addingCompany = async (req, res) => {
  console.log(`
--------------------------------------------------
    User : ${req.decoded._id}
    API  : adding company
    router.post('/addingCompany', companyCtrl.addingCompany);
    data: ${req.body.company_code}
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;

  try {
    const isExisted = await dbModels.PendingCompanyRequest.findOne({
      member_id: req.decoded._id,
    });

    if (isExisted != null) {
      return res.status(500).send({
        message: "4",
      });
    }

    const isCompany = await dbModels.Company.findOne({
      company_code: req.body.company_code,
    });

    if (isCompany == null) {
      return res.status(404).send({
        message: "5",
      });
    }

    const addedRequest = await dbModels.PendingCompanyRequest({
      member_id: req.decoded._id,
      company_id: isCompany._id,
      status: "pending",
    });
    await addedRequest.save();

    const pendingCompanyData = await dbModels.PendingCompanyRequest.aggregate([
      {
        $match: {
          member_id: ObjectId(req.decoded._id),
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "company_id",
          foreignField: "_id",
          as: "company",
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          request_id: "$_id",
          _id: "$company._id",
          company_code: "$company.company_code",
          company_name: "$company.company_name",
          status: 1,
        },
      },
    ]);

    return res.status(200).send({
      message: "saved",
      pendingCompanyData: pendingCompanyData[0],
    });
  } catch (err) {
    return res.status(500).send({
      message: "DB Error",
    });
  }
};

//박재현
exports.editCompany = async (req, res) => {
  console.log(`
--------------------------------------------------
    User : ${req.decoded._id}
    API  : adding company
    router.post('/addingCompany', companyCtrl.addingCompany);
    data: ${req.body.company_code}
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;

  try {
    const isExisted = await dbModels.PendingCompanyRequest.findOne({
      member_id: req.decoded._id,
    });

    if (isExisted != null) {
      return res.status(500).send({
        message: "4",
      });
    }

    const isCompany = await dbModels.Company.findOne({
      company_code: req.body.company_code,
    });

    if (isCompany == null) {
      return res.status(404).send({
        message: "5",
      });
    }

    const addedRequest = await dbModels.PendingCompanyRequest({
      member_id: req.decoded._id,
      company_id: isCompany._id,
      status: "pending",
    });
    await addedRequest.save();

    const pendingCompanyData = await dbModels.PendingCompanyRequest.aggregate([
      {
        $match: {
          member_id: ObjectId(req.decoded._id),
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "company_id",
          foreignField: "_id",
          as: "company",
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          request_id: "$_id",
          _id: "$company._id",
          company_code: "$company.company_code",
          company_name: "$company.company_name",
          status: 1,
        },
      },
    ]);

    return res.status(200).send({
      message: "saved",
      pendingCompanyData: pendingCompanyData[0],
    });
  } catch (err) {
    return res.status(500).send({
      message: "DB Error",
    });
  }
};
//end

exports.getPendingCompanyRequest = async (req, res) => {
  console.log(`
--------------------------------------------------
    User : ${req.decoded._id}
    API  : get pending company request data
    router.get('/getPendingCompanyRequest', companyCtrl.getPedingCompanyRequest);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;

  try {
    const pendingCompanyData = await dbModels.PendingCompanyRequest.aggregate([
      {
        $match: {
          member_id: ObjectId(req.decoded._id),
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "company_id",
          foreignField: "_id",
          as: "company",
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          company_id: 1,
          company_name: "$company.company_name",
          member_id: 1,
          status: 1,
        },
      },
    ]);

    // console.log(pendingCompanyData);

    return res.status(200).send({
      message: "succeeded",
      pendingCompanyData,
    });
  } catch (err) {
    return res.status(500).send({
      message: "DB Error",
    });
  }
};

exports.deleteCompanyRequest = async (req, res) => {
  console.log(`
--------------------------------------------------
    User : ${req.decoded._id}
    API  : get pending company request data
    router.delete('/deleteCompanyRequest', companyCtrl.deleteCompanyRequest);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  console.log(req.params.request_id);

  try {
    const deleteCompany = await dbModels.PendingCompanyRequest.deleteOne({
      _id: ObjectId(req.params.request_id),
    });
    const deleteLeave = await dbModels.PersonalLeaveStandard.deleteOne({
      member_id: req.decoded._id,
    });

    const memberCompany = await dbModels.Member.findOneAndUpdate(
      {
        _id: req.decoded._id,
      },
      {
        company_id: null,
      }
    );

    return res.send({
      message: "succeeded",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "DB Error",
    });
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
    // const criteria = {
    // 	spaceTime_id: req.params.spaceTime
    // }

    const getCompany = await dbModels.Company.find();

    console.log(getCompany);

    return res.status(200).send({
      message: "getDocs",
      getCompany,
    });
  } catch (err) {
    console.log("[ ERROR ]", err);
    res.status(500).send({
      message: "Loadings Docs Error",
    });
  }
};
