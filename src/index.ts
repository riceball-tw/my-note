import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { reset } from "drizzle-seed";
import * as schema from "@/src/db/schema";

export const db = drizzle(process.env.DATABASE_URL!);


async function main() {
  await reset(db, schema);
}

main()