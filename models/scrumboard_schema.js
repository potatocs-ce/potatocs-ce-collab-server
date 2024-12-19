const mongoose = require("mongoose");

const scrumBoard = mongoose.Schema({
    space_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Space",
    },
    scrum: [
        {
            _id: false,

            label: {
                type: String,
            },
            children: [
                {
                    _id: false,

                    doc_id: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "Document",
                    },
                    creator: [
                        {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "Member",
                        },
                    ],
                    // creatorName: {
                    //     type: String,
                    // },
                    // creatorImg:{
                    //     type: String,
                    // },
                    docTitle: {
                        type: String,
                    },
                    startDate: {
                        type: Date,
                    },
                    endDate: {
                        type: Date,
                    },

                    done: {
                        type: Boolean,
                    },

                    color: {
                        primary: {
                            type: String,
                        },
                        secondary: {
                            type: String,
                        },
                    },

                    labels: [],
                },
            ],
        },
    ],
});

const ScrumBoard = mongoose.model("ScrumBoard", scrumBoard);

module.exports = ScrumBoard;
