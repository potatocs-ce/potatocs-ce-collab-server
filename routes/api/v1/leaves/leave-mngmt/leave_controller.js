// const { ObjectId } = require('bson');
const moment = require("moment");
const { string } = require('sharp/lib/is');

const nodemailer = require("nodemailer");
const { default: mongoose } = require('mongoose');
const { ObjectId } = require('mongodb')

exports.requestLeave = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Request Leave
  User: ${req.decoded._id}
  router.post('/request-leave', leaveMngmtCtrl.requestLeave) 
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;

  try {
    // 매니저 정보 가져오기
    const findMyManagerCriteria = {
      myId: req.decoded._id,
      accepted: true
    };
    const getManagerData = dbModels.Manager.findOne(findMyManagerCriteria).populate('myManager', 'email').lean();

    // 직원 정보 가져오기
    const userYear = dbModels.Member.findById(req.decoded._id).lean();

    // 매니저 정보, 유저 정보 동시에 가져오기
    const [managerData, userYearData] = await Promise.all([getManagerData, userYear]);

    // 근속 연수 계산
    const today = moment(req.body.leave_start_date);
    const empStartDate = moment(userYearData.emp_start_date);
    const careerYear = today.diff(empStartDate, 'years');

    // 휴가 요청 데이터 준비
    const leaveReqInput = {
      leaveType: req.body.leaveType,
      leaveDay: req.body.leaveDay,
      leaveDuration: req.body.leaveDuration,
      leave_start_date: req.body.leave_start_date,
      leave_end_date: req.body.leave_end_date,
      leave_reason: req.body.leave_reason,
      status: req.body.status,
      requestor: req.decoded._id,
      approver: managerData.myManager,
      year: careerYear
    };

    const emailInput = {
      requestor: userYearData.name,
      leaveType: leaveViewType(req.body.leaveType),
      leave_start_date: req.body.leave_start_date,
      leave_end_date: req.body.leave_end_date
    };

    // 비동기로 병렬 처리할 작업들
    await Promise.all([
      saveLeaveRequest(leaveReqInput, dbModels),
      updateRolloverIfNeeded(req, careerYear, dbModels),
      saveNotification(req, managerData.myManager, userYearData.name, dbModels)
    ]);

    // 이메일 전송은 요청 응답 후 비동기로 처리
    sendEmailNotification(managerData.myManager.email, emailInput);

    // 요청 완료 응답
    return res.send({ message: 'requested' });

  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'DB Error' });
  }
};

// 휴가 요청 저장 함수
async function saveLeaveRequest(leaveReqInput, dbModels) {
  const LeaveRequestList = new dbModels.LeaveRequest(leaveReqInput);
  await LeaveRequestList.save();
}

// 이메일 전송 함수
async function sendEmailNotification(toEmail, emailInput) {
  const transporter = nodemailer.createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.AWS_SES_ACCESS_KEY,
      pass: process.env.AWS_SES_SECRET_ACCESS_KEY
    }
  });

  const mailOptions = {
    from: 'POTATOCS <info@potatocs.com>',
    to: toEmail,
    subject: 'Employee Leave Request via Potatocs',
    html: generateEmailBodyHtml(emailInput)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully.");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// 이메일 본문 생성 함수
function generateEmailBodyHtml(emailInput) {
  return `
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width">
        <meta name="x-apple-disable-message-reformatting">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap" rel="stylesheet">
      </head>
      <body>
        <table style="width: 600px; box-shadow: 0 1px 4px 0 rgb(0 0 0 / 14%); margin: 30px;">
          <div style="margin: 30px;">
            <div style="width:600px; font-weight: bold; font-size: 16px; color: rgb(140, 140, 140); font-family: 'Noto Sans', sans-serif;">
              Leave Management
            </div>
            <div style="width: 100%; font-family: 'Noto Sans', sans-serif;">
              <div style="margin: 60px 0; text-align: center;">
                <div>
                  <img src="https://shared-potatocs.s3.ap-northeast-2.amazonaws.com/icons/e-con.png" alt="">
                </div>
                <div style="font-size: 30px; margin-top: 20px; text-align: center; color: #000;">
                  Employee Leave Request
                </div>
              </div>
              <div style="height:2px; background: rgb(226, 226, 226); margin: 20px 0;"></div>
              <div style="font-weight: bold; font-size:16px; margin-bottom:30px; color: #000;">
                ${emailInput.requestor} has requested a leave.
              </div>
              <div style="font-weight: bold; font-size:14px;">
                <div style="display: flex; flex-direction: row; margin-bottom: 10px;">
                  <div style="width: 150px; color: rgb(140, 140, 140); margin-left: 20px;">
                    Requestor
                  </div>
                  <div style="color: #000;">
                    ${emailInput.requestor}
                  </div>
                </div>
                <div style="display: flex; flex-direction: row; margin-bottom: 10px;">
                  <div style="width: 150px; color: rgb(140, 140, 140); margin-left: 20px;">
                    Leave Type
                  </div>
                  <div style="color: #000;">
                    ${emailInput.leaveType}
                  </div>
                </div>
                <div style="display: flex; flex-direction: row;">
                  <div style="width: 150px; color: rgb(140, 140, 140); margin-left: 20px;">
                    Period
                  </div>
                  <div style="color: #000;">
                    ${emailInput.leave_start_date} ~ ${emailInput.leave_end_date}
                  </div>
                </div>
              </div>
              <div style="height:2px; background: rgb(226, 226, 226); margin: 20px 0;"></div>
              <div style="display: -webkit-flex; display: flex; box-sizing: border-box; width: 100%; align-items: center; direction: rtl; font-size: 20px; font-weight: bold;">
                <div>
                  <a style="text-decoration: none; color:rgb(74, 119, 216)" href='${process.env.POTATOCS_URL}approval-mngmt/leave-request'>
                    Detail
                  </a>
                </div>
              </div>
            </div>
          </div>
        </table>
      </body>
    </html>`;
}

// 롤오버 업데이트 함수
async function updateRolloverIfNeeded(req, careerYear, dbModels) {
  if (req.body.leaveType !== 'annual_leave') return;

  const rolloverTotal = await dbModels.PersonalLeaveStandard.findOne({ member_id: req.decoded._id }).lean();
  if (rolloverTotal.leave_standard[careerYear]["rollover"] != undefined) {
    let rollover = rolloverTotal.leave_standard[careerYear].rollover - req.body.leaveDuration;
    await dbModels.PersonalLeaveStandard.findOneAndUpdate(
      {
        member_id: req.decoded._id,
        'leave_standard.year': careerYear + 1
      },
      {
        $set: { 'leave_standard.$.rollover': rollover }
      },
      { new: true }
    );
  }
}

// 알림 저장 함수
async function saveNotification(req, manager, requestorName, dbModels) {
  const notification = new dbModels.Notification({
    sender: req.decoded._id,
    receiver: manager,
    notiType: 'leave-request',
    isRead: false,
    iconText: 'open_in_browser',
    notiLabel: `A new leave request received\nEmployee: ${requestorName}`,
    navigate: 'approval-mngmt/leave-request'
  });

  await notification.save();
}


exports.getMyLeaveStatus = async (req, res) => {

  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get My Leave status
  router.get('/my-status', leaveMngmtCtrl.getMyLeaveStatus);
--------------------------------------------------`);

  // total >> used_leave + memeber_leave with a condition, leaveType
  // used_leave 에 있는 사용된 휴가
  // 현재 member에 있는 나의 휴가
  const dbModels = global.DB_MODELS;
  //////////////////////////////////////////////////////

  try {

    const criteria = {
      _id: req.decoded._id
    }

    const projection = 'emp_start_date'

    // 계약일 가져오기
    const userContractInfo = await dbModels.Member.findOne(criteria, projection);
    // console.log(userContractInfo)
    if (userContractInfo.emp_start_date == null) {
      return res.send({
        message: 'yet'
      });
    }

    // // 연차 계산
    const date = new Date();
    const today = moment(new Date());
    const empStartDate = moment(userContractInfo.emp_start_date);
    const careerYear = (today.diff(empStartDate, 'years') + 1);

    // Total Leave 가져오기
    const criteria2 = {
      member_id: req.decoded._id
    }
    const totalLeave = await dbModels.PersonalLeaveStandard.findOne(criteria2);
    const leave = totalLeave.leave_standard.find((item) => item.year == careerYear)
    console.log(totalLeave)

    console.log(leave)
    // 년차 일 가져오기
    const startYear = moment(userContractInfo.emp_start_date.getTime()).add(careerYear - 1, "y").format('YYYY-MM-DD');
    // console.log(startYear);

    const endYear = moment(userContractInfo.emp_start_date.getTime()).add(careerYear, "y").subtract(1, "d").format('YYYY-MM-DD');
    // console.log(endYear);

    const usedLeave = await dbModels.LeaveRequest.find(
      {
        requestor: req.decoded._id,
        leave_start_date: { "$gte": startYear, "$lt": endYear },
        status: {
          $in: ['pending', 'approve']
        }
      }
    )
    console.log(usedLeave);


    let used_annual_leave = 0;
    let used_sick_leave = 0;
    let used_replacement_leave = 0;
    let used_rollover = 0;

    for (let index = 0; index < usedLeave.length; index++) {

      if (usedLeave[index].leaveType == 'annual_leave') {
        used_annual_leave += usedLeave[index].leaveDuration
      }

      else if (usedLeave[index].leaveType == 'sick_leave') {
        used_sick_leave += usedLeave[index].leaveDuration
      }

      else if (usedLeave[index].leaveType == 'replacement_leave') {
        used_replacement_leave += usedLeave[index].leaveDuration
      }

      else if (usedLeave[index].leaveType == 'rollover') {
        used_rollover += usedLeave[index].leaveDuration
      }
    }

    const leaveInfo = {
      startYear: startYear,
      endYear: endYear,
      annual_leave: leave.annual_leave,
      rollover: leave.rollover,
      sick_leave: leave.sick_leave,
      replacement_leave: leave.replacement_leave,
      used_annual_leave: used_annual_leave,
      used_sick_leave: used_sick_leave,
      used_replacement_leave: used_replacement_leave,
      used_rollover: used_rollover,
    }
    // console.log(leaveInfo);
    return res.status(200).send(leaveInfo);

  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: 'DB Error'
    });

  }
};



exports.getMyRequestList = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Get My Reqeust List
  User: ${req.decoded._id}
  router.get('/my-request', leaveMngmtCtrl.getMyRequestList) 
--------------------------------------------------`);


  const dbModels = global.DB_MODELS;
  try {

    // 3개월 이전만 match하기 위한 date
    // date = new Date();
    // compareThreeMonth = new Date(date.setMonth(date.getMonth() - 2));

    // 신청일 기준 3개월 이전
    const compareThreeMonth = moment().subtract(2, 'months').startOf('month').format('YYYY-MM-DD');
    const leaveRequestList = await dbModels.LeaveRequest.aggregate([
      {
        $match: {
          requestor: new mongoose.Types.ObjectId(req.decoded._id),
          leave_start_date: { $gte: new Date(compareThreeMonth) },
          status: 'approve'
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'approver',
          foreignField: '_id',
          as: 'members'
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'requestor',
          foreignField: '_id',
          as: 'name'
        }
      },
      {
        $project: {
          _id: 1,
          createdAt: {
            $dateToString: {
              format: "%Y-%m-%d", date: "$createdAt"
            }
          },
          leave_start_date: 1,
          leave_end_date: 1,
          leaveDuration: 1,
          leaveType: 1,
          approver: '$members.name',
          status: 1,
          leave_reason: 1,
          requestorName: '$name.name'
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      }

    ]);
    // console.log(LeaveRequestList);

    return res.status(200).send({
      leaveRequestList
    });

  } catch (err) {
    console.log(err)
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};

exports.getMyRequestListSearch = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Get My Reqeust List Search
  User: ${req.decoded._id}
  router.get('/my-request-search', leaveMngmtCtrl.getMyRequestListSearch) 
--------------------------------------------------`);


  const data = req.query;
  // console.log(data);


  const startDate = new Date(data.leave_start_date);
  const endDate = new Date(data.leave_end_date);

  let match_criteria = {
    requestor: new mongoose.Types.ObjectId(req.decoded._id),
    leave_start_date: { $gte: startDate, $lte: endDate }
  }
  if (data.status != 'all') {
    match_criteria.status = data.status;
  }
  if (data.type1 != 'all') {
    match_criteria.leaveType = data.type1;
  }
  if (data.type2 != 'all') {
    match_criteria.leaveDay = data.type2;
  }

  // console.log(match_criteria);

  const dbModels = global.DB_MODELS;
  try {

    const LeaveRequestListSearch = await dbModels.LeaveRequest.aggregate([
      {
        // $match: {
        // 	requestor: ObjectId(req.decoded._id),
        // }
        $match: match_criteria
      },
      {
        $lookup: {
          from: 'members',
          localField: 'approver',
          foreignField: '_id',
          as: 'members'
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'requestor',
          foreignField: '_id',
          as: 'name'
        }
      },
      // {
      // 	$addFields:{
      // 		statusStand: 'all',
      // 		leaveTypeStand: 'all',
      // 		leaveDurationStand: 'all'
      // 	}
      // },
      {
        $project: {
          _id: 1,
          createdAt: {
            $dateToString: {
              format: "%Y-%m-%d", date: "$createdAt"
            }
          },
          requestor: 1,
          requestorName: '$name.name',
          leave_start_date: 1,
          leave_end_date: 1,
          leaveDuration: 1,
          leaveType: 1,
          leaveDay: 1,
          approver: '$members.name',
          status: 1,
          leave_reason: 1,
          // statusStand: {
          // 	$cond:{
          // 		if: { $eq: ["$status", data.status] },
          // 		then: data.status,
          // 		else: 'all'
          // 	}
          // },
          // leaveTypeStand: {
          // 	$cond:{
          // 		if: { $eq: ["$leaveType", data.type1] },
          // 		then: data.type1,
          // 		else: 'all'
          // 	}
          // },
          // leaveDurationStand: {
          // 	$cond:{
          // 		if: { $eq: ["$leaveDay", data.type2] },
          // 		then: data.type2,
          // 		else: 'all'
          // 	}
          // },
          rejectReason: 1,
        }
      },
      // {
      // 	$match:{
      // 		leave_start_date: {$gte: startDate, $lte: endDate},
      // 		statusStand: data.status,
      // 		leaveTypeStand: data.type1,
      // 		leaveDurationStand: data.type2
      // 	}
      // },
      {
        $sort: { createdAt: -1 }
      }
    ]);
    // console.log(LeaveRequestListSearch);
    // console.log('LeaveRequestListSearch')
    return res.status(200).send(LeaveRequestListSearch);

  } catch (error) {
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};

// pending 상태의 자기가 신청한 휴가 취소
exports.cancelMyRequestLeave = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Get My Reqeust List Search
  User: ${req.decoded._id}
  router.delete('/delete-request-leave', leaveMngmtCtrl.deleteRequestLeave); // 신청한 휴가 취소
--------------------------------------------------`);


  const data = req.body;
  // console.log(data);

  // console.log(match_criteria);

  const dbModels = global.DB_MODELS;
  try {
    ////////////////////
    // rollover 처리
    // leave type 이 annual_leave 일때만 rollover
    // 휴가 신청자 계약일 받아오고
    // console.log(data.requestor);
    const userYear = await dbModels.Member.findOne(
      {
        _id: data.requestor
      }
    )
    // console.log('userYear');
    // console.log(userYear);

    // 년차 뽑아옴
    const date = new Date();
    const today = moment(new Date());
    const empStartDate = moment(userYear.emp_start_date);
    const careerYear = (today.diff(empStartDate, 'years')) + 1;
    // console.log(careerYear);



    // rollover 값을 우선 찾는다..
    // console.log(data);
    const rolloverTotal = await dbModels.PersonalLeaveStandard.findOne(
      {
        member_id: data.requestor
      }
    )


    const leaveRequest = await dbModels.LeaveRequest.findOneAndUpdate(
      {
        _id: data._id
      },
      {
        status: 'Cancel'
      }
    )
    // console.log(leaveRequest)
    // rollover 변수에 duration 을 뺀 값을 저장

    // console.log(rolloverTotal);
    // console.log(rolloverTotal.leave_standard[careerYear]);
    // console.log(rolloverTotal.leave_standard[careerYear]['rollover'] != undefined);

    if (rolloverTotal.leave_standard[careerYear]['rollover'] != undefined) {
      if (req.body.leaveType == 'annual_leave') {

        rollover = rolloverTotal.leave_standard[careerYear].rollover + req.body.leaveDuration;
        // console.log(rollover);

        // 위에서 구한 변수로 set
        // 여기서 한번에 다 하고 싶었으나 안됨..
        const rolloverCal = await dbModels.PersonalLeaveStandard.findOneAndUpdate(
          {
            member_id: data.requestor,
            'leave_standard.year': careerYear + 1
          },
          {
            $set: {
              'leave_standard.$.rollover': rollover
            }
          }, { new: true }
        )
        // console.log(rolloverCal.leave_standard[careerYear + 1]);
      }
    }

    if (data.leaveType == 'replacement_leave') {
      const rdTaken = await dbModels.RdRequest.findOne(
        {
          _id: leaveRequest.rdRequest
        }
      )
      // console.log(rdTaken);
      const taken = rdTaken.taken - data.leaveDuration
      const rdRequest = await dbModels.RdRequest.findOneAndUpdate(
        {
          _id: leaveRequest.rdRequest
        },
        {
          taken: taken
        }
      )
    }



    return res.status(200).send({
      message: 'hihi'
    });

  } catch (error) {
    console.log(error)
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};

exports.requestConfirmRd = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Request Replacement Day Confirm
  User: ${req.decoded._id}
  router.post('/request-rd', leaveMngmtCtrl.requestConfirmRd) 
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;

  try {

    const findMyManagerCriteria = {
      myId: req.decoded._id,
      accepted: true
    }

    const getManagerData = await dbModels.Manager.findOne(findMyManagerCriteria).populate('myManager', '_id email').lean();

    const employee = await dbModels.Member.findOne(
      {
        _id: req.decoded._id
      },
      '_id name'
    ).lean();

    const leaveReqInput = {
      leaveType: req.body.leaveType,
      leaveDay: req.body.leaveDay,
      leaveDuration: req.body.leaveDuration,
      leave_start_date: req.body.leave_start_date,
      leave_end_date: req.body.leave_end_date,
      leave_reason: req.body.leave_reason,
      status: req.body.status,
      requestor: employee._id,
      approver: getManagerData.myManager._id,
    }

    const emailInput = {
      requestor: employee.name,
      leaveType: leaveViewType(req.body.leaveType),
      leave_start_date: req.body.leave_start_date,
      leave_end_date: req.body.leave_end_date,
    }

    const requestConfirmRdList = dbModels.RdRequest(leaveReqInput);
    await requestConfirmRdList.save();

    // --------------------------- AWS_SES

    // If you're using Amazon SES in a region other than US West (Oregon),
    // replace email-smtp.us-west-2.amazonaws.com with the Amazon SES SMTP
    // endpoint in the appropriate AWS Region.
    const smtpEndpoint = "email-smtp.us-east-1.amazonaws.com";

    // The port to use when connecting to the SMTP server.
    const port = 587;

    // Replace sender@example.com with your "From" address.
    // This address must be verified with Amazon SES.
    const senderAddress = "POTATOCS <info@potatocs.com>";

    // Replace recipient@example.com with a "To" address. If your account
    // is still in the sandbox, this address must be verified. To specify
    // multiple addresses, separate each address with a comma.
    var toAddresses = getManagerData.myManager.email;

    // CC and BCC addresses. If your account is in the sandbox, these
    // addresses have to be verified. To specify multiple addresses, separate
    // each address with a comma.
    // var ccAddresses = "cc-recipient0@example.com,cc-recipient1@example.com";
    var ccAddresses = "";
    var bccAddresses = "";

    // Replace smtp_username with your Amazon SES SMTP user name.
    const smtpUsername = process.env.AWS_SES_ACCESS_KEY;

    // Replace smtp_password with your Amazon SES SMTP password.
    const smtpPassword = process.env.AWS_SES_SECRET_ACCESS_KEY;

    // (Optional) the name of a configuration set to use for this message.
    // var configurationSet = "ConfigSet";
    var configurationSet = "";

    // The subject line of the email
    var subject = "Employee Replacement Day Confirming Request via Potatocs";

    // The email body for recipients with non-HTML email clients.
    var body_text = ``;
    // ---------------------------------
    // Check out! Someone has requested a leave request.

    // Click the link below
    // ${process.env.POTATOCS_URL}leave/approval-mngmt/pending-leave`;

    // The body of the email for recipients whose email clients support HTML content.
    var body_html =
      `<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width">
				<meta name="x-apple-disable-message-reformatting">
				<link rel="preconnect" href="https://fonts.googleapis.com">
				<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
				<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap" rel="stylesheet">
			</head>
			<body>
				<table style="width: 600px; box-shadow: 0 1px 4px 0 rgb(0 0 0 / 14%); margin: 30px;">
					
					<div style="margin: 30px;">
						<div style="width:600px; font-weight: bold; font-size: 16px; color: rgb(140, 140, 140); font-family: 'Noto Sans', sans-serif;">
							Leave Management
						</div>

						<div style="width: 100%; font-family: 'Noto Sans', sans-serif;">
				
							<div style="margin: 60px 0; text-align: center;">
								<div>
									<img src="https://shared-potatocs.s3.ap-northeast-2.amazonaws.com/icons/e-con.png" alt="">
								</div>
								<div style="font-size: 30px; margin-top: 20px; text-align: center; color: #000;">
									Employee Replacement Day Confirming Request
								</div>
							</div>
				
							<div style="height:2px; background: rgb(226, 226, 226); margin: 20px 0;"></div>
				
							<div style="font-weight: bold; font-size:16px; margin-bottom:30px; color: #000;">
								${emailInput.requestor} has requested a replacement day to confirm.
							</div>
				
							<div style="font-weight: bold; font-size:14px;">
								
								<div style="display: flex; flex-direction: row; margin-bottom: 10px;">
									<div style="width: 150px; color: rgb(140, 140, 140); margin-left: 20px;">
										Requestor
									</div>
									<div style="color: #000;">
										${emailInput.requestor}
									</div>
								</div>
								<div style="display: flex; flex-direction: row; margin-bottom: 10px;">
									<div style="width: 150px; color: rgb(140, 140, 140); margin-left: 20px;">
										Leave Type
									</div>
									<div style="color: #000;">
										${emailInput.leaveType}
									</div>
								</div>
								<div style="display: flex; flex-direction: row;">
									<div style="width: 150px; color: rgb(140, 140, 140); margin-left: 20px;">
										Period
									</div>
									<div style="color: #000;">
										${emailInput.leave_start_date} ~ ${emailInput.leave_end_date}
									</div>
								</div>
							</div>
				
							<div style="height:2px; background: rgb(226, 226, 226); margin: 20px 0;"></div>
				
							<div style="display: -webkit-flex; display: flex; box-sizing: border-box; width: 100%; align-items: center; direction: rtl; font-size: 20px; font-weight: bold;">
								<div>
									<a style="text-decoration: none; color:rgb(74, 119, 216)" href='${process.env.POTATOCS_URL}employee-mngmt/employee-rd-request'>
										Detail
									</a>
								</div>
							</div>
						</div>
					</div>
				
				</table>
			</body>
		</html>`
      ;

    // The message tags that you want to apply to the email.
    var tag0 = "key0=value0";
    var tag1 = "key1=value1";

    async function main() {

      // Create the SMTP transport.
      let transporter = nodemailer.createTransport({
        host: smtpEndpoint,
        port: port,
        secure: false, // true for 465, false for other ports
        auth: {
          user: smtpUsername,
          pass: smtpPassword
        }
      });

      // Specify the fields in the email.
      let mailOptions = {
        from: senderAddress,
        to: toAddresses,
        subject: subject,
        cc: ccAddresses,
        bcc: bccAddresses,
        text: body_text,
        html: body_html,
        // Custom headers for configuration set and message tags.
        headers: {
          'X-SES-CONFIGURATION-SET': configurationSet,
          'X-SES-MESSAGE-TAGS': tag0,
          'X-SES-MESSAGE-TAGS': tag1
        }
      };

      // Send the email.
      let info = await transporter.sendMail(mailOptions)

      // console.log("Message sent! Message ID: ", info.messageId);
    }

    main().catch(console.error);
    // --------------------------- AWS_SES

    //// notification
    const notification = await dbModels.Notification(
      {
        sender: req.decoded._id,
        receiver: getManagerData.myManager,
        notiType: 'request-confirm-rd',
        isRead: false,
        iconText: 'fact_check',
        notiLabel: 'A new request confirm RD received',
        navigate: 'employee-mngmt/employee-rd-request'
      }
    )

    await notification.save();
    /////////////////////////

    return res.send({
      message: 'requestConfirmRd'
    });

  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};

exports.getRdList = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Get Replacement Day List
  User: ${req.decoded._id}
  router.get('/getRdList', leaveMngmtCtrl.getRdList) 
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

    const rdList = await dbModels.RdRequest.aggregate([
      {
        $match: {
          requestor: new mongoose.Types.ObjectId(req.decoded._id),
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'approver',
          foreignField: '_id',
          as: 'manager'
        }
      },
      {
        $unwind: {
          path: '$manager',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'requestor',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: {
          path: '$employee',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          createdAt: {
            $dateToString: {
              format: "%Y-%m-%d", date: "$createdAt"
            }
          },
          leave_start_date: 1,
          leave_end_date: 1,
          leaveDuration: 1,
          leaveType: 1,
          approver: '$manager.name',
          status: 1,
          leave_reason: 1,
          requestor: '$employee.name',
          rejectReason: 1,
          taken: 1,
        }
      },
      { $sort: sortCriteria },
      { $skip: skip },
      { $limit: limit }
    ]);

    return res.status(200).send({
      message: 'getRdList',
      rdList
    });

  } catch (err) {
    console.log(err)
    return res.status(500).send({
      message: 'DB Error'
    });
  }
};

exports.requestCancelRd = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Delete Replacement Day Request
  Params: ${req.query._id}
  router.get('/requestCancelRd', leaveMngmtCtrl.requestCancelRd) 
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;

  try {

    const criteria = {
      _id: req.query._id
    }

    await dbModels.RdRequest.findOneAndDelete(criteria);

    return res.send({
      message: 'requestCancelRd'
    })

  } catch (err) {

    return res.status(500).send({
      message: 'DB Error'
    });
  }

};




exports.requestRdLeave = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Request RD Leave 
  Params: ${req.decoded._id}
  router.post('/requestRdLeave', leaveMngmtCtrl.requestRdLeave)
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.body;
  // console.log(data);

  try {

    // RdRequest taken처리
    const replaceTaken = await dbModels.RdRequest.findOne(
      {
        _id: data._id
      }
    )

    const taken = replaceTaken.taken + data.leaveDuration
    await dbModels.RdRequest.findOneAndUpdate(
      {
        _id: data._id
      },
      {
        taken: taken
      }
    )

    // leave request 처리
    const findMyManagerCriteria = {
      myId: req.decoded._id,
      accepted: true
    }

    const getManagerData = await dbModels.Manager.findOne(findMyManagerCriteria).populate('myManager', 'email');


    const userYear = await dbModels.Member.findOne(
      {
        _id: req.decoded._id
      }
    )

    const today = moment(req.body.leave_start_date);
    const empStartDate = moment(userYear.emp_start_date);
    const careerYear = (today.diff(empStartDate, 'years'));
    // console.log(careerYear);
    req.body.requestor = req.decoded._id;
    req.body.approver = getManagerData.myManager;
    req.body.year = careerYear;


    const leaveReqInput = {
      rdRequest: data._id,
      leaveType: req.body.leaveType,
      leaveDay: req.body.leaveDay,
      leaveDuration: req.body.leaveDuration,
      leave_start_date: req.body.leave_start_date,
      leave_end_date: req.body.leave_end_date,
      leave_reason: req.body.leave_reason,
      status: req.body.status,
      requestor: req.decoded._id,
      approver: getManagerData.myManager,
      year: careerYear,
    }

    const emailInput = {
      requestor: userYear.name,
      leaveType: leaveViewType(req.body.leaveType),
      leave_start_date: req.body.leave_start_date,
      leave_end_date: req.body.leave_end_date,
    }

    const LeaveRequestList = dbModels.LeaveRequest(leaveReqInput);
    await LeaveRequestList.save();

    // used leave 처리

    // --------------------------- AWS_SES

    // If you're using Amazon SES in a region other than US West (Oregon),
    // replace email-smtp.us-west-2.amazonaws.com with the Amazon SES SMTP
    // endpoint in the appropriate AWS Region.
    const smtpEndpoint = "email-smtp.us-east-1.amazonaws.com";

    // The port to use when connecting to the SMTP server.
    const port = 587;

    // Replace sender@example.com with your "From" address.
    // This address must be verified with Amazon SES.
    const senderAddress = "POTATOCS <info@potatocs.com>";

    // Replace recipient@example.com with a "To" address. If your account
    // is still in the sandbox, this address must be verified. To specify
    // multiple addresses, separate each address with a comma.
    var toAddresses = getManagerData.myManager.email;

    // CC and BCC addresses. If your account is in the sandbox, these
    // addresses have to be verified. To specify multiple addresses, separate
    // each address with a comma.
    // var ccAddresses = "cc-recipient0@example.com,cc-recipient1@example.com";
    var ccAddresses = "";
    var bccAddresses = "";

    // Replace smtp_username with your Amazon SES SMTP user name.
    const smtpUsername = process.env.AWS_SES_ACCESS_KEY;

    // Replace smtp_password with your Amazon SES SMTP password.
    const smtpPassword = process.env.AWS_SES_SECRET_ACCESS_KEY;

    // (Optional) the name of a configuration set to use for this message.
    // var configurationSet = "ConfigSet";
    var configurationSet = "";

    // The subject line of the email
    var subject = "Employee Replacement Day Leave Request via Potatocs";

    // The email body for recipients with non-HTML email clients.
    var body_text = ``;
    // ---------------------------------
    // Check out! Someone has requested a leave request.

    // Click the link below
    // ${process.env.POTATOCS_URL}leave/approval-mngmt/pending-leave`;

    // The body of the email for recipients whose email clients support HTML content.
    var body_html =
      `<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width">
				<meta name="x-apple-disable-message-reformatting">
				<link rel="preconnect" href="https://fonts.googleapis.com">
				<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
				<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap" rel="stylesheet">
			</head>
			<body>
				<table style="width: 600px; box-shadow: 0 1px 4px 0 rgb(0 0 0 / 14%); margin: 30px;">
					
					<div style="margin: 30px;">
						<div style="width:600px; font-weight: bold; font-size: 16px; color: rgb(140, 140, 140); font-family: 'Noto Sans', sans-serif;">
							Leave Management
						</div>

						<div style="width: 100%; font-family: 'Noto Sans', sans-serif;">
				
							<div style="margin: 60px 0; text-align: center;">
								<div>
									<img src="https://shared-potatocs.s3.ap-northeast-2.amazonaws.com/icons/e-con.png" alt="">
								</div>
								<div style="font-size: 30px; margin-top: 20px; text-align: center; color: #000;">
                                    Employee Replacement Day Leave Request
								</div>
							</div>
				
							<div style="height:2px; background: rgb(226, 226, 226); margin: 20px 0;"></div>
				
							<div style="font-weight: bold; font-size:16px; margin-bottom:30px; color: #000;">
								${emailInput.requestor} has requested a replacement day leave.
							</div>
				
							<div style="font-weight: bold; font-size:14px;">
								
								<div style="display: flex; flex-direction: row; margin-bottom: 10px;">
									<div style="width: 150px; color: rgb(140, 140, 140); margin-left: 20px;">
										Requestor
									</div>
									<div style="color: #000;">
										${emailInput.requestor}
									</div>
								</div>
								<div style="display: flex; flex-direction: row; margin-bottom: 10px;">
									<div style="width: 150px; color: rgb(140, 140, 140); margin-left: 20px;">
										Leave Type
									</div>
									<div style="color: #000;">
										${emailInput.leaveType}
									</div>
								</div>
								<div style="display: flex; flex-direction: row;">
									<div style="width: 150px; color: rgb(140, 140, 140); margin-left: 20px;">
										Period
									</div>
									<div style="color: #000;">
										${emailInput.leave_start_date} ~ ${emailInput.leave_end_date}
									</div>
								</div>
							</div>
				
							<div style="height:2px; background: rgb(226, 226, 226); margin: 20px 0;"></div>
				
							<div style="display: -webkit-flex; display: flex; box-sizing: border-box; width: 100%; align-items: center; direction: rtl; font-size: 20px; font-weight: bold;">
								<div>
									<a style="text-decoration: none; color:rgb(74, 119, 216)" href='${process.env.POTATOCS_URL}approval-mngmt/leave-request'>
										Detail
									</a>
								</div>
							</div>
						</div>
					</div>
				
				</table>
			</body>
		</html>`
      ;

    // The message tags that you want to apply to the email.
    var tag0 = "key0=value0";
    var tag1 = "key1=value1";

    async function main() {

      // Create the SMTP transport.
      let transporter = nodemailer.createTransport({
        host: smtpEndpoint,
        port: port,
        secure: false, // true for 465, false for other ports
        auth: {
          user: smtpUsername,
          pass: smtpPassword
        }
      });

      // Specify the fields in the email.
      let mailOptions = {
        from: senderAddress,
        to: toAddresses,
        subject: subject,
        cc: ccAddresses,
        bcc: bccAddresses,
        text: body_text,
        html: body_html,
        // Custom headers for configuration set and message tags.
        headers: {
          'X-SES-CONFIGURATION-SET': configurationSet,
          'X-SES-MESSAGE-TAGS': tag0,
          'X-SES-MESSAGE-TAGS': tag1
        }
      };

      // Send the email.
      let info = await transporter.sendMail(mailOptions)

      // console.log("Message sent! Message ID: ", info.messageId);
    }

    main().catch(console.error);
    // --------------------------- AWS_SES

    //// notification
    const notification = await dbModels.Notification(
      {
        sender: req.decoded._id,
        receiver: getManagerData.myManager,
        notiType: 'leave-request',
        isRead: false,
        iconText: 'open_in_browser',
        notiLabel: 'A new leave request received\nEmployee : ' + userYear.name,
        navigate: 'approval-mngmt/leave-request'
      }
    )

    await notification.save();
    /////////////////////////


    return res.send({
      message: 'hihi'
    })

  } catch (err) {

    return res.status(500).send({
      message: 'DB Error'
    });
  }

};


exports.getNationList = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Get National Holiday list
  Params: ${req.decoded._id}
  router.get('/getNationList', leaveMngmtCtrl.getNationList);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  const data = req.query.id;
  try {
    const nation = await dbModels.NationalHoliday.find(
      {
        _id: data
      }
    );

    return res.send({
      message: 'Get National Holiday list',
      nation
    })

  } catch (err) {
    console.log(err)
    return res.status(500).send({
      message: 'DB Error'
    });
  }

};

function leaveViewType(leaveType) {
  if (leaveType === 'annual_leave') {
    return 'Annual Leave';
  } else if (leaveType === 'sick_leave') {
    return 'Sick Leave';
  } else if (leaveType === 'replacement_leave') {
    return 'Replacement Day';
  }
}

exports.checkPendingLeave = async (req, res) => {
  console.log(`
--------------------------------------------------  
  API  : Check Pending Leave ( Manager change )
  Params: ${req.decoded._id}
  router.get('/checkPendingLeave', leaveMngmtCtrl.checkPendingLeave);
--------------------------------------------------`);

  const dbModels = global.DB_MODELS;
  try {

    const pendingLeave = await dbModels.LeaveRequest.find(
      {
        requestor: req.decoded._id,
        status: 'pending'
      }
    )

    console.log(pendingLeave.length);

    let pendingFlag
    if (pendingLeave.length == 0) {
      pendingFlag = true
    }
    else if (pendingLeave.length > 0) {
      pendingFlag = false
    }


    return res.send({
      message: 'Get Check Pending Leave',
      pendingFlag
    })

  } catch (err) {
    return res.status(500).send({
      message: 'DB Error'
    });
  }

};
