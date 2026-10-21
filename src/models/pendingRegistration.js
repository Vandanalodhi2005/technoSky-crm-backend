import mongoose from "mongoose";

const PendingRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    lastSentAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export default
  mongoose.models.PendingRegistration ||
  mongoose.model("PendingRegistration", PendingRegistrationSchema);
