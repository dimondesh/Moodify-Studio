import { firebaseAdmin } from "../lib/firebase.js";
import { User } from "../models/user.model.js";

// Этот middleware пытается идентифицировать пользователя, но не блокирует запрос, если его нет.
export const identifyUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    // Если токена нет, просто идем дальше. req.user останется undefined.
    if (!token) {
      return next();
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decodedToken.uid }).lean();

    // Если пользователь найден в нашей БД, добавляем его в запрос
    if (user) {
      req.user = {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
      };
    }
  } catch (error) {
    // Если токен невалиден или истек, мы не выдаем ошибку, а просто игнорируем его.
    console.log(
      "IdentifyUser Middleware: Could not verify token, proceeding as guest.",
      error.message
    );
  }

  // В любом случае переходим к следующему шагу
  next();
};
