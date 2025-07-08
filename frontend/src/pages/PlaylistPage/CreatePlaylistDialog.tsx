// frontend/src/pages/PlaylistPage/CreatePlaylistDialog.tsx

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import toast from "react-hot-toast";
import { Playlist } from "../../types"; // Убедитесь, что тип Playlist импортирован

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Playlist | null; // Опциональный пропс для редактирования существующего плейлиста
  onSuccess?: () => void; // Колбэк после успешного создания/обновления
}

export const CreatePlaylistDialog: React.FC<CreatePlaylistDialogProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  ); // Исправлено: убедитесь, что description является строкой
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialData?.imageUrl || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createPlaylist, updatePlaylist, isLoading } = usePlaylistStore(); // Используем isLoading из стора для общей индикации

  useEffect(() => {
    // Сброс формы и обновление начальных данных при открытии диалога или изменении initialData
    if (initialData) {
      setTitle(initialData.title || ""); // Добавлено || "" для безопасности, хотя title обычно обязателен
      setDescription(initialData.description || ""); // ИСПРАВЛЕНО: Безопасный доступ к description
      setIsPublic(initialData.isPublic);
      setImagePreviewUrl(initialData.imageUrl || null);
      setImageFile(null); // Очищаем файловый ввод при редактировании существующего плейлиста
    } else {
      // Очистка формы для режима создания
      setTitle("");
      setDescription("");
      setIsPublic(false);
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  }, [initialData, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file)); // Создаем URL для предварительного просмотра
    } else {
      setImageFile(null);
      setImagePreviewUrl(initialData?.imageUrl || null); // Возвращаемся к начальному изображению, если очищено
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!title.trim()) {
      toast.error("Название плейлиста не может быть пустым.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (initialData) {
        // Редактирование существующего плейлиста
        await updatePlaylist(
          initialData._id,
          title,
          description,
          isPublic,
          imageFile
        );
        toast.success("Плейлист успешно обновлен!");
      } else {
        // Создание нового плейлиста
        await createPlaylist(title, description, isPublic, imageFile);
        toast.success("Плейлист успешно создан!");
      }
      onClose(); // Закрываем диалог при успехе
      if (onSuccess) {
        onSuccess(); // Вызываем колбэк успеха
      }
    } catch (error) {
      // Обработка ошибок уже есть в usePlaylistStore с помощью toast
      console.error("Операция с плейлистом не удалась:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = initialData
    ? "Редактировать плейлист"
    : "Создать новый плейлист";
  const submitButtonText = initialData
    ? "Сохранить изменения"
    : "Создать плейлист";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {initialData
              ? "Внесите изменения в свой плейлист."
              : "Введите данные для нового плейлиста."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-white">
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
              Описание
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 bg-zinc-800 text-white border-zinc-700 focus:ring-green-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isPublic" className="text-right text-white">
              Публичный
            </Label>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image" className="text-right text-white">
              Обложка
            </Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="col-span-3 bg-zinc-800 text-white border-zinc-700 file:text-white file:bg-zinc-700 file:border-none hover:file:bg-zinc-600"
            />
          </div>
          {imagePreviewUrl && (
            <div className="flex justify-center">
              <img
                src={imagePreviewUrl}
                alt="Предпросмотр обложки"
                className="max-w-[150px] max-h-[150px] rounded-md object-cover"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isSubmitting
                ? initialData
                  ? "Сохранение..."
                  : "Создание..."
                : submitButtonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
