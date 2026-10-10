import { Schema, models, model } from "mongoose";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    // 26 means the financial cycle runs from the 26th
    // through the 25th of the following month.
    cycleStartDay: {
      type: Number,
      min: 1,
      max: 28,
      default: 26,
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = models.User || model("User", userSchema);

export default User;