import { Schema, models, model } from "mongoose";

const creditCardTransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cardName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
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
    merchant: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
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
  },
);

creditCardTransactionSchema.index({
  userId: 1,
  date: -1,
  createdAt: -1,
});

creditCardTransactionSchema.index({
  userId: 1,
  cardName: 1,
  date: -1,
});

const CreditCardTransaction =
  models.CreditCardTransaction ||
  model("CreditCardTransaction", creditCardTransactionSchema);

export default CreditCardTransaction;
