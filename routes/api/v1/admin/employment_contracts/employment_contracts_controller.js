const mongoose = require("mongoose");
const { buildCCP, buildCAClient } = require("../../../../../utils/ca-utils");
const { MongoWallet } = require("../../../../../utils/mongo-wallet");
const { Wallet } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");
const mongoose = require("mongoose");

// 고용 계약 목록
exports.getEmploymentContract = async (req, res) => {
	console.log(`
--------------------------------------------------
    User : ${req.decoded._id}
    API  : get Employment Contract
    router.get('/employment_contracts/getEmploymentContract', employmentContractsCtrl.getEmploymentContract);
--------------------------------------------------`);
	const dbModels = global.DB_MODELS;

	try {
		const {
			nameFormControl,
			emailFormControl,
			active = "createdAt",
			direction = "asc",
			pageIndex = "0",
			pageSize = "10",
		} = req.query;

		const limit = parseInt(pageSize, 10);
		const skip = parseInt(pageIndex, 10) * limit;
		const sortCriteria = {
			[active]: direction === "desc" ? -1 : 1,
		};

		const criteria = {
			_id: req.decoded._id,
		};

		const projection = "_id company_id";

		const adminInfo = await dbModels.Admin.findById(criteria, projection).lean();

		const query = {
			// 대소문자 상관없는 정규표현식으로 바꾸는 코드
			name: new RegExp(nameFormControl, "i"),
			email: new RegExp(emailFormControl, "i"),
		};

		const pendingRequestData = await dbModels.PendingCompanyRequest.aggregate([
			{
				$match: {
					company_id: adminInfo.company_id,
					status: "pending",
				},
			},
			{
				$lookup: {
					from: "members",
					let: {
						memberId: "$member_id",
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ["$_id", "$$memberId"],
								},
							},
						},
						{
							$project: {
								name: 1,
								email: 1,
							},
						},
					],
					as: "memberInfo",
				},
			},
			{
				$unwind: {
					path: "$memberInfo",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$match: {
					"memberInfo.name": query.name,
					"memberInfo.email": query.email,
				},
			},
			{
				$project: {
					email: "$memberInfo.email",
					name: "$memberInfo.name",
					status: 1,
					createdAt: 1,
				},
			},
			{
				$facet: {
					paginatedResults: [{ $sort: sortCriteria }, { $skip: skip }, { $limit: limit }],
					totalCount: [{ $count: "count" }],
				},
			},
		]);

		const results = pendingRequestData[0].paginatedResults;
		const totalCount = pendingRequestData[0].totalCount[0] ? pendingRequestData[0].totalCount[0].count : 0;

		return res.status(200).send({
			message: "loaded",
			data: results,
			totalCount,
		});
	} catch (err) {
		console.log(err);
		return res.status(500).send({
			message: "DB Error",
		});
	}
};

// 고용 계약 수락
exports.acceptEmploymentContract = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Accept Employment Contract
  router.put('/employment_contracts/acceptEmploymentContract', employmentContractsCtrl.acceptEmploymentContract);
  query: ${JSON.stringify(req.body)} _id name startDate endDate
--------------------------------------------------`);
	const dbModels = global.DB_MODELS;

	try {
		const matchCriteria = {
			_id: new mongoose.Types.ObjectId(req.body._id),
		};

		const updateData = {
			status: "approve",
		};

		// 1. 수락 업데이트
		const updatedRequest = await dbModels.PendingCompanyRequest.findByIdAndUpdate(matchCriteria, updateData);

		if (!updatedRequest) {
			return res.status(404).send({
				message: "1",
			});
		}

		// 2. 히스토리 추가
		const historyData = {
			member_id: updatedRequest.member_id,
			company_id: updatedRequest.company_id,
			status: updatedRequest.status,
			approver_id: req.decoded._id,
		};

		const requestHistory = dbModels.PendingCompanyRequestHistory(historyData);
		await requestHistory.save();

		const memberCompanyId = await dbModels.Member.findOneAndUpdate(
			{
				_id: updatedRequest.member_id,
			},
			{
				company_id: new mongoose.Types.ObjectId(updatedRequest.company_id),
				emp_start_date: req.body.startDate,
				emp_end_date: req.body.endDate,
			},
			{ new: true }
		);

		const companyLeaveStandard = await dbModels.Company.findOne({
			_id: updatedRequest.company_id,
		}).lean();

		const createLeaveStandard = dbModels.PersonalLeaveStandard({
			member_id: updatedRequest.member_id,
			leave_standard: companyLeaveStandard.leave_standard,
		});

		await createLeaveStandard.save();

		// 3. 나머지 Company Request 데이터 로드 >> Company Request Storage 업데이트
		const pendingRequestData = await dbModels.PendingCompanyRequest.aggregate([
			{
				$match: {
					company_id: requestHistory.company_id,
					status: "pending",
				},
			},
			{
				$lookup: {
					from: "members",
					let: {
						memberId: "$member_id",
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ["$_id", "$$memberId"],
								},
							},
						},
						{
							$project: {
								name: 1,
								email: 1,
							},
						},
					],
					as: "memberInfo",
				},
			},
			{
				$unwind: {
					path: "$memberInfo",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$project: {
					email: "$memberInfo.email",
					name: "$memberInfo.name",
					status: 1,
					createdAt: 1,
				},
			},
		]);

		const foundCompany = await dbModels.Company.findById(updatedRequest.company_id).lean();

		let selectedCompany = "";
		let mspId = "";
		switch (foundCompany.company_name) {
			case "nsmartsolution":
				selectedCompany = "nsmarts";
				mspId = "NsmartsMSP";
				break;
			case "vice":
				selectedCompany = "vice";
				mspId = "ViceMSP";

				break;
			default:
				selectedCompany = "vice-kr";
				mspId = "ViceKRMSP";
				break;
		}

		let foundAdmin = {};
		try {
			foundAdmin = await findAdminIfNotAdmin(mspId, global.DB_MODELS);
		} catch (error) {
			return res.status(409).json({ message: "어드민이 없습니다." });
		}

		const ccp = buildCCP(selectedCompany);
		const caClient = buildCAClient(FabricCAServices, ccp, `ca-${selectedCompany}`);

		// mongodb wallet 생성
		const store = new MongoWallet();
		const wallet = new Wallet(store);

		const adminIdentity = await wallet.get(foundAdmin.user);
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, process.env.ADMIN_USER_ID);

		const secret = await caClient.register(
			{
				affiliation: "",
				enrollmentID: updatedRequest.member_id,
				role: "client",
			},
			adminUser
		);

		const enrollment = await caClient.enroll({
			enrollmentID: updatedRequest.member_id,
			enrollmentSecret: secret,
		});
		const x509Identity = {
			credentials: {
				certificate: enrollment.certificate,
				privateKey: enrollment.key.toBytes(),
			},
			mspId: mspId,
			type: "X.509",
		};

		const data = {
			role: "client",
			email: memberCompanyId.email,
			certificate: x509Identity,
			mspId: mspId,
			credentials: x509Identity.credentials,
			version: 1,
			type: "X.509",
		};
		const putData = await wallet.put(updatedRequest.member_id, data);

		return res.status(200).send({
			message: "approved",
			pendingRequestData,
		});
	} catch (err) {
		console.log(err);
		return res.status(500).send({
			message: "DB Error",
		});
	}
};

// 고용 계약 거절
exports.rejectEmploymentContract = async (req, res) => {
	console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Reject Employment Contract
  router.delete('/employment_contracts/rejectEmploymentContract', employmentContractsCtrl.rejectEmploymentContract);
  query: ${JSON.stringify(req.query)} pending company request _id
--------------------------------------------------`);
	const dbModels = global.DB_MODELS;

	try {
		const matchCriteria = {
			_id: req.query._id,
		};

		const updateData = {
			status: "reject",
		};

		// 1. 거절 업데이트
		const updatedRequest = await dbModels.PendingCompanyRequest.findOneAndUpdate(matchCriteria, updateData);

		if (!updatedRequest) {
			return res.status(404).send({
				message: "1",
			});
		}

		// 2. 데이터 확인 후 삭제
		const deletedRequest = await dbModels.PendingCompanyRequest.findOneAndDelete(matchCriteria);

		if (!deletedRequest) {
			return res.status(404).send({
				message: "2",
			});
		}

		// 3. 히스토리 추가
		const historyData = {
			member_id: deletedRequest.member_id,
			company_id: deletedRequest.company_id,
			status: deletedRequest.status,
			approver_id: req.decoded._id,
		};

		const requestHistory = dbModels.PendingCompanyRequestHistory(historyData);
		await requestHistory.save();

		// 4. 나머지 Company Request 데이터 로드 >> Company Request Storage 업데이트
		const pendingRequestData = await dbModels.PendingCompanyRequest.aggregate([
			{
				$match: {
					company_id: requestHistory.company_id,
					status: "pending",
				},
			},
			{
				$lookup: {
					from: "members",
					let: {
						memberId: "$member_id",
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ["$_id", "$$memberId"],
								},
							},
						},
						{
							$project: {
								name: 1,
								email: 1,
							},
						},
					],
					as: "memberInfo",
				},
			},
			{
				$unwind: {
					path: "$memberInfo",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$project: {
					email: "$memberInfo.email",
					name: "$memberInfo.name",
					status: 1,
					createdAt: 1,
				},
			},
		]);

		return res.status(200).send({
			message: "deleted",
			pendingRequestData,
		});
	} catch (err) {
		return res.status(500).send({
			message: "DB Error",
		});
	}
};

// Helper Functions
async function findAdminIfNotAdmin(mspId, dbModels) {
	const foundAdmin = await dbModels.Wallet.findOne({
		mspId,
		role: "admin",
	}).lean();
	if (!foundAdmin) {
		throw new Error(`No admin found for MSP ID: ${mspId}`);
	}
	return foundAdmin;
}
