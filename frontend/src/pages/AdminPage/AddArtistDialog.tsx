/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea"; // Если нужно поле для биографии
import { useMusicStore } from "../../stores/useMusicStore"; // Чтобы обновить список артистов после добавления

const AddArtistDialog = () => {
  const [artistDialogOpen, setArtistDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fetchArtists } = useMusicStore(); // Для обновления списка

  const [newArtist, setNewArtist] = useState({
    name: "",
    bio: "", // Добавлено поле для биографии
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      if (!imageFile) {
        return toast.error("Please upload an image for the artist.");
      }

      const formData = new FormData();
      formData.append("name", newArtist.name);
      formData.append("bio", newArtist.bio); // Добавляем биографию
      formData.append("imageFile", imageFile);

      await axiosInstance.post("/admin/artists", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setNewArtist({ name: "", bio: "" });
      setImageFile(null);
      setArtistDialogOpen(false);
      toast.success("Artist created successfully!");
      fetchArtists(); // Обновляем список артистов
    } catch (error: any) {
      toast.error(
        "Failed to create artist: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={artistDialogOpen} onOpenChange={setArtistDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Artist
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-200">Add New Artist</DialogTitle>
          <DialogDescription>
            Add a new artist to your music collection
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-zinc-200">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <div
            className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center">
              <div className="p-3 bg-zinc-800 rounded-full inline-block mb-2">
                <Upload className="h-6 w-6 text-zinc-400" />
              </div>
              <div className="text-sm text-zinc-400 mb-2">
                {imageFile ? imageFile.name : "Upload artist image"}
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                Choose File
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Artist Name</label>
            <Input
              value={newArtist.name}
              onChange={(e) =>
                setNewArtist({ ...newArtist, name: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700"
              placeholder="Enter artist name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Biography (Optional)</label>
            <Textarea
              value={newArtist.bio}
              onChange={(e) =>
                setNewArtist({ ...newArtist, bio: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700 resize-y"
              placeholder="Enter artist biography"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setArtistDialogOpen(false)}
            disabled={isLoading}
            className="text-zinc-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-200"
            disabled={isLoading || !imageFile || !newArtist.name}
          >
            {isLoading ? "Creating..." : "Add Artist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddArtistDialog;
