const mongoose = require("mongoose");

const adMenuSide = mongoose.Schema({
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  folder_list: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
    },
  ],
  space_list: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
    },
  ],
  //박재현
  isDialog: {
    type: Boolean,
  },
  //end
});

const AdMenuSide = mongoose.model("AdMenuSide", adMenuSide);

module.exports = AdMenuSide;
