const mongoose = require('mongoose');

const docSchema = mongoose.Schema(
    {
        spaceTime_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Space',
        },

        docTitle: {
            type: String
        },
        docDescription: {
            type: String
        },
        docContent: {
            type: Array,
        },
        status: {
            type: Object
        },
        creator: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Member',
        }],
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        done: {
            type: Boolean,
            default: false
        },
        color: {
            primary: {
                type: String
            },
            secondary: {
                type: String
            }
        },
        labels: [],

        // 얼굴 인증 .. 이지만 space 생성으로 옮겨져서 사용되지 않을예정
        faceAuthentication: {
            type: Boolean,
            // default: false
        }
    },
    {
        timestamps: true
    }
);

const Document = mongoose.model('Document', docSchema);

module.exports = Document;


