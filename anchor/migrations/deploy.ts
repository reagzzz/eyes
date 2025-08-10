/* Placeholder: after deploying with Anchor, write NEXT_PUBLIC_PROGRAM_ID into .env.local */
import { writeFileSync, readFileSync } from "fs";

export default async function main(provider: any) {
  const programId = process.env.PROGRAM_ID || "";
  if (!programId) {
    console.log("Set PROGRAM_ID env var before running migration to update .env.local");
    return;
  }
  const path = ".env.local";
  let content = "";
  try { content = readFileSync(path, "utf8"); } catch { content = ""; }
  const re = /^NEXT_PUBLIC_PROGRAM_ID=.*$/m;
  if (re.test(content)) content = content.replace(re, `NEXT_PUBLIC_PROGRAM_ID=${programId}`);
  else content += `\nNEXT_PUBLIC_PROGRAM_ID=${programId}\n`;
  writeFileSync(path, content);
  console.log(".env.local updated with NEXT_PUBLIC_PROGRAM_ID");
}


