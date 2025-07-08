// frontend/src/components/playlists/EditPlaylistDialog.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; // Убедитесь, что у вас есть Textarea
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { Playlist } from "@/types"; // Импортируем тип Playlist
import toast from "react-hot-toast";

interface EditPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null; // Текущий плейлист для редактирования
  onSuccess: () => void; // Добавляем onSuccess пропс
}

export const EditPlaylistDialog: React.FC<EditPlaylistDialogProps> = ({
  isOpen,
  onClose,
  playlist,
  onSuccess, // Принимаем onSuccess
}) => {
  const [title, setTitle] = useState(playlist?.title || "");
  const [description, setDescription] = useState(playlist?.description || "");
  // Используем оператор нулевого слияния (??) для isPublic, чтобы корректно обрабатывать undefined/null
  const [isPublic, setIsPublic] = useState(playlist?.isPublic ?? false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    playlist?.imageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { updatePlaylist, isLoading } = usePlaylistStore();

  // Обновление состояния формы при изменении пропса playlist
  useEffect(() => {
    if (playlist) {
      setTitle(playlist.title);
      setDescription(playlist.description || "");
      setIsPublic(playlist.isPublic ?? false); // Убедитесь, что обрабатывает undefined/null
      setImageFile(null); // Сбросить выбранный файл при смене плейлиста
      setImagePreviewUrl(playlist.imageUrl || null);
    } else {
      // Сбросить форму, если плейлист стал null (например, при создании нового)
      setTitle("");
      setDescription("");
      setIsPublic(false);
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  }, [playlist]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file)); // Для предпросмотра
    } else {
      setImageFile(null);
      setImagePreviewUrl(playlist?.imageUrl || null); // Вернуть к исходному, если файл отменен
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!playlist) {
      toast.error("Не выбран плейлист для редактирования.");
      return;
    }
    if (!title.trim()) {
      toast.error("Название плейлиста не может быть пустым.");
      return;
    }

    try {
      const updated = await updatePlaylist(
        playlist._id,
        title,
        description,
        isPublic,
        imageFile
      );
      if (updated) {
        toast.success("Плейлист успешно обновлен!");
        onSuccess(); // Вызываем onSuccess для обновления данных в родительском компоненте
        onClose(); // Закрыть диалог
      }
    } catch (error) {
      // Ошибка уже обрабатывается в usePlaylistStore и показывается тост
      console.error("Ошибка при обновлении плейлиста в диалоге:", error);
    }
  }, [
    playlist,
    title,
    description,
    isPublic,
    imageFile,
    updatePlaylist,
    onClose,
    onSuccess, // Добавляем onSuccess в зависимости
  ]);

  const handleClose = useCallback(() => {
    // Сброс состояния формы к исходным значениям плейлиста при закрытии без сохранения
    if (playlist) {
      setTitle(playlist.title);
      setDescription(playlist.description || "");
      setIsPublic(playlist.isPublic ?? false);
      setImageFile(null);
      setImagePreviewUrl(playlist.imageUrl || null);
    } else {
      setTitle("");
      setDescription("");
      setIsPublic(false);
      setImageFile(null);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Очистить input файла
    }
    onClose();
  }, [onClose, playlist]);

  if (!playlist) {
    return null; // Не рендерим диалог, если нет плейлиста для редактирования
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-700">
        {" "}
        {/* Добавлены стили */}
        <DialogHeader>
          <DialogTitle className="text-white">
            Редактировать плейлист
          </DialogTitle>{" "}
          {/* Перевод */}
          <DialogDescription className="text-zinc-400">
            {" "}
            {/* Перевод */}
            Внесите изменения в свой плейлист здесь. Нажмите сохранить, когда
            закончите.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-white">
              {" "}
              {/* Перевод и цвет текста */}
              Название
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3 bg-zinc-800 text-white border-zinc-700 focus:ring-green-500"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right text-white">
              {" "}
              {/* Перевод и цвет текста */}
              Описание
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 min-h-[80px] bg-zinc-800 text-white border-zinc-700 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="Краткое описание плейлиста" // Добавлен placeholder
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image" className="text-right text-white">
              {" "}
              {/* Перевод и цвет текста */}
              Обложка
            </Label>
            <div className="col-span-3">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file:text-sm file:font-medium file:cursor-pointer mb-2 bg-zinc-800 text-white border-zinc-700"
                ref={fileInputRef}
              />
              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="Предпросмотр обложки" // Перевод
                  className="w-24 h-24 object-cover rounded-md mt-2" // Увеличен отступ
                />
              )}
            </div>
          </div>
          {/* ИСПРАВЛЕНО: Для Switch используем flex, а не grid-cols */}
          <div className="flex items-center justify-between col-span-full mt-2">
            <Label htmlFor="public" className="text-white">
              {" "}
              {/* Перевод и цвет текста */}
              Публичный
            </Label>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="data-[state=checked]:bg-green-500" // Стили shadcn
            />
          </div>
        </div>
        <DialogFooter className="mt-6">
          {" "}
          {/* Увеличен отступ */}
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isLoading}
            className="bg-zinc-700 text-white hover:bg-zinc-600 border-none"
          >
            {" "}
            {/* Добавлены стили */}
            Отмена {/* Перевод */}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {" "}
            {/* Добавлены стили */}
            {isLoading ? "Сохранение..." : "Сохранить изменения"}{" "}
            {/* Перевод */}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
