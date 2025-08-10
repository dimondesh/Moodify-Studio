// frontend/src/lib/offline-db.ts

import { openDB, DBSchema, IDBPDatabase, StoreNames } from "idb";
import type { Song, Album, Playlist, Mix } from "@/types";

const DB_NAME = "MoodifyOfflineDB";
const DB_VERSION = 1;

interface MoodifyDB extends DBSchema {
  songs: { key: string; value: Song };
  albums: { key: string; value: Album & { songsData: Song[] } };
  playlists: { key: string; value: Playlist & { songsData: Song[] } };
  mixes: { key: string; value: Mix & { songsData: Song[] } };
}

let dbPromise: Promise<IDBPDatabase<MoodifyDB>>;

const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MoodifyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("songs")) {
          db.createObjectStore("songs", { keyPath: "_id" });
        }
        if (!db.objectStoreNames.contains("albums")) {
          db.createObjectStore("albums", { keyPath: "_id" });
        }
        if (!db.objectStoreNames.contains("playlists")) {
          db.createObjectStore("playlists", { keyPath: "_id" });
        }
        if (!db.objectStoreNames.contains("mixes")) {
          db.createObjectStore("mixes", { keyPath: "_id" });
        }
      },
    });
  }
  return dbPromise;
};

export const getDb = initDB;

export const saveItem = async <T extends StoreNames<MoodifyDB>>(
  storeName: T,
  item: MoodifyDB[T]["value"]
): Promise<void> => {
  const db = await getDb();
  await db.put(storeName, item);
};

export const getItem = async <T extends StoreNames<MoodifyDB>>(
  storeName: T,
  key: string
): Promise<MoodifyDB[T]["value"] | undefined> => {
  const db = await getDb();
  return db.get(storeName, key);
};

export const getAllKeys = async <T extends StoreNames<MoodifyDB>>(
  storeName: T
): Promise<IDBValidKey[]> => {
  const db = await getDb();
  return db.getAllKeys(storeName);
};

export const deleteItem = async <T extends StoreNames<MoodifyDB>>(
  storeName: T,
  key: string
): Promise<void> => {
  const db = await getDb();
  await db.delete(storeName, key);
};
