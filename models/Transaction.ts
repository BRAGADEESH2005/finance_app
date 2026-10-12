import { Schema, models, model } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    kind: {
      type: String,
      enum: ["Income", "Expense", "Investment"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Speeds up each user's date-sorted transaction queries.
transactionSchema.index({
  userId: 1,
  date: -1,
  createdAt: -1,
});

transactionSchema.index({ userId: 1, kind: 1, date: -1 });

const Transaction =
  models.Transaction || model("Transaction", transactionSchema);

export default Transaction;