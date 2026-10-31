import { Schema, models, model } from "mongoose";

const lifeLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    event: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    amount: {
      type: Number,
      min: 0,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

lifeLogSchema.index({ userId: 1, date: -1 });

const LifeLog = models.LifeLog || model("LifeLog", lifeLogSchema);

export default LifeLog;