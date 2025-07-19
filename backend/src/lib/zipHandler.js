// backend/src/utils/zipHandler.js
import AdmZip from "adm-zip";
import path from "path";
import fs from "fs/promises"; // Используем промисы для асинхронной работы с файлами

/**
 * Рекурсивно обходит директорию и собирает пути к файлам.
 * @param {string} dir - Директория для обхода.
 * @returns {Promise<string[]>} Массив полных путей к файлам.
 */
async function getFilesRecursively(dir) {
  let files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getFilesRecursively(fullPath)); // Рекурсивный вызов
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Распаковывает ZIP-файл во временную директорию.
 * @param {string} zipFilePath - Полный путь к ZIP-файлу на сервере.
 * @param {string} tempDir - Путь к временной директории, куда нужно распаковать.
 * @returns {Promise<string[]>} Массив путей к распакованным файлам.
 */
export const extractZip = async (zipFilePath, tempDir) => {
  try {
    await fs.mkdir(tempDir, { recursive: true }); // Создаем временную директорию, если ее нет
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(tempDir, true); // true = перезаписывать существующие файлы

    console.log(`[ZipHandler] ZIP-файл распакован в: ${tempDir}`);

    // Получаем список всех файлов рекурсивно из распакованной директории
    const extractedFilePaths = await getFilesRecursively(tempDir);
    return extractedFilePaths;
  } catch (error) {
    console.error(
      `[ZipHandler] Ошибка при распаковке ZIP-файла ${zipFilePath}:`,
      error.message
    );
    throw new Error(`Не удалось распаковать ZIP-файл: ${error.message}`);
  }
};

/**
 * Парсит имя файла и определяет название песни и тип трека.
 * Ожидаемый формат: "Название Песни - Тип.mp3" или "Название_Песни_Тип.mp3"
 * Поддерживаемые типы: "Vocals", "Instrumental"
 * @param {string} filename - Полное имя файла (например, "My Song - Vocals.mp3").
 * @returns {object|null} Объект { songName: string, trackType: 'vocals' | 'instrumental' } или null, если формат не распознан.
 */
export const parseTrackFileName = (filename) => {
  const baseName = path.basename(filename, path.extname(filename)); // "My Song - Vocals" или "Enough_for_you_instrumental"

  // Учитываем ваши названия файлов: Enough_for_you_instrumental.mp3
  // И ваш предыдущий пример: НазваниеПесни_vocals.mp3
  const vocalsMatch = baseName.match(/(.*)[_-]vocals$/i);
  if (vocalsMatch && vocalsMatch[1]) {
    return {
      songName: vocalsMatch[1].trim().replace(/[_-]/g, " "),
      trackType: "vocals",
    };
  }

  const instrumentalMatch = baseName.match(/(.*)[_-]instrumental$/i);
  if (instrumentalMatch && instrumentalMatch[1]) {
    return {
      songName: instrumentalMatch[1].trim().replace(/[_-]/g, " "),
      trackType: "instrumental",
    };
  }

  // Также обрабатываем вариант с пробелами, который был в изначальном коде
  const vocalsMatchSpace = baseName.match(/(.*)\s-\sVocals$/i);
  if (vocalsMatchSpace && vocalsMatchSpace[1]) {
    return { songName: vocalsMatchSpace[1].trim(), trackType: "vocals" };
  }

  const instrumentalMatchSpace = baseName.match(/(.*)\s-\sInstrumental$/i);
  if (instrumentalMatchSpace && instrumentalMatchSpace[1]) {
    return {
      songName: instrumentalMatchSpace[1].trim(),
      trackType: "instrumental",
    };
  }

  console.warn(
    `[ZipHandler] Не удалось распознать формат файла: ${filename}. Пропускаем.`
  );
  return null;
};

/**
 * Удаляет директорию со всеми файлами.
 * @param {string} dirPath - Путь к директории для удаления.
 */
export const cleanUpTempDir = async (dirPath) => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`[ZipHandler] Временная директория удалена: ${dirPath}`);
  } catch (error) {
    console.error(
      `[ZipHandler] Ошибка при удалении временной директории ${dirPath}:`,
      error.message
    );
  }
};
