const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const mongApp = {};
mongApp.appSetObjectId = function (app) {
  app.set("ObjectId", mongoose.Types.ObjectId);
  console.log("complete to set mongoose ObjectId");
};

main().catch((err) => console.log(err));

async function main() {
  // test-potatocs , potatocs
  await mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      createSchema();
      console.log("Database Connected");
    });
}

function createSchema() {
  const dbModels = {};

  dbModels.Admin = require("../models/admin_schema");
  dbModels.NsAdmin = require("../models/nsAdmin_schema");
  dbModels.AdMenuSide = require("../models/ad_menu_side_schema");

  dbModels.Member = require("../models/member_schema");
  dbModels.Manager = require("../models/manager_schema");
  dbModels.LeaveRequest = require("../models/leave_request_schema");
  dbModels.LeaveRequestHistory = require("../models/leave_request_history_schema");
  dbModels.UsedLeave = require("../models/used_leave_schema");

  dbModels.Folder = require("../models/folder_schema");
  dbModels.Space = require("../models/space_schema");
  dbModels.MenuSide = require("../models/menu_side_schema");
  dbModels.Document = require("../models/doc_schema");
  dbModels.UploadFile = require("../models/uploadFile_schema");
  dbModels.Chat = require("../models/chat_schema");
  dbModels.Meeting = require("../models/meeting_schema");
  dbModels.WhiteBoard = require("../models/white_board_schema");

  dbModels.MySpaceHistory = require("../models/my_space_history_schema");

  dbModels.Company = require("../models/company_schema");
  dbModels.PendingCompanyRequest = require("../models/pending_company_req_schema");
  dbModels.PendingCompanyRequestHistory = require("../models/pending_company_req_history_schema");
  dbModels.PersonalLeaveStandard = require("../models/personal_leave_standard_schema");
  dbModels.RdRequest = require("../models/rd_request_schema");
  dbModels.NationalHoliday = require("../models/national_holiday_schema");

  dbModels.Notification = require("../models/notification_schema");

  dbModels.ScrumBoard = require("../models/scrumboard_schema");
  dbModels.FileUpload = require("../models/fileUpload_schema");
  global.DB_MODELS = dbModels;
}

module.exports = mongApp;
