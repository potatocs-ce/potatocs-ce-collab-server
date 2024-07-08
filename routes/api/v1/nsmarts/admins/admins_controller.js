const { buildCCP, buildCAClient, enrollAdminMongo } = require("../../../../../utils/ca-utils");
const { MongoWallet } = require("../../../../../utils/mongo-wallet");
const { Wallet } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");

// 어드민 목록 조회
exports.getAdminList = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Admin List
  router.get('/admins', admins.getAdminList);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const { nameFormControl, emailFormControl, active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

  const limit = parseInt(pageSize, 10);
  const skip = parseInt(pageIndex, 10) * limit;
  const sortCriteria = {
    [active]: direction === "desc" ? -1 : 1,
  };

  const query = {
    // 대소문자 상관없는 정규표현식으로 바꾸는 코드
    name: new RegExp(nameFormControl, "i"),
    email: new RegExp(emailFormControl, "i"),
  };

  try {
    const [total, adminList] = await Promise.all([
      dbModels.Admin.countDocuments(query),
      dbModels.Admin.find(query).populate("company_id").sort(sortCriteria).skip(skip).limit(limit),
    ]);

    res.status(200).json({
      message: "Successfully retrieved the admin list",
      data: adminList,
      total_count: total,
    });
  } catch (error) {
    console.error("[ ERROR ]", error);
    res.status(500).json({
      message: "Error fetching admin list",
      error: error.message, // 제공된 에러 메시지를 사용자에게 반환
    });
  }
};

// 어드민과 회사 연결
exports.connectAdminCompany = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Connect Admin And Company
  router.patch('/admins/connectAdminCompany', admins.connectAdminCompany);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;

  try {
    await dbModels.Admin.findOneAndUpdate(
      {
        _id: data.admin_id,
      },
      {
        company_id: data.company_id,
      },
      {
        new: true,
      }
    );

    const foundCompany = await dbModels.Company.findById(data.company_id).lean();
    console.log(foundCompany.company_name)

    /***
     * 블록체인 함수 시작
     * 연결하는 회사에 따라 연결되는 ca가 달라진다.
     * 엔스마트 솔루션은 ca 엔스마트
     * vice는 ca vice
     * 엔스마트가 아닌 회사들은 vice-kr
     * 이렇게 하는 이유는
     * 회사에 따라 블록체인 네트워크 조직 및 구성요소가 유동적으로 바뀌면 좋지만
     * 그런 방식이 어렵고 헷갈려서
     * nsmarts, vice, vicekr 3개의 조직으로 나누고
     * vicekr 소속 회사들은 nsmarts, vice, vicekr가 전부 데이터에 접근가능하고
     * vice 소속일 경우 nsmars, vice만 접근 가능하고
     * nsmars는 nsmarts만 접근 가능하다.
     */
    let selectedCompany = '';
    let mspId = '';
    switch (foundCompany.company_name) {
      case 'nsmarts':
        selectedCompany = 'nsmarts'
        mspId = "NsmartsMSP"
        break;
      case 'vice':
        selectedCompany = 'vice'
        mspId = "ViceMSP"
        break;
      default:
        selectedCompany = 'vice-kr'
        mspId = "ViceKRMSP"
        break;
    }

    const ccp = buildCCP(selectedCompany);
    const caClient = buildCAClient(FabricCAServices, ccp, `ca-${selectedCompany}`);

    // mongodb wallet 생성
    const store = new MongoWallet();
    const wallet = new Wallet(store);
    // 어드민 계정 wallet에 등록
    const enrollAdmin = await enrollAdminMongo(caClient, wallet, mspId, data.admin_id);

    return res.status(200).send({
      message: "Successfully connected the admin and the company",
    });
  } catch (err) {
    console.log("[ ERROR ]", err);
    res.status(500).send({
      message: "Error connecting the admin and the company",
    });
  }
};

// 어드민과 회사 연결해제
exports.disconnectAdminCompany = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Disconnect Admin And Company
  router.patch('/admins/disconnectAdminCompany', admins.disconnectAdminCompany);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  const data = req.body;

  try {
    await dbModels.Admin.findOneAndUpdate(
      {
        _id: data.admin_id,
      },
      {
        company_id: null,
      }
    );

    return res.status(200).send({
      message: "Successfully disconnected the admin and the company",
    });
  } catch (err) {
    console.log("[ ERROR ]", err);
    res.status(500).send({
      message: "Error disconnecting the admin and the company",
    });
  }
};
