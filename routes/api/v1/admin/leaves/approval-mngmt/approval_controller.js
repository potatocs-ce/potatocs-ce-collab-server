const { ObjectId } = require("bson");

exports.getPendingRequest = async (req, res) => {
  console.log(`
--------------------------------------------------
    User : ${req.decoded._id}
    API  : get pending company request data
    router.get('/getPendingRequest', companyCtrl.getPendingRequest);
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  try {
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


    const criteria = {
      _id: req.decoded._id
    }

    const projection = '_id company_id'

    const adminInfo = await dbModels.Admin.findById(criteria, projection).lean();

    // console.log(adminInfo);

    const pendingRequestData = await dbModels.PendingCompanyRequest.aggregate([
      {
        $match: {
          company_id: adminInfo.company_id,
          status: 'pending'
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            memberId: '$member_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$memberId']
                }
              }
            },
            {
              $project: {
                name: 1,
                email: 1
              }
            }
          ],
          as: 'memberInfo'
        }
      },
      {
        $unwind: {
          path: '$memberInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          email: '$memberInfo.email',
          name: '$memberInfo.name',
          status: 1,
          createdAt: 1
        }
      },
      { $sort: sortCriteria },
      { $skip: skip },
      { $limit: limit }

    ])

    console.log(pendingRequestData);

    return res.status(200).send({
      message: 'loaded',
      data: pendingRequestData
    })

  } catch (err) {
    console.log(err)
    return res.status(500).send({
      message: 'DB Error'
    });
  }
}

// 1. Reqeust 수락
exports.approveRequest = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Approved Company Request
  router.put('/approveRequest', approvalMngmtCtrl.approveRequest);
  query: ${JSON.stringify(req.body)} _id name startDate endDate
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  console.log(req.body);
  try {
    const matchCriteria = {
      _id: ObjectId(req.body._id)
    }

    const updateData = {
      status: 'approve'
    }
    // const projection = 'member_id company_id status';

    // 1. 수락 업데이트
    const updatedRequest = await dbModels.PendingCompanyRequest.findOneAndUpdate(matchCriteria, updateData);
    // console.log(updatedRequest);
    if (!updatedRequest) {
      return res.status(404).send({
        message: '1',
      })
    }

    // 2. 데이터 확인 후 삭제
    // const deletedRequest = await dbModels.PendingCompanyRequest.findOneAndDelete(matchCriteria);
    // if (!deletedRequest) {
    //     return res.status(404).send({
    //         message: '2',
    //     })
    // }

    // 3. 히스토리 추가
    // PendingCompanyRequestHistory
    const historyData = {
      member_id: updatedRequest.member_id,
      company_id: updatedRequest.company_id,
      status: updatedRequest.status,
      approver_id: req.decoded._id,
    }

    const requestHistory = dbModels.PendingCompanyRequestHistory(historyData);
    await requestHistory.save();

    //// member에 company_id 넣어주기 and startDate, endDate도 넣어주기
    /// 시작일 관련해서 n년차 휴가 가져오기
    // const today = new Date();
    // const startContract = new Date(req.body.startDate);
    // // // 연차이므로 아직 1년이 안되면 1년차이므로 + 1
    // const year = Math.floor((today -startContract) / (1000 * 60 * 60 * 24 * 365) + 1);

    // const today = moment(new Date());
    // const empStartDate = moment(req.body.startDate);
    // const careerYear = (today.diff(empStartDate, 'years') + 1);

    const memberCompanyId = await dbModels.Member.findOneAndUpdate(
      {
        _id: updatedRequest.member_id,
      },
      {
        company_id: ObjectId(updatedRequest.company_id),
        emp_start_date: req.body.startDate,
        emp_end_date: req.body.endDate,
        // years: careerYear
      }
    )
    // console.log('memberCompanyId');
    // console.log(memberCompanyId);
    //// leave_standard 스키마 만들어주기
    //// Company 에서 leave_standard가져오기
    const companyLeaveStandard = await dbModels.Company.findOne(
      {
        _id: updatedRequest.company_id
      }
    ).lean();


    // console.log('companyLeaveStandard');
    // console.log(companyLeaveStandard.leave_standard);

    const createLeaveStandard = dbModels.PersonalLeaveStandard(
      {
        member_id: updatedRequest.member_id,
        leave_standard: companyLeaveStandard.leave_standard
      },
    )
    // console.log(createLeaveStandard);
    await createLeaveStandard.save();

    // 4. 나머지 Company Request 데이터 로드 >> Company Request Storage 업데이트
    const pendingRequestData = await dbModels.PendingCompanyRequest.aggregate([
      {
        $match: {
          company_id: requestHistory.company_id,
          status: 'pending'
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            memberId: '$member_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$memberId']
                }
              }
            },
            {
              $project: {
                name: 1,
                email: 1
              }
            }
          ],
          as: 'memberInfo'
        }
      },
      {
        $unwind: {
          path: '$memberInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          email: '$memberInfo.email',
          name: '$memberInfo.name',
          status: 1,
          createdAt: 1
        }
      }

    ])

    // console.log(pendingRequestData);

    return res.status(200).send({
      message: 'approved',
      pendingRequestData
    })

  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};

// 1, Request 삭제 2, History 추가
exports.deleteRequest = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : delete Company Request
  router.delete('/deleteRequest', approvalMngmtCtrl.deleteRequest);
  query: ${JSON.stringify(req.query)} pending company request _id
--------------------------------------------------`);


  const dbModels = global.DB_MODELS;

  try {

    const matchCriteria = {
      _id: ObjectId(req.query._id)
    }

    const updateData = {
      status: 'reject'
    }

    // const projection = 'member_id company_id status';

    // 1. 거절 업데이트
    const updatedRequest = await dbModels.PendingCompanyRequest.findOneAndUpdate(matchCriteria, updateData);

    // console.log(updatedRequest);
    if (!updatedRequest) {
      return res.status(404).send({
        message: '1',
      })
    }

    // 2. 데이터 확인 후 삭제
    const deletedRequest = await dbModels.PendingCompanyRequest.findOneAndDelete(matchCriteria);

    if (!deletedRequest) {
      return res.status(404).send({
        message: '2',
      })
    }
    // 3. 히스토리 추가
    // PendingCompanyRequestHistory
    const historyData = {
      member_id: deletedRequest.member_id,
      company_id: deletedRequest.company_id,
      status: deletedRequest.status,
      approver_id: req.decoded._id,
    }

    const requestHistory = dbModels.PendingCompanyRequestHistory(historyData);
    await requestHistory.save();

    // 4. 나머지 Company Request 데이터 로드 >> Company Request Storage 업데이트
    const pendingRequestData = await dbModels.PendingCompanyRequest.aggregate([
      {
        $match: {
          company_id: requestHistory.company_id,
          status: 'pending'
        }
      },
      {
        $lookup: {
          from: 'members',
          let: {
            memberId: '$member_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$memberId']
                }
              }
            },
            {
              $project: {
                name: 1,
                email: 1
              }
            }
          ],
          as: 'memberInfo'
        }
      },
      {
        $unwind: {
          path: '$memberInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          email: '$memberInfo.email',
          name: '$memberInfo.name',
          status: 1,
          createdAt: 1
        }
      }

    ])

    // console.log(pendingRequestData);

    return res.status(200).send({
      message: 'deleted',
      pendingRequestData
    })

  } catch (err) {
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};