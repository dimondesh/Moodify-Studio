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
export const deleteFromCloudinary = async (
  publicId,
  resourceType = "image"
) => {
  if (!publicId) {
    console.warn("deleteFromCloudinary: No public ID provided. Skipping.");
    return;
  }

  try {
    console.log(
      `[Cloudinary] Deleting ${publicId} with resource_type: ${resourceType}...`
    );

    // ВАЖНО: Мы передаем второй аргумент с опциями, указывая тип ресурса
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    // Проверяем результат от Cloudinary
    if (result.result === "ok") {
      console.log(`[Cloudinary] Successfully deleted ${publicId}.`);
    } else {
      // 'not found' - это не ошибка, а нормальный ответ, если файла уже нет
      console.warn(
        `[Cloudinary] Resource ${publicId} resulted in: ${result.result}.`
      );
    }

    return result;
  } catch (error) {
    console.error(`[Cloudinary] Error deleting ${publicId}:`, error);
  }
};
