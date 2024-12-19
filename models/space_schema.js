const mongoose = require("mongoose");

const spaceSchema = mongoose.Schema(
    {
        displayName: {
            type: String,
        },
        displayBrief: {
            type: String,
        },
        route: {
            type: String,
            default: "collab/space",
        },
        // spaceTime: {
        // 	type: String
        // },
        in_order: {
            type: Number,
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Member",
            },
        ],
        admins: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Member",
            },
        ],
        folder_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
        },
        in_order: {
            type: Number,
        },
        docStatus: {
            type: Array,
        },

        labels: [],
        faceAuthentication: {
            type: Boolean,
            // default: false
        },
    },
    {
        timestamps: true,
    }
);

const Space = mongoose.model("Space", spaceSchema);

module.exports = Space;
