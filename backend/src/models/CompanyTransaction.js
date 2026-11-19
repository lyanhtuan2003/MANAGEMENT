
import mongoose from "mongoose";

const companyTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Vui lòng chọn loại giao dịch"],
    },

    content: {
      type: String,
      required: [true, "Vui lòng nhập nội dung giao dịch"],
      trim: true,
      maxlength: 500,
    },

    amount: {
      type: Number,
      required: [true, "Vui lòng nhập số tiền"],
      min: [1, "Số tiền phải lớn hơn 0"],
    },

    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

companyTransactionSchema.index({ transactionDate: -1 });
companyTransactionSchema.index({ type: 1, transactionDate: -1 });

const CompanyTransaction = mongoose.model(
  "CompanyTransaction",
  companyTransactionSchema
);

export default CompanyTransaction;
