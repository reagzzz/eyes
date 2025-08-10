import path from "node:path";
import dotenv from "dotenv";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { Collection } from "../db/models";
import { connectMongo } from "../db/mongo";
import { uploadImageToPinata, uploadJSONToPinata } from "../pinata";
import { generateImage } from "../stability";

(function loadEnv() {
  // Charge .env.local si présent
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
})();

(async function startWorker() {
  await connectMongo();

  const redisUrl =
    process.env.UPSTASH_REDIS_URL ||
    process.env.REDIS_URL ||
    process.env.UPSTASH_REDIS_REST_URL!; // REST ne fonctionnera pas avec ioredis, mais on garde fallback

  const connection = new IORedis(redisUrl, {
    password: process.env.UPSTASH_REDIS_REST_TOKEN,
    tls: {},
    // Requis par BullMQ
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  new Worker(
    "generate",
    async (job) => {
      const { collectionId, prompt, count, model } = job.data as {
        collectionId: string;
        prompt: string;
        count: number;
        model: string;
      };

      const IMAGES_PER_BATCH = 20;
      const imageCIDs: string[] = [];
      const metadataCIDs: string[] = [];

      for (let i = 0; i < count; i += IMAGES_PER_BATCH) {
        const batch = Math.min(IMAGES_PER_BATCH, count - i);
        for (let k = 0; k < batch; k++) {
          const images = await generateImage({
            prompt,
            n: 1,
            model,
            width: 500,
            height: 500,
          });
          for (const buf of images) {
            const cid = await uploadImageToPinata(buf);
            imageCIDs.push(cid);
            const meta = {
              name: `Item #${imageCIDs.length}`,
              description: prompt,
              image: `ipfs://${cid}`,
              attributes: [] as { trait_type?: string; value?: string }[],
            };
            const mCid = await uploadJSONToPinata(meta);
            metadataCIDs.push(mCid);
          }
        }
      }

      await Collection.updateOne(
        { _id: collectionId },
        { $set: { imageCIDs, metadataCIDs } }
      );
      return { ok: true, imageCIDs: imageCIDs.length };
    },
    { connection }
  );

  console.log("Worker ready");
})().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});


