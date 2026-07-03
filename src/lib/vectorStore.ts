import fs from "fs";
import path from "path";
import { getEmbedding } from "./gemini";

const DB_DIR = path.join(process.cwd(), "db");
const VECTOR_STORE_PATH = path.join(DB_DIR, "vector_store.json");

export interface VectorRecord {
  id: string;
  type: "complaint" | "policy";
  text: string;
  vector: number[];
  metadata: {
    title?: string;
    category?: string;
    ward?: string;
    urgency?: string;
    status?: string;
    createdAt?: string;
    [key: string]: any;
  };
}

// Ensure database directory and file exist
function initializeStore(): VectorRecord[] {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(VECTOR_STORE_PATH)) {
    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify([]));
    return [];
  }
  try {
    const rawData = fs.readFileSync(VECTOR_STORE_PATH, "utf-8");
    return JSON.parse(rawData) as VectorRecord[];
  } catch (error) {
    console.error("Failed to read vector store, resetting:", error);
    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify([]));
    return [];
  }
}

// Compute dot product of two vectors
function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

// Vector store class
export class VectorStore {
  // Save an item to the store
  static async add(
    id: string,
    type: "complaint" | "policy",
    text: string,
    metadata: VectorRecord["metadata"]
  ): Promise<void> {
    const records = initializeStore();
    
    // Generate embedding
    const vector = await getEmbedding(text);

    // Remove existing record with same ID if it exists (e.g. on update)
    const filteredRecords = records.filter(r => r.id !== id || r.type !== type);

    const newRecord: VectorRecord = {
      id,
      type,
      text,
      vector,
      metadata
    };

    filteredRecords.push(newRecord);
    
    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(filteredRecords, null, 2));
  }

  // Batch add records
  static async addMany(
    items: Array<{
      id: string;
      type: "complaint" | "policy";
      text: string;
      metadata: VectorRecord["metadata"];
    }>
  ): Promise<void> {
    const records = initializeStore();
    
    for (const item of items) {
      const vector = await getEmbedding(item.text);
      
      // Remove duplicate
      const index = records.findIndex(r => r.id === item.id && r.type === item.type);
      if (index !== -1) {
        records.splice(index, 1);
      }

      records.push({
        id: item.id,
        type: item.type,
        text: item.text,
        vector,
        metadata: item.metadata
      });
    }

    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(records, null, 2));
  }

  // Delete an item from the store
  static delete(id: string, type: "complaint" | "policy"): void {
    const records = initializeStore();
    const filteredRecords = id === "all"
      ? records.filter(r => r.type !== type)
      : records.filter(r => !(r.id === id && r.type === type));
    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(filteredRecords, null, 2));
  }

  // Query top-K items
  static async query(
    queryText: string,
    filter?: { type?: "complaint" | "policy"; category?: string; ward?: string },
    topK = 5
  ): Promise<Array<{ record: VectorRecord; score: number }>> {
    const records = initializeStore();
    if (records.length === 0) return [];

    // Generate query embedding
    const queryVector = await getEmbedding(queryText);

    // Filter records
    let filteredRecords = records;
    if (filter) {
      if (filter.type) {
        filteredRecords = filteredRecords.filter(r => r.type === filter.type);
      }
      if (filter.category) {
        filteredRecords = filteredRecords.filter(r => r.metadata.category === filter.category);
      }
      if (filter.ward) {
        filteredRecords = filteredRecords.filter(r => r.metadata.ward === filter.ward);
      }
    }

    // Score records
    const scored = filteredRecords.map(record => {
      const score = dotProduct(queryVector, record.vector);
      return { record, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }
}
