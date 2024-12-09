const mongoose = require('mongoose');

const adContract = mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    title: {
      type: String
    },
    description: {
      type: String
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    }
    ,
    receiver_company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    originalname: {
      type: String
    },
    key: {
      type: String,
    },
    location: {
      type: String
    },
    pdfHash: {
      type: String
    },
    status: {
      type: String
    },
    rejectReason: {
      type: String
    },
    senderSign: [
      {
        _id: false,
        pageNum: { type: Object },
        drawingEvent: {
          type: Object
          // point: [],
          // timeDiff: { type: Number },
          // tool: {
          //   color: {
          //     type: String
          //   },
          //   type: {
          //     type: String
          //   },
          //   width: {
          //     type: Number
          //   },
          // },
        },
        signedTime: {
          type: String
        }
      },
    ],
    senderHash: {
      type: String
    },
    receiverSign: [
      {
        _id: false,
        pageNum: { type: Number },
        drawingEvent: {
          type: Object
          // point: [],
          // timeDiff: { type: Number },
          // tool: {
          //   color: {
          //     type: String
          //   },
          //   type: {
          //     type: String
          //   },
          //   width: {
          //     type: Number
          //   },
          // },
        },
        signedTime: {
          type: String
        }
      },
    ],
    receiverHash: {
      type: String
    },
  },
  {
    timestamps: true
  }
);


const AdContract = mongoose.model('AdContract', adContract);

module.exports = AdContract;
