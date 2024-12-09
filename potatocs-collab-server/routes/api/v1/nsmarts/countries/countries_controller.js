// 국가 목록 조회
exports.getCountryList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Country List
  router.get('/countries', countries.getCountryList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const { nameFormControl, codeFormControl, active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

    const limit = parseInt(pageSize, 10);
    const skip = parseInt(pageIndex, 10) * limit;
    const sortCriteria = {
        [active]: direction === "desc" ? -1 : 1,
    };

    const query = {
        // 대소문자 상관없는 정규표현식으로 바꾸는 코드
        countryName: new RegExp(nameFormControl, "i"),
        countryCode: new RegExp(codeFormControl, "i"),
    };

    try {
        const [total, getCountry] = await Promise.all([
            dbModels.NationalHoliday.countDocuments(query),
            dbModels.NationalHoliday.find(query).sort(sortCriteria).skip(skip).limit(limit).lean(),
        ]);

        return res.status(200).send({
            message: "Successfully retrieved the country list",
            data: getCountry,
            total_count: total,
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error fetching country list",
        });
    }
};

// 국가 등록
exports.addCountry = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Add Country
  router.post('/countries', countries.addCountry);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        const findCountryCode = await dbModels.NationalHoliday.findOne({ countryCode: req.body.countryCode });
        if (findCountryCode) {
            return res.status(404).send({
                message: "The country code is duplicated.",
            });
        }

        const addCountryData = {
            countryCode: req.body.countryCode,
            countryName: req.body.countryName,
        };

        const addCountry = await dbModels.NationalHoliday(addCountryData);
        await addCountry.save();

        return res.status(200).send({
            message: "Successfully added the country",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error adding the country",
        });
    }
};

// 국가 삭제
exports.deleteCountry = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Country
  router.post('/countries/:id', countries.deleteCountry);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        const deleteCountry = await dbModels.NationalHoliday.findByIdAndDelete({ _id: req.params.id });
        return res.status(200).send({
            message: "Successfully deleted the country",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error deleting the country",
        });
    }
};
