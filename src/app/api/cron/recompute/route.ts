import { NextResponse } from "next/server";
import { connectMongo } from "@/server/db/mongo";
import { Collection, Mint } from "@/server/db/models";

export async function GET() {
  try {
    await connectMongo();

    const liveCollections = await Collection.find({ status: "live" }, { _id: 1 }).lean();
    const collectionIds: string[] = liveCollections.map((c: { _id: unknown }) => String(c._id));

    if (collectionIds.length === 0) {
      return NextResponse.json({ updated: 0, note: "no live collections" });
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total mints per collection
    const counts: Array<{ _id: string; count: number }> = await Mint.aggregate([
      { $match: { collectionId: { $in: collectionIds } } },
      { $group: { _id: "$collectionId", count: { $sum: 1 } } },
    ]);

    // Volume last 24h per collection
    const vol24: Array<{ _id: string; volume: number }> = await Mint.aggregate([
      { $match: { collectionId: { $in: collectionIds }, createdAt: { $gte: dayAgo } } },
      {
        $group: {
          _id: "$collectionId",
          volume: { $sum: { $ifNull: ["$priceSol", 0] } },
        },
      },
    ]);

    // Volume last 7d per collection
    const vol7: Array<{ _id: string; volume: number }> = await Mint.aggregate([
      { $match: { collectionId: { $in: collectionIds }, createdAt: { $gte: weekAgo } } },
      {
        $group: {
          _id: "$collectionId",
          volume: { $sum: { $ifNull: ["$priceSol", 0] } },
        },
      },
    ]);

    const countMap = new Map<string, number>(counts.map((c) => [String(c._id), Number(c.count || 0)]));
    const vol24Map = new Map<string, number>(vol24.map((v) => [String(v._id), Number(v.volume || 0)]));
    const vol7Map = new Map<string, number>(vol7.map((v) => [String(v._id), Number(v.volume || 0)]));

    let updated = 0;
    for (const id of collectionIds as string[]) {
      const mintsCount = countMap.get(id) || 0;
      const volumeSol24h = +(vol24Map.get(id) || 0);
      const volumeSol7d = +(vol7Map.get(id) || 0);
      await Collection.updateOne(
        { _id: id },
        { $set: { mintsCount, volumeSol24h, volumeSol7d, updatedAt: new Date() } }
      );
      updated += 1;
    }

    return NextResponse.json({ updated, collectionIds });
  } catch (error: unknown) {
    console.error("cron/recompute error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


