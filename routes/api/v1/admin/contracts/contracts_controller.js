const crypto = require("crypto");
const fs = require("fs"); // s3로 업로드 하기위해 동기처리
const fsPromises = require("fs").promises;
const { unlink } = require("fs/promises");

const { MongoWallet } = require("../../../../utils/mongo-wallet");
const { Wallet, Gateway } = require("fabric-network");
const { buildCCP } = require("../../../../utils/ca-utils");
const { default: mongoose } = require("mongoose");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../../../utils/s3Utils");
const mongoose = require("mongoose");

// 계약서 목록 가져오기
exports.getContractList = async (req, res) => {
    console.log(`
--------------------------------------------------
User : ${req.decoded._id}
API  : contract list
router.get('/getContractList', adContractCtrl.getContractList)
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;

    try {
        const contractList = await dbModels.AdContract.find({
            $or: [
                {
                    "sender._id": new mongoose.Types.ObjectId(req.decoded._id),
                },
                {
                    "receiver._id": new mongoose.Types.ObjectId(req.decoded._id),
                },
            ],
        });

        return res.send({
            contractList,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

// 계약서 전송할 사람 찾기
exports.searchContractor = async (req, res) => {
    console.log(`
--------------------------------------------------
User : ${req.decoded._id}
API  : search contractor
router.get('/searchContractor', adContractCtrl.searchContractor)
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const data = req.query;

    try {
        /************************************************
         * 검색한 사람이 admin 인지 employee 인지 확인
         ************************************************/
        let searchAdContractor = await dbModels.Admin.findOne({
            email: data.email,
        });

        let searchEmployeeContractor = await dbModels.Member.findOne({
            email: data.email,
        });

        if (searchAdContractor != null) {
            /************************************************
             * 검색한 사람이 같은 채널인지 확인 (Admin Schema)
             ************************************************/
            const adminChannel = await dbModels.Admin.aggregate([
                {
                    $match: {
                        email: data.email,
                    },
                },
                {
                    $lookup: {
                        from: "companies",
                        localField: "company_id",
                        foreignField: "_id",
                        as: "companyChannelInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$companyChannelInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $unwind: {
                        path: "$companyChannelInfo.channel",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        companyChannelInfo: {
                            $eq: ["$companyChannelInfo.channel.channel_name", data.channel],
                        },
                    },
                },
            ]);

            if (adminChannel[0].companyChannelInfo == false || adminChannel == null || searchAdContractor._id == req.decoded._id) {
                searchAdContractor = null;
            }
        }

        if (searchEmployeeContractor != null) {
            /************************************************
             * 검색한 사람이 같은 채널인지 확인 (Member Schema)
             ************************************************/
            const memberChannel = await dbModels.Member.aggregate([
                {
                    $match: {
                        email: data.email,
                    },
                },
                {
                    $lookup: {
                        from: "companies",
                        localField: "company_id",
                        foreignField: "_id",
                        as: "companyChannelInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$companyChannelInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $unwind: {
                        path: "$companyChannelInfo.channel",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        companyChannelInfo: {
                            $eq: ["$companyChannelInfo.channel.channel_name", data.channel],
                        },
                    },
                },
            ]);

            if (memberChannel[0].companyChannelInfo == false || memberChannel == null) {
                searchEmployeeContractor = null;
            }
        }

        const searchContractor = searchAdContractor != null ? searchAdContractor : searchEmployeeContractor;

        return res.status(200).send({
            message: "searchContractor",
            searchContractor,
        });
    } catch {
        return res.status(500).send({
            message: "searchContractor Error",
        });
    }
};

// 직원 목록 가져오기
exports.getEmployeeList = async (req, res) => {
    console.log(`
--------------------------------------------------
User : ${req.decoded._id}
API  : employ list
router.get('/getEmployeeList', adContractCtrl.getEmployeeList)
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {
        const companyId = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id,
            },
            {
                company_id: 1,
                _id: false,
            }
        );

        const myEmployeeList = await dbModels.Member.aggregate([
            {
                $match: {
                    company_id: new mongoose.Types.ObjectId(companyId.company_id),
                    retired: false,
                },
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                },
            },
        ]);
        return res.send({
            myEmployeeList,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: "An error has occurred",
        });
    }
};

// 계약서 저장
exports.saveContract = async (req, res) => {
    console.log(`
    --------------------------------------------------
      router.post('/contracts', contractsController.createContract);
    --------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const { _id, email, org } = req.decoded;
    const { title, receiverA, receiverB } = req.body;
    const file = req.file;

    const session = await dbModels.AdContract.startSession();

    try {
        if (!file) {
            return res.status(404).json({
                message: "PDF was not uploaded!",
            });
        }

        // 트랜잭션 시작
        await session.startTransaction();

        const s3Key = `contracts${file.filename}`;

        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            Body: fs.createReadStream(file.path),
            // ACL: 'public-read',
            ContentType: req.file.mimetype,
        };

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

        const sender = await dbModels.Admin.findOne({ _id: req.decoded._id });
        if (!sender) {
            return res.status(400).json({ message: "Sender was not found" });
        }

        const adReceiver = await dbModels.Admin.findOne({ email: req.body.receiver });
        const memberReceiver = await dbModels.Member.findOne({ email: req.body.receiver });

        const receiver = adReceiver || memberReceiver;

        if (!receiver) {
            return res.status(400).json({ message: "Receiver was not found" });
        }

        const newContract = new dbModels.AdContract({
            company_id: req.body.company_id,
            title: title,
            description: req.body.description,
            sender: new mongoose.Types.ObjectId(_id),
            receiver_company_id: receiver.company_id,
            receiver: new mongoose.Types.ObjectId(receiver._id),
            originalname: file.originalname,
            key: s3Key,
            location: s3Location,
            pdfHash: hex,
        });

        // 새로운 주문 저장
        await newContract.save({ session });

        const foundUser = await dbModels.Admin.findOne({
            _id: new mongoose.Types.ObjectId(req.decoded._id),
        });

        const foundCompany = await dbModels.Company.findById(foundUser.company_id).lean();
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
                newContract._id,
                newContract.company_id,
                newContract.title,
                newContract.description,
                newContract.sender,
                newContract.receiver_company_id,
                newContract.receiver,
                newContract.originalname,
                newContract.fileName,
                newContract.key,
                newContract.location,
                newContract.pdfHash,
                newContract.createdAt.toISOString(),
                newContract.updatedAt.toISOString()
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

        // 트랜잭션 롤백
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ error: true, message: "Server Error" });
    }
};

// pdf 상세 정보 불러오기
exports.getContractInfo = async (req, res) => {
    console.log(`
--------------------------------------------------
User : ${req.decoded._id}
API  : Get my ContractInfo
router.get('/getContractInfo', adContractCtrl.getContractInfo)
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const criteria = {
        _id: req.query._id,
    };

    try {
        const contractResult = await dbModels.AdContract.findOne(criteria);

        const foundCompany = await dbModels.Company.findById(req.query.company_id).lean();
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

        res.send({
            contractResult,
        });
    } catch (error) {
        console.log(error);
    }
};

// 계약서 공증 정보 불러오기
exports.getSignInfo = async (req, res) => {
    console.log(`
--------------------------------------------------
User : ${req.decoded._id}
API  : Get my ContractInfo
router.get('/getSignInfo', adContractCtrl.getSignInfo)
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    const criteria = {
        _id: req.query._id,
    };

    const projection = {
        _id: 1,
        sender: 1,
        receiver: 1,
        hash: 1,
        senderHash: 1,
        receiverHash: 1,
        senderSign: 1, // 계약서 서명 시간 때문에 가져옴
        receiverSign: 1, // 계약서 서명 시간 때문에 가져옴
        company_id: 1,
        receiver_company_id: 1,
    };

    try {
        const senderCompanyInfo = await dbModels.Company.findOne({ _id: req.query.company_id }, { orgMSPID: 1 });
        // sender caPath 위치
        let senderCaPath;
        switch (senderCompanyInfo.orgMSPID) {
            case "NsmartsMSP":
                senderCaPath = process.env.NSMARTS_CAPATH;
                break;
            case "ViceMSP":
                senderCaPath = process.env.VICE_CAPATH;
                break;
            case "ViceKRMSP":
                senderCaPath = process.env.VICEKR_CAPATH;
                break;
            default:
                break;
        }
        const senderContractRes = await dbModels.AdContract.findOne(criteria, projection);
        senderContractRes.senderCaPath = senderCaPath;
        senderContractRes.senderOrgMSPID = senderCompanyInfo.orgMSPID;

        // receiver caPath 위치
        const receiverCompanyInfo = await dbModels.Company.findOne({ _id: senderContractRes.receiver_company_id }, { orgMSPID: 1 });

        let receiverCaPath;
        switch (receiverCompanyInfo.orgMSPID) {
            case "NsmartsMSP":
                receiverCaPath = process.env.NSMARTS_CAPATH;
                break;
            case "ViceMSP":
                receiverCaPath = process.env.VICE_CAPATH;
                break;
            case "ViceKRMSP":
                receiverCaPath = process.env.VICEKR_CAPATH;
                break;
            default:
                break;
        }
        senderContractRes.receiverCaPath = receiverCaPath;
        senderContractRes.receiverOrgMSPID = receiverCompanyInfo.orgMSPID;
        const walletResult = await bc_contract.getSignInfo(senderContractRes);
    } catch (error) {
        console.log(error);
    }
};
