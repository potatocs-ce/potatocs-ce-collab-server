const router = require("express").Router();

const employees = require("./employees/employees_index");
const retired_employees = require("./retired_employees/retired_employees_index");
const employment_contracts = require("./employment_contracts/employment_contracts_index");
const holidays = require("./holidays/holidays_index");
const dashboard = require("./dashboard/dashboard_index");
const profiles = require("./profiles/profiles_index");

router.use("/employees", employees);
router.use("/retired_employees", retired_employees);
router.use("/employment_contracts", employment_contracts);
router.use("/holidays", holidays);
router.use("/dashboard", dashboard);
router.use("/profiles", profiles);

module.exports = router;
