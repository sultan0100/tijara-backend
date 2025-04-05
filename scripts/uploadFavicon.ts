import path from "path";
import fs from "fs/promises";
import { uploadToR2 } from "../config/cloudflareR2";

const uploadFavicon = async () => {
  const filePath = path.resolve("assets", "favicon.ico"); // <-- actual file path
  const fileBuffer = await fs.readFile(filePath);

  const fileName = "favicon.ico"; // <-- make sure this matches file path

  const uploaded = await uploadToR2({
    file: fileBuffer,
    fileName,
    folder: "public",
    contentType: "image/x-icon", // for .ico, use correct MIME
  });

  console.log("✅ Favicon uploaded:", uploaded);
};

uploadFavicon().catch((err) => {
  console.error("❌ Upload failed:", err.message || err);
});
