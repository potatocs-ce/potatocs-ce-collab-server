const member = require('../../../../../models/member_schema');
const manager = require('../../../../../models/manager_schema');

exports.getManager = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Manager Info
  router.get('/get-manager', managerMngmtCtrl.getManager);
  
--------------------------------------------------`);
  try {
    const criteria = {
      myId: req.decoded._id
    }

    const projection = 'myManager myId accepted ';

    const requestedManager = await manager.findOne(criteria, projection);
    // console.log('requested findManager', requestedManager);

    if (!requestedManager) {
      return res.status(200).send({
        message: 'findManager'
      });
    }

    const managerCriteria = {
      _id: requestedManager.myManager
    };

    const managerProjection = 'email name isManager profile_img';

    const managerInfo = await member.findOne(managerCriteria, managerProjection);
    // console.log('managerInfo', managerInfo);

    const getManager = {
      _id: requestedManager._id,
      accepted: requestedManager.accepted,
      manager_id: requestedManager.myManager,
      email: managerInfo.email,
      name: managerInfo.name,
      profile_img: managerInfo.profile_img,
    }
    // console.log(getManager);

    return res.status(200).send({
      message: 'get Manager test',
      getManager
    })

  } catch (err) {
    // console.log(err);
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};

exports.findManager = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Find My Manager
  router.get('/find-manager/:id', managerMngmtCtrl.findManager);
  
  manager_email_id : ${req.query.searchStr}
--------------------------------------------------`);

  // console.log(req.query);

  try {

    const criteria = {
      email: req.query.searchStr,
    }

    const projection = 'email name profile_img mobile department company_id retired';

    const user = await member.findOne(criteria, projection);
    console.log(user);

    const { password, ...rest } = user;
    const result = { ...rest }

    if (user && user.retired == true) {
      return res.status(400).send({
        message: `An employee who's retired at the company.`
      });
    }
    if (!user) {
      return res.status(400).send({
        message: 'Cannot find the manager'
      });
    }
    if (user.company_id != req.query.company_id) {
      return res.status(400).send({
        message: `Cannot find the manager or An employee who's not registered at the company.`
      })
    }


    return res.send({
      user
    });

  } catch (err) {

    return res.status(500).send('DB Error');

  }

};

exports.addManager = async (req, res) => {
  console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Add Manager
	router.get('/add-manager', managerMngmtCtrl.addManager);

	manager_id : ${req.body.manager_id}
--------------------------------------------------`);

  try {

    const newManager = manager({
      myManager: req.body.manager_id,
      myId: req.decoded._id,
      accepted: false,
      requestedDate: new Date()
    });
    await newManager.save();

    const isManager = await member.findOneAndUpdate(
      {
        _id: req.body.manager_id
      },
      {
        isManager: true
      }
    )

    getManager = {
      accepted: false,
      email: isManager.email,
      manager_id: isManager._id,
      name: isManager.name,
      profile_img: isManager.profile_img,
      _id: isManager.myId,
    }
    res.send({
      message: 'requested',
      getManager
    });


  } catch (err) {
    // console.log(err);
    return res.status(500).send({
      message: 'DB Error'
    });
  }

};

/*
  manager_schema 안에 데이터가 있을 때
  accepted => false = 펜딩중 true = 수락 후 매니저/직원 관계
*/
exports.cancelPending = async (req, res) => {
  console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Cancel addManager Pending
	router.delete('/cancel-pending', managerMngmtCtrl.cancelPending);

	manager_id : ${req.params.id}
--------------------------------------------------`);

  try {

    const criteria = {
      _id: req.params.id
    }

    await manager.deleteOne(criteria);

    return res.status(200).send({
      message: 'canceled'
    });

  } catch (err) {
    return res.status(500).send({
      message: 'DB Error'
    });
  }

};

exports.deleteMyManager = async (req, res) => {
  console.log(`
--------------------------------------------------
User : ${req.decoded._id}
API  : Delete My Manager
router.delete('/delete-my-manager', managerMngmtCtrl.deleteMyManager);

managers_id : ${req.params.id}
--------------------------------------------------`);

  try {

    const criteria = {
      myManager: req.params.id
    }
    const updateData = {
      isManager: false
    }
    const projection = 'myManager';

    // myManager 아이디 빼오기
    const managerId = await manager.findOne(criteria, projection);

    // 매니저 삭제
    await manager.deleteOne(
      {
        myId: req.decoded._id
      }
    );

    if (managerId != null) {

      const criteria2 = {
        myManager: managerId.myManager
      }
      const criteria3 = {
        _id: managerId.myManager
      }

      // 삭제된 매니저가 다른 사원도 관리를 하는지 length
      const managerGetEmployeeCount = await manager.find(criteria2);
      // console.log(managerGetEmployeeCount.length);

      // 사원이 없으면 매니저의 isManager를 False로 바꾼다.
      if (managerGetEmployeeCount.length == 0) {
        console.log('isManager false');
        const managerFalse = await member.findOneAndUpdate(criteria3, updateData);
        return res.status(200).send({
          message: 'delete',
          isManager: 'false'
        })
      }
      // 사원이 있다면 그대로 true
      console.log('isManager true');
      return res.status(200).send({
        message: 'delete',
        isManager: 'true'
      });
    }
    else {
      return res.send({
        message: 'delete'
      })
    }

  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: 'DB Error'
    });
  }

};