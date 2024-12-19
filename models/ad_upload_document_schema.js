const mongoose = require("mongoose");

const adUploadDocument = mongoose.Schema(
    {
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
        },
        writer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
        },
        title: {
            type: String,
        },
        content: {
            type: String,
        },
        originalname: {
            type: String,
        },
        key: {
            type: String,
        },
        location: {
            type: String,
        },
        pdfHash: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const AdUploadDocument = mongoose.model("AdUploadDocument", adUploadDocument);

module.exports = AdUploadDocument;
