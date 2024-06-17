const router = require("express").Router();

const companies = require("./companies/companies_index");
const profiles = require("./profiles/profiles_index");
const admins = require("./admins/admins_index");
const countries = require("./countries/countries_index");
const holidays = require("./holidays/holidays_index");

router.use("/companies", companies);
router.use("/profiles", profiles);
router.use("/admins", admins);
router.use("/countries", countries);
router.use("/holidays", holidays);

module.exports = router;
