import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const env = {
  /** Qwen API key for Bedrock */
  qwenApiKey: process.env.QWEN_API_KEY ?? "",
  /** Qwen coding model identifier */
  qwenCodingModel: process.env.QWEN_CODING_MODEL ?? "",
  /** Qwen VLM model identifier */
  qwenVlm: process.env.QWEN_VLM ?? "",
  /** Inference server URL for DETR */
  inferenceServerUrl: process.env.INFERENCE_SERVER_URL ?? "http://localhost:8000",
  /** MongoDB connection URI */
  mongodbUri: process.env.MONGODB_URI ?? "mongodb+srv://khush09thakkar_db_user:q4IAzc6Dhvvcb3az@wireframe-to-layout-clu.zgsceec.mongodb.net/?appName=Wireframe-to-Layout-Cluster",
} as const;
