const router = require('express').Router();

/*-----------------------------------
  Contollers
-----------------------------------*/
const managerMngmtCtrl = require('./manager-mngmt/manager_controller');
const employeeMngmtCtrl = require('./employee-mngmt/employee_controller');
const leaveMngmtCtrl = require('./leave-mngmt/leave_controller');
const approvalMngmtCtrl = require('./approval-mngmt/approval_controller');
const companyCtrl = require('./company/company_controller');
/*-----------------------------------
  Manager Management 매니저 정보 로딩, 찾기, 추가, 삭제
-----------------------------------*/
router.get('/get-manager', managerMngmtCtrl.getManager);
router.get('/find-manager', managerMngmtCtrl.findManager);
router.post('/add-manager', managerMngmtCtrl.addManager);
router.delete('/cancel-pending/:id', managerMngmtCtrl.cancelPending);
router.delete('/delete-my-manager/:id', managerMngmtCtrl.deleteMyManager);

/*-----------------------------------
  Employee Management 직원들의 요청 리스트, 수락, 삭제
-----------------------------------*/
// Pending Employee
router.get('/pending-list', employeeMngmtCtrl.getPendingList); // 매니저 요청 한사람 리스트
router.delete('/cancel-request/:id', employeeMngmtCtrl.cancelRequest); // 매니저 요청 취소
router.put('/accept-request', employeeMngmtCtrl.acceptRequest); // 매니저 요청 수락

// Employee List
router.get('/employees', employeeMngmtCtrl.myEmployeeList); // M 매니저가 가지고 있는 사원
router.get('/employee-info/:id', employeeMngmtCtrl.getEmployeeInfo); // M employee list 에서 edit 했을때 불러오는 사원 데이터
router.put('/put-employee-info', employeeMngmtCtrl.UpdateEmployeeInfo); // M edit 눌렀을때 update
router.get('/myEmployee-leaveList-search', employeeMngmtCtrl.myEmployeeLeaveListSearch); // 매니저가 가지고 있는 사원의 휴가 정보
// router.get('/myManager-employee-list', employeeMngmtCtrl.myManagerEmployeeList); // admin이 관리하는 manager의 employee 리스트 가져오기


/*-----------------------------------
  Main Leave Management
-----------------------------------*/
router.post('/request-leave', leaveMngmtCtrl.requestLeave); // 휴가 요청
router.put('/cancel-my-request-leave', leaveMngmtCtrl.cancelMyRequestLeave); // 신청한 휴가 취소
router.get('/my-status', leaveMngmtCtrl.getMyLeaveStatus); // 내 휴가 현황(쓴거, 남은거, 토탈)
router.get('/my-request', leaveMngmtCtrl.getMyRequestList); //// 내가 신청한 내역(3개월내의 approve만)
router.get('/my-request-search', leaveMngmtCtrl.getMyRequestListSearch); //// 조건 걸고 search

router.post('/requestConfirmRd', leaveMngmtCtrl.requestConfirmRd); // Replacement Day Confirming Request
router.get('/getRdList', leaveMngmtCtrl.getRdList); // Get RD list
router.delete('/requestCancelRd', leaveMngmtCtrl.requestCancelRd); // Delete RD request
router.post('/requestRdLeave', leaveMngmtCtrl.requestRdLeave);	// Leave RD request

router.get('/getNationList', leaveMngmtCtrl.getNationList); // 휴가 요청 페이지에서 나라별 공휴일 가져오기 위한 것.

/*-----------------------------------
  Approval Management
-----------------------------------*/
router.get('/pending-leave-request', approvalMngmtCtrl.getLeaveRequest); // M 휴가 요청한 리스트 확인
router.put('/approve-leave-request', approvalMngmtCtrl.approvedLeaveRequest); // M 휴가 승인
router.put('/delete-request', approvalMngmtCtrl.deleteLeaveRequest); /// M 휴가 거절 DB 삭제
router.put('/cancel-Employee-Approve-Leave', approvalMngmtCtrl.cancelEmployeeApproveLeave); // M 직원의 approve 된 휴가 취소
router.get('/getConfirmRdRequest', approvalMngmtCtrl.getConfirmRdRequest); // Manager gets a list of RD confirm requests.
router.put('/rejectReplacementRequest', approvalMngmtCtrl.rejectReplacementRequest);	// 사원이 RD 신청한거 거절
router.put('/approveReplacementRequest', approvalMngmtCtrl.approveReplacementRequest);	// 사원이 RD 신청한거 수락



//company
router.post('/addingCompany', companyCtrl.addingCompany);
router.get('/getPendingCompanyRequest', companyCtrl.getPendingCompanyRequest);
router.delete('/deleteCompanyRequest/:request_id', companyCtrl.deleteCompanyRequest);

// pending leave check
router.get('/checkPendingLeave', leaveMngmtCtrl.checkPendingLeave);

module.exports = router;
