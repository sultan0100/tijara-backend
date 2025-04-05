import path from "path";
import fs from "fs/promises";
import { uploadToR2 } from "../config/cloudflareR2";

const uploadFavicon = async () => {
  const filePath = path.resolve("assets", "favicon.ico");
  const fileBuffer = await fs.readFile(filePath);

  const fileName = "favicon.ico";

  // Create a mock Multer file object to match the uploadToR2 function signature
  const faviconFile = {
    buffer: fileBuffer,
    originalname: fileName,
    fieldname: 'favicon',
    mimetype: 'image/x-icon',
    size: fileBuffer.length,
  } as Express.Multer.File;

  const uploaded = await uploadToR2(
    faviconFile,
    'favicon'
  );

  console.log("✅ Favicon uploaded:", uploaded);
};

uploadFavicon().catch((err) => {
  console.error("❌ Upload failed:", err.message || err);
});
