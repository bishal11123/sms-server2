// models/LastCertificate.js
import mongoose from "mongoose";

const LastCertificateSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    certificateType: {
      type: String,
      enum: [
        "relationship",
        "birth",
        "income",
        "occupation",
        "address",
        "tax",
        "fiscal",
        "profile",
        "language",
      ],
      required: true,
      index: true,
    },

    generatedData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    pdfData: {
      type: Buffer, // Store raw PDF
      default: null,
    },

    pdfMimeType: {
      type: String,
      default: "application/pdf",
    },
  },
  { timestamps: true }
);

LastCertificateSchema.index(
  { studentId: 1, certificateType: 1 },
  { unique: true }
);

export default mongoose.model("LastCertificate", LastCertificateSchema);
