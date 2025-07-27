import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { Button } from "./button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // <-- ИМПОРТ

const SignInOAuthButton = () => {
  const { t } = useTranslation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      if (result?.user?.uid) {
        navigate("/");
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <Button
      onClick={signInWithGoogle}
      variant="secondary"
      className="w-30 md:w-40 text-white border-zinc-200 h-10"
    >
      <p className="text-xs">{t("topbar.login")}</p>
    </Button>
  );
};

export default SignInOAuthButton;
