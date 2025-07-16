import Vibrant from "node-vibrant";
import { usePlayerStore } from "@/stores/usePlayerStore";

export const useDominantColor = () => {
  const setDominantColor = usePlayerStore((state) => state.setDominantColor);

  const extractColor = async (imageUrl: string) => {
    try {
      const palette = await Vibrant.from(imageUrl).getPalette();
      const dominant = palette.Vibrant?.getHex() || "#000000";
      setDominantColor(dominant);
    } catch (error) {
      console.error("Ошибка при извлечении цвета:", error);
    }
  };

  return { extractColor };
};
