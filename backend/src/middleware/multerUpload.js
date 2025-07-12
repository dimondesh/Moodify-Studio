// /home/dmytro/VS_Projects/Moodify/backend/src/middleware/multerUpload.js
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Helper to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define storage for files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // You might want to categorize uploads (e.g., 'audio', 'images')
    // For now, let's put everything in an 'uploads' directory
    let uploadPath = path.join(__dirname, "../../public/uploads");

    // You can add more specific logic here based on file type or route
    if (file.mimetype.startsWith("audio/")) {
      uploadPath = path.join(__dirname, "../../public/uploads/audio");
    } else if (file.mimetype.startsWith("image/")) {
      uploadPath = path.join(__dirname, "../../public/uploads/images");
    }

    // Ensure the directory exists
    // fs.mkdirSync(uploadPath, { recursive: true }); // Multer handles creating directories if needed, but it's good practice to ensure.
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent overwrites
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// File filter to allow only certain file types
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "audio/mpeg",
    "audio/wav",
    "audio/aac",
  ]; // Add more audio types as needed
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type!"), false);
  }
};

// Initialize multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 50, // Limit file size to 50MB (adjust as needed)
  },
});

export default upload;
