const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs"); // s3로 업로드 하기위해 동기처리
const fsPromises = require("fs").promises;
const { unlink } = require("fs/promises");

const { MongoWallet } = require("../../../../utils/mongo-wallet");
const { Wallet, Gateway } = require("fabric-network");
const { buildCAClient, enrollAdminMongo, buildCCP } = require("../../../../utils/ca-utils");
const FabricCAServices = require("fabric-ca-client");
const { default: mongoose } = require("mongoose");
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../../../utils/s3Utils");
const { X509, KJUR, KEYUTIL } = require("jsrsasign");
const mongoose = require("mongoose");

exports.uploadDocument = async (req, res) => {
	console.log(`
    --------------------------------------------------
    User: ${req.decoded._id}  
    router.post('/documents', documentsController.uploadDocument);
    --------------------------------------------------`);
	const dbModels = global.DB_MODELS;
	const { title, receiverA, receiverB } = req.body;
	const file = req.file;
	console.log(file);
	console.log(req.body);
	const session = await dbModels.AdUploadDocument.startSession();

	try {
		if (!file) {
			return res.status(404).json({
				message: "PDF was not uploaded!",
			});
		}

		const foundCompany = await dbModels.Company.findById(foundUser.company_id).lean();

		// 트랜잭션 시작
		await session.startTransaction();

		// 블록체인에 문서저장
		const s3Key = `important-document${file.filename}`;

		const uploadParams = {
			Bucket: process.env.AWS_S3_BUCKET,
			Key: s3Key,
			Body: fs.createReadStream(file.path),
			// ACL: 'public-read',
			ContentType: req.file.mimetype,
		};

		console.log(uploadParams);

		if (process.env.NODE_ENV.trim() === "development") {
			uploadParams.ACL = "public-read";
		}

		await s3Client.send(new PutObjectCommand(uploadParams));

		const fileLoaded = await fsPromises.readFile(file.path);
		const hashSum = crypto.createHash("sha256");
		hashSum.update(fileLoaded);
		const hex = hashSum.digest("hex");

		// 로컬에 저장된 리사이즈 파일 제거
		await unlink(file.path);

		const s3Location = `${process.env.AWS_LOCATION}${s3Key}`;

		const newAdUploadDocument = new dbModels.AdUploadDocument({
			title: title,
			company_id: new mongoose.Types.ObjectId(foundCompany._id),
			writer: new mongoose.Types.ObjectId(req.decoded._id),
			pdfHash: hex,
			content: req.body.content,
			originalname: file.originalname,
			key: s3Key,
			location: s3Location,
		});

		// 새로운 주문 저장
		await newAdUploadDocument.save({ session });

		const foundUser = await dbModels.Admin.findOne({
			_id: new mongoose.Types.ObjectId(req.decoded._id),
		});
		/**
		 * blockchain 코드 시작 -------------------------------------------
		 */
		const store = new MongoWallet();
		const wallet = new Wallet(store);
		const userIdentity = await wallet.get(req.decoded._id.toString());

		let selectedCompany = "";
		let mspId = "";
		let channelId = "";
		switch (foundCompany.company_name) {
			case "nsmartsolution":
				selectedCompany = "nsmarts";
				mspId = "NsmartsMSP";
				channelId = "nsmartschannel";
				break;
			case "vice":
				selectedCompany = "vice";
				mspId = "ViceMSP";
				channelId = "vicechannel";
				break;
			default:
				selectedCompany = "vice-kr";
				mspId = "ViceKRMSP";
				channelId = "vice-krchannel";
				break;
		}

		const ccp = buildCCP(selectedCompany);
		const gateway = new Gateway();

		await gateway.connect(ccp, {
			wallet,
			identity: userIdentity,
			discovery: { enabled: false, asLocalhost: false },
		});

		// 네트워크 채널 가져오기
		const network = await gateway.getNetwork("contractchannel");

		// 스마트 컨트랙트 가져오기
		const contract = network.getContract("contract");

		try {
			const result = await contract.submitTransaction(
				"CreateContractInfo", // 스마트 컨트랙트의 함수 이름
				newAdUploadDocument._id,
				newAdUploadDocument.title,
				newAdUploadDocument.content,
				newAdUploadDocument.writer,
				newAdUploadDocument.company_id,
				newAdUploadDocument.pdfHash,
				newAdUploadDocument.originalname,
				newAdUploadDocument.key,
				newAdUploadDocument.location,
				newAdUploadDocument.createdAt.toISOString(),
				newAdUploadDocument.updatedAt.toISOString()
			);
		} catch (bcError) {
			console.error("Blockchain transaction failed:", bcError);
			throw bcError;
		}

		await gateway.disconnect();

		// 트랜잭션 커밋
		await session.commitTransaction();
		session.endSession();

		/**
		 * blockchain 코드 끝 -------------------------------------------
		 */
		return res.status(200).json({
			message: "계약서 생성 성공",
		});
	} catch (err) {
		console.log(err);
		// console.log(err?.responses[0]?.responses);

		// 트랜잭션 롤백
		await session.abortTransaction();
		session.endSession();
		return res.status(500).json({ error: true, message: "Server Error" });
	}
};

// exports.getPdf = async (req, res) => {
//   console.log(`
//     --------------------------------------------------
//       router.get('/contracts/pdf/:id', contractsController.getPdf);
//     --------------------------------------------------`);

//   const dbModels = global.DB_MODELS;
//   const { _id, email, org } = req.decoded;
//   const { id } = req.params;
//   console.log(id);

//   try {
//     const user = await dbModels.User.findOne({ _id, email, org }).lean();
//     if (!user) {
//       return res.status(401).json({ error: true, message: "등록되지 않은 사용자 입니다." });
//     }

//     const foundContract = await dbModels.Contract
//       .findById(id)
//       .lean();

//     console.log(foundContract)
//     if (!foundContract) {
//       return res.status(404).json({ error: true, message: "계약을 찾을 수 없습니다." });
//     }

//     const command = new GetObjectCommand({
//       Bucket: process.env.AWS_S3_BUCKET,
//       Key: foundContract.key, // 업로드된 파일 경로
//     });

//     const response = await s3Client.send(command);
//     res.attachment(foundContract.key);
//     response.Body.pipe(res);

//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ error: true, message: "Server Error" });
//   }
// };

// exports.getContractById = async (req, res) => {
//   console.log(`
//     --------------------------------------------------
//       router.get('/contracts/:id', contractsController.getContractById);
//     --------------------------------------------------`);

//   const dbModels = global.DB_MODELS;
//   const { _id, email, org } = req.decoded;
//   const { id } = req.params;
//   console.log(id);
//   const session = await dbModels.Contract.startSession();

//   try {
//     const user = await dbModels.User.findOne({ _id, email, org }).lean();
//     if (!user) {
//       return res.status(401).json({ error: true, message: "등록되지 않은 사용자 입니다." });
//     }
//     // 트랜잭션 시작
//     await session.startTransaction();
//     const foundContract = await dbModels.Contract
//       .findById(id, { location: 0 })
//       .populate({
//         path: 'writer',
//         select: 'email' // 이메일 필드만 선택
//       })
//       .populate({
//         path: 'receiverA',
//         select: 'email'  // Select only the email field, exclude _id
//       })
//       .populate({
//         path: 'receiverB',
//         select: 'email'  // Select only the email field, exclude _id
//       })
//       .lean();

//     console.log(foundContract)
//     if (!foundContract) {
//       return res.status(404).json({ error: true, message: "계약을 찾을 수 없습니다." });
//     }

//     /**
//     * blockchain 코드 시작 -------------------------------------------
//     */
//     const store = new MongoWallet();
//     const wallet = new Wallet(store);
//     const userIdentity = await wallet.get(user._id.toString());

//     let selectedCompany;
//     switch (org) {
//       case 'NaverMSP':
//         selectedCompany = 'naver';
//         break;
//       case 'RestaurantMSP':
//         selectedCompany = 'restaurant';
//         break;
//       default:
//         break;
//     }

//     const ccp = buildCCP(selectedCompany);
//     const gateway = new Gateway();

//     await gateway.connect(ccp, { wallet, identity: userIdentity, discovery: { enabled: true, asLocalhost: true } });

//     // 네트워크 채널 가져오기
//     const network = await gateway.getNetwork('contractchannel');

//     // 스마트 컨트랙트 가져오기
//     const contract = network.getContract('contract');

//     try {
//       const result = await contract.submitTransaction(
//         'ReadContractById', // 스마트 컨트랙트의 함수 이름
//         id
//       );
//     } catch (bcError) {
//       console.error('Blockchain transaction failed:', bcError);
//       throw bcError;
//     }

//     await gateway.disconnect();

//     // 트랜잭션 커밋
//     await session.commitTransaction();
//     session.endSession();

//     /**
//     * blockchain 코드 끝 -------------------------------------------
//     */

//     res.status(200).json({ contract: foundContract });

//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ error: true, message: "Server Error" });
//   }
// };

// exports.getContracts = async (req, res) => {
//   console.log(`
//     --------------------------------------------------
//     router.get("/contracts", contractsController.getContracts);
//     --------------------------------------------------`);
//   const dbModels = global.DB_MODELS;
//   const { _id, email, org } = req.decoded;
//   const {
//     active = 'createdAt',
//     direction = 'asc',
//     pageIndex = '0',
//     pageSize = '10'
//   } = req.query;

//   const limit = parseInt(pageSize, 10);
//   const skip = parseInt(pageIndex, 10) * limit;
//   const sortCriteria = {
//     [active]: direction === 'desc' ? -1 : 1,
//   };

//   try {
//     const user = await dbModels.User.findOne({ _id: _id, email: email, org: org }).lean();
//     //만약 등록되지 않은 전화번호라면 401 에러
//     if (!user) return res.status(401).json({ error: true, message: "등록되지 않은 사용자 입니다." });

//     const foundContracts = await dbModels.Contract.find({}, { location: 0 })
//       .populate({
//         path: 'writer',
//         select: 'email -_id' // 이메일 필드만 선택
//       })
//       .populate({
//         path: 'receiverA',
//         select: 'email -_id'  // Select only the email field, exclude _id
//       })
//       .populate({
//         path: 'receiverB',
//         select: 'email -_id'  // Select only the email field, exclude _id
//       })
//       .sort(sortCriteria)
//       .skip(skip)
//       .limit(limit)
//       .lean()

//     if (!foundContracts) {
//       return res.status(404).json({
//         message: "주문 찾기 실패",
//       });
//     }

//     /**
//       * blockchain 코드 시작-------------------------------------------
//       */
//     const store = new MongoWallet();
//     const wallet = new Wallet(store);
//     const userIdentity = await wallet.get(user._id.toString());

//     let selectedCompany;
//     switch (user.org) {
//       case 'NaverMSP':
//         selectedCompany = 'naver';
//         break;
//       case 'RestaurantMSP':
//         selectedCompany = 'restaurant';
//         break;
//       default:
//         break;
//     }

//     const ccp = buildCCP(selectedCompany);
//     const gateway = new Gateway();

//     await gateway.connect(ccp, { wallet, identity: userIdentity, discovery: { enabled: true, asLocalhost: true } });

//     // 네트워크 채널 가져오기
//     const network = await gateway.getNetwork('contractchannel');

//     // 스마트 컨트랙트 가져오기
//     const contract = network.getContract('contract');

//     // 블록체인에서 데이터를 쿼리할땐 크게 2가지 방식있다.
//     // evaluateTransaction
//     // submitTransaction
//     // evaluateTransaction 는 데이터를 빠르게 couchDB에서
//     // 가져오지만, 다른 피어들과 데이터를 비교하지 않는다.
//     // 그래서 오염이 있어도 걸러내지 못한다.
//     // submitTransaction로 하면 느리게 데이터를 불러오지만
//     // 다른 노드들과 데이터를 비교를 통해 오염 유무를 알 수 있다.
//     // 선택에 따라 어떻게 할지 정하면 됨.

//     // await contract.evaluateTransaction(
//     //   'GetAllOrders', // 스마트 컨트랙트의 함수 이름
//     // );

//     try {
//       const resultBuffer = await contract.submitTransaction(
//         'GetAllContractInfos', // 스마트 컨트랙트의 함수 이름
//       );
//       const resultString = resultBuffer.toString('utf8');
//       const resultJson = JSON.parse(resultString);
//       console.log(resultJson)
//     } catch (bcError) {
//       console.error('Blockchain transaction failed:', bcError);
//       return res.status(500).json({
//         error: true,
//         message: 'Blockchain transaction failed',
//         details: bcError.message,
//       });
//     }
//     await gateway.disconnect();

//     /**
//       * blockchain 코드 끝-------------------------------------------
//       */

//     return res.status(200).json({
//       data: foundContracts,
//       message: "주문 찾기 성공",
//     });
//   } catch (err) {
//     console.log(err)
//     return res.status(500).json({ error: true, message: "Server Error" });
//   }
// };

// exports.signContracts = async (req, res) => {
//   console.log(`
//     --------------------------------------------------
//     router.patch("/contract/sign/:id", contractsController.signContracts);
//     --------------------------------------------------`);
//   const dbModels = global.DB_MODELS;
//   const { _id, email, org } = req.decoded;
//   const { id } = req.params
//   const { receiver, ...body } = req.body;
//   console.log(body)
//   console.log(id)

//   const session = await dbModels.Contract.startSession();

//   try {
//     const user = await dbModels.User.findOne({ _id: _id, email: email, org: org }).lean();
//     //만약 등록되지 않은 전화번호라면 401 에러
//     if (!user) return res.status(401).json({ error: true, message: "등록되지 않은 사용자 입니다." });

//     if (!(receiver === 'a' || receiver === 'b')) {
//       return res.status(401).json({ error: true, message: "잘못된 등록 양식 입니다." });
//     }
//     await session.startTransaction();

//     const receiverField = receiver === 'a' ? 'receiverA' : 'receiverB';
//     const statusField = receiver === 'a' ? 'statusA' : 'statusB';

//     const foundContract = await dbModels.Contract.findOne({ _id: id, [receiverField]: _id }).lean();

//     if (!foundContract) return res.status(401).json({ error: true, message: "등록되지 않은 사용자 입니다." });

//     body[statusField] = 'signed';

//     const store = new MongoWallet();
//     const wallet = new Wallet(store);
//     const userIdentity = await wallet.get(_id.toString());

//     if (!userIdentity) {
//       console.log(`An identity for the user ${req.decoded._id} does not exist in the wallet`);
//       return res.status(500).send({ message: `An identity for the user does not exist in the wallet` });
//     }

//     const userPrivateKey = userIdentity.credentials.privateKey;
//     console.log(userPrivateKey)
//     const sig = new KJUR.crypto.Signature({ "alg": "SHA256withECDSA" });
//     sig.init(userPrivateKey, "");
//     sig.updateHex(foundContract.pdfHash);
//     const sigValueHex = sig.sign();
//     const sigValueBase64 = Buffer.from(sigValueHex, 'hex').toString('base64');
//     console.log("Signature: " + sigValueBase64);

//     body[receiver === 'a' ? 'signA' : 'signB'] = sigValueBase64;

//     const updatedContract = await dbModels.Contract.findByIdAndUpdate(id, body, { new: true })
//     console.log(receiver)
//     console.log(updatedContract)

//     if (!updatedContract) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({
//         message: "계약서 서명 실패",
//       });
//     }

//     /**
//   * blockchain 코드 시작-------------------------------------------
//   */

//     let selectedCompany;
//     switch (user.org) {
//       case 'NaverMSP':
//         selectedCompany = 'naver';
//         break;
//       case 'RestaurantMSP':
//         selectedCompany = 'restaurant';
//         break;
//       default:
//         break;
//     }

//     const ccp = buildCCP(selectedCompany);
//     const gateway = new Gateway();

//     await gateway.connect(ccp, { wallet, identity: userIdentity, discovery: { enabled: true, asLocalhost: true } });

//     // // 네트워크 채널 가져오기
//     const network = await gateway.getNetwork('contractchannel');

//     // // 스마트 컨트랙트 가져오기
//     const contract = network.getContract('contract');

//     try {
//       const resultBuffer = await contract.submitTransaction(
//         'SignContractInfo', // 스마트 컨트랙트의 함수 이름
//         updatedContract._id,
//         receiver,
//         updatedContract[statusField],
//         updatedContract[receiver === 'a' ? 'signA' : 'signB'],
//         updatedContract[receiver === 'a' ? 'signPointerA' : 'signPointerB'],
//         updatedContract.createdAt.toISOString(),
//         updatedContract.updatedAt.toISOString(),
//       );
//       const resultString = resultBuffer.toString('utf8');
//       const resultJson = JSON.parse(resultString);
//       console.log(resultJson)
//     } catch (bcError) {
//       console.error('Blockchain transaction failed:', bcError);
//       return res.status(500).json({
//         error: true,
//         message: 'Blockchain transaction failed',
//         details: bcError.message,
//       });
//     }
//     await gateway.disconnect();

//     /**
//       * blockchain 코드 끝-------------------------------------------
//       */

//     // 트랜잭션 커밋
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({
//       message: "주문 수정 성공",
//     });
//   } catch (err) {
//     console.log(err);
//     // 트랜잭션 롤백
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(500).json({ error: true, message: "Server Error" });
//   }
// };
// exports.verifyContracts = async (req, res) => {
//   console.log(`
//     --------------------------------------------------
//     router.patch("/contract/verify/:id", contractsController.verifyContracts);
//     --------------------------------------------------`);

//   const dbModels = global.DB_MODELS;
//   const { _id, email, org } = req.decoded; // JWT 토큰에서 사용자 정보 추출
//   const { id } = req.params; // 요청 경로에서 계약 ID 추출
//   const { receiver } = req.body; // 요청 본문에서 수신자 정보 추출
//   const file = req.file; // 업로드된 파일

//   // 파일이 업로드되지 않은 경우 400 에러 반환
//   if (!file) {
//     return res.status(400).json({ message: 'No file uploaded!' });
//   }
//   console.log(id);

//   const session = await dbModels.Contract.startSession(); // MongoDB 세션 시작

//   try {
//     // 사용자가 존재하는지 확인
//     const user = await dbModels.User.findOne({ _id, email, org }).lean();
//     if (!user) {
//       return res.status(401).json({ error: true, message: "등록되지 않은 사용자 입니다." });
//     }

//     // 수신자 필드 결정 ('receiverA' 또는 'receiverB')
//     const receiverField = receiver === 'a' ? 'receiverA' : 'receiverB';
//     await session.startTransaction();

//     // 계약이 존재하는지 확인 및 수신자가 맞는지 확인
//     const foundContract = await dbModels.Contract.findOne({ _id: id, [receiverField]: _id }).lean();
//     console.log(receiverField)
//     console.log(_id)
//     console.log(foundContract)

//     if (!foundContract) {
//       await unlink(file.path); // 파일 삭제
//       return res.status(404).json({ message: 'Contract was not found!' });
//     }

//     // 업로드된 파일의 해시 생성
//     const fileData = await fsPromises.readFile(file.path);
//     const fileHash = crypto.createHash('sha256').update(fileData).digest('hex');
//     console.log('File Hash:', fileHash);

//     // 파일 해시가 계약서의 해시와 일치하는지 확인
//     if (foundContract.pdfHash !== fileHash) {
//       await unlink(file.path); // 파일 삭제
//       return res.status(400).json({ message: 'Invalid Document: The uploaded file does not match the expected contract.' });
//     }

//     // 몽고디비에 저장된 지갑에서 인증서 불러오기
//     const store = new MongoWallet();
//     const wallet = new Wallet(store);
//     const userIdentity = await wallet.get(_id.toString());
//     if (!userIdentity) {
//       console.log(`An identity for the user ${req.decoded._id} does not exist in the wallet`);
//       return res.status(500).send({ message: `An identity for the user does not exist in the wallet` });
//     }

//     let selectedCompany;
//     switch (user.org) {
//       case 'NaverMSP':
//         selectedCompany = 'naver';
//         break;
//       case 'RestaurantMSP':
//         selectedCompany = 'restaurant';
//         break;
//       default:
//         break;
//     }

//     const ccp = buildCCP(selectedCompany);
//     const gateway = new Gateway();

//     await gateway.connect(ccp, { wallet, identity: userIdentity, discovery: { enabled: true, asLocalhost: true } });

//     // Get the network channel that the smart contract is deployed to.
//     const network = await gateway.getNetwork('contractchannel');
//     const contract = network.getContract('contract');
//     const resultBuffer = await contract.submitTransaction(
//       'ReadContractById',
//       id
//     );

//     const jsonResult = JSON.parse(resultBuffer);

//     // 수신자의 서명 상태 필드 결정 ('statusA' 또는 'statusB')
//     const statusField = receiver === 'a' ? 'statusA' : 'statusB';
//     if (foundContract[statusField] !== "signed") {
//       await unlink(file.path); // 파일 삭제
//       return res.status(200).json({ message: 'Validation Complete: Contract unsigned and pending. Please sign to finalize.' });
//     }

//     // 사용자 공개 키 및 인증서 정보 읽기
//     const userPublicKey = userIdentity.credentials.certificate;
//     const certObj = new X509();
//     certObj.readCertPEM(userPublicKey);
//     console.log("Subject: " + certObj.getSubjectString());
//     console.log("Issuer (CA) Subject: " + certObj.getIssuerString());
//     console.log("Valid period: " + certObj.getNotBefore() + " to " + certObj.getNotAfter());

//     // 조직에 따라 CA 인증서 경로 결정
//     const caCertPath = getCaCertPath(org);
//     const caCert = await fsPromises.readFile(caCertPath, 'utf-8');
//     console.log("CA Signature validation: " + certObj.verifySignature(KEYUTIL.getKey(caCert)));

//     // 서명 검증
//     const publicKey = KEYUTIL.getKey(userPublicKey);
//     const signature = new KJUR.crypto.Signature({ "alg": "SHA256withECDSA" });
//     signature.init(publicKey);
//     signature.updateHex(fileHash);
//     const getBackSigValueHex = Buffer.from(jsonResult[0]?.[receiver === 'a' ? 'signA' : 'signB'], 'base64').toString('hex');

//     const verifyResult = signature.verify(getBackSigValueHex)

//     // 블록체인 미사용시 사용코드
//     // const verifyResult = signature.verify(foundContract[statusField]);

//     if (!verifyResult) {
//       await unlink(file.path); // 파일 삭제
//       return res.status(400).json({ message: 'Verification Failed: The document you have uploaded does not match the expected contract or certificate.' });
//     }

//     console.log("Signature verified with certificate provided: " + verifyResult);

//     await unlink(file.path); // 파일 삭제
//     res.status(200).json({ message: 'Contract Verification Successful' });

//     // 트랜잭션 커밋
//     await session.commitTransaction();
//     session.endSession();
//   } catch (err) {
//     console.log(err);
//     await unlink(file.path); // 파일 삭제
//     await session.abortTransaction(); // 트랜잭션 롤백
//     session.endSession();
//     return res.status(500).json({ error: true, message: "Server Error" });
//   }
// };

// // 조직에 따른 CA 인증서 경로 반환 함수
// const getCaCertPath = (org) => {
//   switch (org) {
//     case 'NaverMSP':
//       return process.env.NAVER_CA_CERT_PATH;
//     case 'RestaurantMSP':
//       return process.env.RESTAURANT_CA_CERT_PATH;
//     default:
//       throw new Error('Invalid organization');
//   }
// };

// exports.updateOrder = async (req, res) => {
//   console.log(`
//     --------------------------------------------------
//     router.patch("/orders/:id", ordersController.updateOrder);
//     --------------------------------------------------`);
//   const dbModels = global.DB_MODELS;
//   const { _id, email, org } = req.decoded;
//   const { id } = req.params
//   console.log(id)

//   const session = await dbModels.Order.startSession();

//   try {
//     const user = await dbModels.User.findOne({ _id: _id, email: email, org: org }).lean();
//     //만약 등록되지 않은 전화번호라면 401 에러
//     if (!user) return res.status(401).json({ error: true, message: "등록되지 않은 사용자 입니다." });

//     // 트랜잭션 시작
//     await session.startTransaction();
//     const updatedContract = await dbModels.Contract.findByIdAndUpdate(id, { ...req.body }, { new: true })

//     if (!updatedContract) {
//       return res.status(404).json({
//         message: "주문 수정 실패",
//       });
//     }

//     /**
//   * blockchain 코드 시작-------------------------------------------
//   */
//     const store = new MongoWallet();
//     const wallet = new Wallet(store);
//     const userIdentity = await wallet.get(user._id.toString());

//     let selectedCompany;
//     switch (user.org) {
//       case 'NaverMSP':
//         selectedCompany = 'naver';
//         break;
//       case 'RestaurantMSP':
//         selectedCompany = 'restaurant';
//         break;
//       default:
//         break;
//     }

//     const ccp = buildCCP(selectedCompany);
//     const gateway = new Gateway();

//     await gateway.connect(ccp, { wallet, identity: userIdentity, discovery: { enabled: true, asLocalhost: true } });

//     // 네트워크 채널 가져오기
//     const network = await gateway.getNetwork('contractchannel');

//     // 스마트 컨트랙트 가져오기
//     const contract = network.getContract('contract');

//     try {
//       const resultBuffer = await contract.submitTransaction(
//         'UpdateContractInfo', // 스마트 컨트랙트의 함수 이름
//         updatedContract._id,
//         updatedContract.title,
//         updatedContract.writer,
//         updatedContract.pdfHash,
//         updatedContract.originalname,
//         updatedContract.key,
//         updatedContract.location,
//         updatedContract.receiverA,
//         updatedContract.receiverB,
//         updatedContract.createdAt.toISOString(),
//         updatedContract.updatedAt.toISOString(),
//       );
//       const resultString = resultBuffer.toString('utf8');
//       const resultJson = JSON.parse(resultString);
//       console.log(resultJson)
//     } catch (bcError) {
//       console.error('Blockchain transaction failed:', bcError);
//       return res.status(500).json({
//         error: true,
//         message: 'Blockchain transaction failed',
//         details: bcError.message,
//       });
//     }
//     await gateway.disconnect();

//     /**
//       * blockchain 코드 끝-------------------------------------------
//       */

//     // 트랜잭션 커밋
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({
//       message: "주문 수정 성공",
//     });
//   } catch (err) {
//     console.log(err);
//     // 트랜잭션 롤백
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(500).json({ error: true, message: "Server Error" });
//   }
// };

// exports.deleteContract = async (req, res) => {
//   console.log(`
//     --------------------------------------------------
//     router.delete("/contract/:id", ordersController.deleteContract);
//     --------------------------------------------------`);
//   const dbModels = global.DB_MODELS;
//   const { _id, email, org } = req.decoded;
//   const { id } = req.params
//   console.log(id)
//   const session = await dbModels.Order.startSession();

//   try {
//     const user = await dbModels.User.findOne({ _id: _id, email: email, org: org }).lean();
//     //만약 등록되지 않은 전화번호라면 401 에러
//     if (!user) return res.status(401).json({ error: true, message: "등록되지 않은 사용자 입니다." });
//     // 트랜잭션 시작
//     await session.startTransaction();
//     const deletedContract = await dbModels.Contract.findByIdAndDelete(id)

//     if (!deletedContract) {
//       return res.status(404).json({
//         message: "주문 삭제 실패",
//       });
//     }

//     /**
// * blockchain 코드 시작-------------------------------------------
// */
//     const store = new MongoWallet();
//     const wallet = new Wallet(store);
//     const userIdentity = await wallet.get(user._id.toString());

//     let selectedCompany;
//     switch (user.org) {
//       case 'NaverMSP':
//         selectedCompany = 'naver';
//         break;
//       case 'RestaurantMSP':
//         selectedCompany = 'restaurant';
//         break;
//       default:
//         break;
//     }

//     const ccp = buildCCP(selectedCompany);
//     const gateway = new Gateway();

//     await gateway.connect(ccp, { wallet, identity: userIdentity, discovery: { enabled: true, asLocalhost: true } });

//     // 네트워크 채널 가져오기
//     const network = await gateway.getNetwork('contractchannel');

//     // 스마트 컨트랙트 가져오기
//     const contract = network.getContract('contract');

//     try {
//       const resultBuffer = await contract.submitTransaction(
//         'DeleteContractInfo', // 스마트 컨트랙트의 함수 이름
//         id,
//       );
//       const resultString = resultBuffer.toString('utf8');
//       const resultJson = JSON.parse(resultString);
//       console.log(resultJson)
//     } catch (bcError) {
//       console.error('Blockchain transaction failed:', bcError);
//       return res.status(500).json({
//         error: true,
//         message: 'Blockchain transaction failed',
//         details: bcError.message,
//       });
//     }
//     await gateway.disconnect();

//     /**
//       * blockchain 코드 끝-------------------------------------------
//       */

//     const command = new DeleteObjectCommand({
//       Bucket: process.env.AWS_S3_BUCKET,
//       Key: contract.key, // 업로드된 파일 경로
//     });

//     const response = await s3Client.send(command);

//     // 트랜잭션 커밋
//     await session.commitTransaction();
//     session.endSession();
//     return res.status(200).json({
//       message: "주문 삭제 성공",
//     });
//   } catch (err) {
//     console.log(err);
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(500).json({ error: true, message: "Server Error" });
//   }

// };
