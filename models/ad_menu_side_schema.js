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
  //박재현
  /*
  'ref: "Space" 부분은 이 ObjectId가 "Space" 모델과 연결되어 있다는 것을 나타냅니다. 즉, 이 ObjectId는 다른 모델인 "Space" 모델의 문서를 참조하고 있음을 의미합니다. 
  이것은 Mongoose에서의 Populatio 기능을 사용하여 다른 모델과의 관계를 설정하는 것입니다.
  */
  //end
  space_list: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
    },
  ],
});

const AdMenuSide = mongoose.model("AdMenuSide", adMenuSide);

module.exports = AdMenuSide;
