import mongoose, { Schema } from "mongoose";

const CollectionSchema = new Schema({
  _id: { type: String },
  title: String,
  prompt: String,
  creatorWallet: String,
  supply: Number,
  mintPriceSol: Number,
  royaltyBps: { type: Number, default: 0 },
  imageCIDs: [String],
  metadataCIDs: [String],
  coverCID: String,
  status: { type: String, enum: ["draft", "live", "soldout", "blocked"], default: "draft" },
  mintsCount: { type: Number, default: 0 },
  volumeSol24h: { type: Number, default: 0 },
  volumeSol7d: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

CollectionSchema.index({ status: 1, createdAt: -1 });
CollectionSchema.index({ volumeSol24h: -1 });
CollectionSchema.index({ mintsCount: -1 });

const MintSchema = new Schema({
  collectionId: String,
  minterWallet: String,
  mintTx: String,
  priceSol: Number,
  createdAt: { type: Date, default: () => new Date() }
});
MintSchema.index({ collectionId: 1, createdAt: -1 });

const PaymentSchema = new Schema({
  wallet: String,
  lamports: Number,
  count: Number,
  model: String,
  reference: String,
  txSig: String,
  status: { type: String, enum: ["pending","confirmed","failed"], default: "pending" },
  createdAt: { type: Date, default: () => new Date() }
});
PaymentSchema.index({ reference: 1 });

export const Collection = mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);
export const Mint = mongoose.models.Mint || mongoose.model("Mint", MintSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);


