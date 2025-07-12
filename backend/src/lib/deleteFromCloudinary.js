import cloudinary from "./cloudinary.js"; // Убедись, что это правильный путь к твоему файлу инициализации Cloudinary

/**
 * Извлекает public_id из URL Cloudinary.
 * @param {string} url - URL изображения/аудио в Cloudinary.
 * @returns {string|null} public_id или null, если не удалось извлечь.
 */
export const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split("/");
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return null;

  let publicId = url.substring(uploadIndex + "/upload/".length);

  // Удаляем версию (e.g., 'v12345/') если она есть
  const versionRegex = /^v\d+\//;
  if (versionRegex.test(publicId)) {
    publicId = publicId.substring(publicId.indexOf("/") + 1);
  }

  // Удаляем расширение файла
  const dotIndex = publicId.lastIndexOf(".");
  if (dotIndex !== -1) {
    publicId = publicId.substring(0, dotIndex);
  }
  return publicId;
};

/**
 * Удаляет ресурс из Cloudinary по его public_id.
 * @param {string} publicId - public_id ресурса в Cloudinary.
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) {
    console.warn(
      "No public ID provided for Cloudinary deletion. Skipping deletion."
    );
    return;
  }
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Successfully deleted ${publicId} from Cloudinary:`, result);
    return result;
  } catch (error) {
    console.error(`Error deleting ${publicId} from Cloudinary:`, error);
    // Не выбрасываем ошибку, чтобы не блокировать основной поток выполнения,
    // если удаление из Cloudinary по какой-то причине не удалось.
  }
};
