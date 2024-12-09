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

    const [total, getCountry] = await Promise.all([
      dbModels.NationalHoliday.countDocuments(),
      dbModels.NationalHoliday
        .find()
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).send({
      message: 'Get admin list successful',
      data: getCountry,
      total_count: total
    })

  } catch (err) {

    console.log('[ ERROR ]', err);
    res.status(500).send({
      message: 'Loading Country Error'
    })
  }
}
// 국가 등록
exports.addCountry = async (req, res) => {
  console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : add company
  router.post('/addCountry', countries.addCountry);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  try {



    const findCountryCode = await dbModels.NationalHoliday.findOne({ countryCode: req.body.countryCode });
    if (findCountryCode) {
      return res.status(500).send({
        message: 'The country code is duplicated.',
      })
    }

    const addCountryData = {
      countryCode: req.body.countryCode,
      countryName: req.body.countryName,
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
  API  : delete country
  router.post('/deleteCountry', countries.deleteCountry);
  
--------------------------------------------------`);
  const dbModels = global.DB_MODELS;
  try {


    const deleteCountry = await dbModels.NationalHoliday.findByIdAndDelete({ _id: req.params.id });
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
