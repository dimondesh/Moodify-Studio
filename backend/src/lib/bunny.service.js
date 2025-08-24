// backend/src/lib/bunny.service.js
import axios from "axios";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const {
  BUNNY_STORAGE_ZONE_NAME,
  BUNNY_STORAGE_ACCESS_KEY,
  BUNNY_PULL_ZONE_HOSTNAME,
} = process.env;

const bunnyAxios = axios.create({
  baseURL: `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE_NAME}/`,
  headers: {
    AccessKey: BUNNY_STORAGE_ACCESS_KEY,
    "Content-Type": "application/octet-stream",
  },
});

const putFileToBunny = async (localFilePath, remoteFullPath) => {
  const fileStream = fsSync.createReadStream(localFilePath);
  await bunnyAxios.put(remoteFullPath, fileStream, {
    headers: {
      "Content-Length": (await fs.stat(localFilePath)).size,
    },
  });
};

/**
 * "Умный" загрузчик, который может принимать объект файла, URL-строку или строку с локальным путем.
 * @param {object|string} source - Объект файла от express-fileupload, строка с URL или строка с локальным путем.
 * @param {string} remoteFolder - Папка в хранилище Bunny (e.g., 'songs/images').
 * @returns {Promise<{url: string, path: string}>}
 */
export const uploadToBunny = async (source, remoteFolder) => {
  let localFilePath;
  let originalFileName;
  let isTempDownload = false; // Флаг для временных файлов, которые нужно удалить

  try {
    if (typeof source === "string") {
      // ИСТОЧНИК - СТРОКА. Проверяем, URL это или локальный путь.
      if (source.startsWith("http://") || source.startsWith("https://")) {
        // ЭТО URL, скачиваем его.
        console.log(`[Bunny] Downloading from URL: ${source}`);
        const response = await axios.get(source, { responseType: "stream" });

        const urlPath = new URL(source).pathname;
        const extension = path.extname(urlPath) || ".jpg";

        originalFileName = `${uuidv4()}${extension}`;
        localFilePath = path.join(os.tmpdir(), originalFileName);
        isTempDownload = true; // Помечаем для последующего удаления

        const writer = fsSync.createWriteStream(localFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });
        console.log(
          `[Bunny] File downloaded to temporary path: ${localFilePath}`
        );
      } else {
        // ЭТО ЛОКАЛЬНЫЙ ПУТЬ В ВИДЕ СТРОКИ.
        console.log(`[Bunny] Using local file path: ${source}`);
        localFilePath = source;
        originalFileName = path.basename(source);
      }
    } else if (source && source.tempFilePath) {
      // ИСТОЧНИК - ОБЪЕКТ ФАЙЛА от express-fileupload.
      localFilePath = source.tempFilePath;
      originalFileName = source.name;
    } else {
      throw new Error(
        "Invalid source for upload. Must be a file object, local path string, or URL string."
      );
    }

    const remoteFileName = `${uuidv4()}${path.extname(originalFileName)}`;
    const fullRemotePath = path
      .join(remoteFolder, remoteFileName)
      .replace(/\\/g, "/");

    await putFileToBunny(localFilePath, fullRemotePath);

    const fileUrl = `${BUNNY_PULL_ZONE_HOSTNAME}/${fullRemotePath}`;
    console.log(`[Bunny] File uploaded successfully: ${fileUrl}`);

    return {
      url: fileUrl,
      path: fullRemotePath,
    };
  } catch (error) {
    console.error(
      `[Bunny] Smart uploader failed for source:`,
      source,
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to upload file to Bunny.net");
  } finally {
    // Удаляем временный файл, ТОЛЬКО если мы его сами скачали.
    if (isTempDownload && localFilePath) {
      try {
        await fs.unlink(localFilePath);
        console.log(
          `[Bunny] Temporary downloaded file deleted: ${localFilePath}`
        );
      } catch (cleanupError) {
        console.error(
          `[Bunny] Failed to delete temporary file ${localFilePath}:`,
          cleanupError
        );
      }
    }
  }
};

export const deleteFromBunny = async (remoteFilePath) => {
  if (!remoteFilePath) {
    console.warn("[Bunny] No remote file path provided. Skipping deletion.");
    return;
  }
  try {
    console.log(`[Bunny] Deleting ${remoteFilePath}...`);
    await bunnyAxios.delete(remoteFilePath);
    console.log(`[Bunny] Successfully deleted ${remoteFilePath}.`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.warn(
        `[Bunny] Resource ${remoteFilePath} was not found, considering it deleted.`
      );
    } else {
      console.error(
        `[Bunny] Error deleting ${remoteFilePath}:`,
        error.response ? error.response.data : error.message
      );
    }
  }
};
export const getPathFromUrl = (url) => {
  if (!url || !url.startsWith(`${BUNNY_PULL_ZONE_HOSTNAME}`)) {
    return null;
  }
  return url.replace(`${BUNNY_PULL_ZONE_HOSTNAME}/`, "");
};
