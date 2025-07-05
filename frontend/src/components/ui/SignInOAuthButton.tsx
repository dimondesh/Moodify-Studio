import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { Button } from "./button";
import { useNavigate } from "react-router-dom";

const SignInOAuthButton = () => {
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Минимальная рабочая конфигурация
      const result = await signInWithPopup(auth, provider);

      // Простая проверка успешного входа
      if (result?.user?.uid) {
        navigate("/"); // Перенаправляем на главную после входа
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <Button
      onClick={signInWithGoogle}
      variant="secondary"
      className="w-full text-white border-zinc-200 h-11"
    >
      Continue with Google
    </Button>
  );
};

export default SignInOAuthButton;
