// backend/src/lib/image.service.js
import sharp from "sharp";
import { uploadToBunny } from "./bunny.service.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import os from "os";
import fs from "fs/promises";

/**
 * Оптимизирует изображение, загружает его на Bunny.net и удаляет временный файл.
 * @param {object | Buffer} source - Файл из express-fileupload или буфер.
 * @param {string} originalFileName - Имя файла для определения типа.
 * @param {string} folder - Папка на Bunny.net (e.g., 'playlist_covers').
 * @param {number} width - Целевая ширина.
 * @param {number} quality - Качество WebP (1-100).
 * @returns {Promise<{url: string, path: string}>}
 */
export const optimizeAndUploadImage = async (
  source,
  originalFileName,
  folder,
  width = 800,
  quality = 80
) => {
  const newFileName = `${uuidv4()}.webp`;
  // Создаем временный путь, даже если работаем с буфером, для записи результата sharp
  const tempOptimizedFilePath = path.join(os.tmpdir(), newFileName);

  const sourceBuffer = source.tempFilePath
    ? await fs.readFile(source.tempFilePath)
    : source;

  try {
    await sharp(sourceBuffer)
      .resize({ width, fit: sharp.fit.cover })
      .webp({ quality })
      .toFile(tempOptimizedFilePath);

    const result = await uploadToBunny(tempOptimizedFilePath, folder);

    return { url: result.url, path: result.path, publicId: result.path };
  } catch (error) {
    console.error(`Error optimizing and uploading image to ${folder}:`, error);
    throw error;
  } finally {
    await fs.unlink(tempOptimizedFilePath).catch((err) => {
      if (err.code !== "ENOENT") {
        console.error(
          `Error deleting temp optimized file: ${tempOptimizedFilePath}`,
          err
        );
      }
    });
    if (source.tempFilePath) {
      await fs.unlink(source.tempFilePath).catch((err) => {
        if (err.code !== "ENOENT") {
          console.error(
            `Error deleting original temp file: ${source.tempFilePath}`,
            err
          );
        }
      });
    }
  }
};
