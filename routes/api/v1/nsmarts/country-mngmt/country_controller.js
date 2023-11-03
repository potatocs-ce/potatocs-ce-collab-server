const { ObjectId } = require('bson');
const randomize = require('randomatic');

// 국가 목록 불러오기
exports.getCountryList = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get country list
  router.get('/getCountryList', countryMngmtCtrl.getCountryList);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;

  try {

    const getCountry = await dbModels.NationalHoliday.find();

    if (getCountry) {
      return res.status(404).send({
        message: 'Country was not found'
      })
    }

    return res.status(200).send({
      message: 'getCountry',
      getCountry
    })


  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'Loading Country Error'
    })
  }
};

// 국가 정보 가져오기
exports.getCountryInfo = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get country list
  router.get('/getCountryInfo', countryMngmtCtrl.getCountryInfo);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;

  try {
    console.log(req.query)
    const getCountryInfo = await dbModels.NationalHoliday.findOne({ _id: req.query.countryId });

    console.log(getCountryInfo);

    return res.status(200).send({
      message: 'getCountryInfo',
      getCountryInfo
    })


  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'Loading Country Error'
    })
  }
};

// 국가 등록
exports.addCountry = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add company
  router.post('/addCountry', countryMngmtCtrl.addCountry);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  try {

    const addCountryData = {
      countryCode: req.body.countryCode,
      countryName: req.body.countryName,
    }

    const findCountryCode = await dbModels.NationalHoliday.findOne({ countryCode: req.body.countryCode });
    if (findCountryCode) {
      return res.status(500).send({
        message: 'The country code is duplicated.',
      })
    }

    const addCountry = await dbModels.NationalHoliday(addCountryData);
    await addCountry.save();

    return res.status(200).send({
      message: 'Success add country',
    })


  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'adding Country Error'
    })
  }
};

// 국가 삭제
exports.deleteCountry = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : delete company
  router.post('/deleteCountry', countryMngmtCtrl.deleteCountry);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  try {
    // 작업중
    // const findDeleteMemberCountry = await dbModels.Member.find({location: req.query._id},{_id:false, name:true, location:true })
    // console.log(findDeleteMemberCountry)

    const deleteCountry = await dbModels.NationalHoliday.findOneAndDelete({ _id: req.query._id });
    return res.status(200).send({
      message: 'Success delete country',
    })


  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'deleteing Country Error'
    })
  }
};

// 국가별 휴가 등록
exports.addCountryHoliday = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add company
  router.post('/addCountryHoliday', countryMngmtCtrl.addCountryHoliday);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  try {
    const updateCountryHoliday = await dbModels.NationalHoliday.findOneAndUpdate({
      _id: req.body._id,
    },
      {
        $push: {
          countryHoliday: {
            "holidayName": req.body.holidayName,
            "holidayDate": req.body.holidayDate,
          }
        }
      },
      {
        upsert: true,
      }
    ).exec();


    return res.status(200).send({
      message: 'Success add country holiday',
    })


  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'adding country holiday Error'
    })
  }
};

// 국가별 휴가 삭제
exports.deleteCountryHoliday = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add company
  router.post('/deleteCountryHoliday', countryMngmtCtrl.deleteCountryHoliday);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  console.log(req.body)

  try {
    const deleteCountryHoliday = await dbModels.NationalHoliday.findOneAndUpdate({
      _id: req.body.countryId,
    },
      {
        $pull: {
          countryHoliday: {
            "_id": req.body.holidayId,
          }
        }
      },
      {
        upsert: true,
      }
    ).exec();

    return res.status(200).send({
      message: 'Success delete country holiday',
    })


  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'adding country holiday Error'
    })
  }
};
