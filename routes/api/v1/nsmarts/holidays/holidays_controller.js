// 휴일 목록 조회
exports.getHolidayList = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Get Holiday list
  router.get('/holidays', holidays.getHolidayList);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    const { active = "createdAt", direction = "asc", pageIndex = "0", pageSize = "10" } = req.query;

    const limit = parseInt(pageSize, 10);
    const skip = parseInt(pageIndex, 10) * limit;
    const sortCriteria = {
        [active]: direction === "desc" ? -1 : 1,
    };

    try {
        const [total, getCountry] = await Promise.all([
            dbModels.NationalHoliday.countDocuments(),
            dbModels.NationalHoliday.findById({ _id: req.query.id }).sort(sortCriteria).skip(skip).limit(limit).lean(),
        ]);

        return res.status(200).send({
            message: "Successfully retrieved the holiday list",
            data: getCountry,
            total_count: total,
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error fetching holiday list",
        });
    }
};

// 휴일 등록
exports.addHoliday = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Add Holiday
  router.post('/holidays', holidays.addHoliday);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        const findCountryHoliday = await dbModels.NationalHoliday.findOne({
            _id: req.body._id,
            "countryHoliday.holidayDate": req.body.holidayDate,
        });
        if (findCountryHoliday) {
            return res.status(404).send({
                message: "The holiday date is duplicated.",
            });
        }

        await dbModels.NationalHoliday.findByIdAndUpdate(
            {
                _id: req.body._id,
            },
            {
                $push: {
                    countryHoliday: {
                        holidayName: req.body.holidayName,
                        holidayDate: req.body.holidayDate,
                    },
                },
            },
            {
                upsert: true,
            }
        );
        return res.status(200).send({
            message: "Successfully added the holiday",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error adding the holiday",
        });
    }
};

// 휴일 삭제
exports.deleteHoliday = async (req, res) => {
    console.log(`
--------------------------------------------------
  User : ${req.decoded._id}
  API  : Delete Holiday
  router.post('/holidays/:id', holidays.deleteHoliday);
  
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;
    try {
        await dbModels.NationalHoliday.findByIdAndUpdate(
            req.query.countryId,
            {
                $pull: {
                    countryHoliday: {
                        _id: req.params.id,
                    },
                },
            },
            {
                upsert: true,
            }
        );
        return res.status(200).send({
            message: "Successfully deleted the holiday",
        });
    } catch (err) {
        console.log("[ ERROR ]", err);
        res.status(500).send({
            message: "Error deleting the holiday",
        });
    }
};
