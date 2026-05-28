import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    price: { type: Number, default: 0, min: 0 },
    halfPrice: { type: Number, default: null, min: 0 },
    piecePrice: { type: Number, default: null, min: 0 },
    imageUrl: { type: String, trim: true, default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    sortOrder: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    isOffer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Item = mongoose.model("Item", itemSchema);
