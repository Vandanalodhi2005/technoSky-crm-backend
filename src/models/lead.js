
import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    company: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 25,
      default: "",
    },
    service: {
      type: String,
      required: true,
      enum: [
        "Web Development",
        "Software Development",
        "Mobile App Development",
        "Cloud & IT Support",
        "Other",
      ],
    },
    status: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Qualified",
        "Proposal Sent",
        "Won",
        "Lost",
      ],
      default: "New",
    },
    source: {
      type: String,
      enum: [
        "Website",
        "Referral",
        "LinkedIn",
        "Other",
      ],
      default: "Website",
    },
    notes: {
      type: String,
      maxlength: 2000,
      default: "",
    },
    nextFollowUp: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Lead ||
  mongoose.model("Lead", LeadSchema);
