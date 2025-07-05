import { User } from "../models/user.model.js";
import { firebaseAdmin } from "../lib/firebase.js";

// Улучшенная и более безопасная версия authCallback
export const syncUserWithDb = async (req, res) => {
  console.log("Start user sync");

  try {
    // Получаем токен из заголовков, как в protectRoute
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    // Верифицируем токен
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    const { uid, email, name, picture } = decodedToken;

    if (!uid || !email) {
      return res.status(400).json({ error: "Token is missing UID or email" });
    }

    // Проверяем, является ли пользователь админом
    // Внимание: isAdmin лучше не отправлять как часть объекта user,
    // а обрабатывать отдельно через checkAdminStatus,
    // или если это часть модели user, то убедитесь, что она есть.
    // Если вы хотите, чтобы `isAdmin` был в `user` объекте на фронтенде,
    // он должен быть в вашей MongoDB модели `User`.
    const isAdmin = email === process.env.ADMIN_EMAIL; // This is fine for direct response, but not for nested `user` if not in model

    // Ищем пользователя в нашей БД
    let user = await User.findOne({ firebaseUid: uid });

    if (user) {
      // Если пользователь найден, можно обновить данные, если они изменились
      console.log("User found, updating data...");
      user.fullName = name || user.fullName;
      user.imageUrl = picture || user.imageUrl;
      // Если isAdmin является полем в вашей модели User, обновите его здесь:
      // user.isAdmin = isAdmin; // <--- uncomment if isAdmin is a field in your User model
      await user.save();
    } else {
      // Если пользователь не найден, создаем нового
      console.log("User not found, creating new user...");
      user = new User({
        firebaseUid: uid,
        email: email,
        fullName: name || "New User",
        imageUrl: picture || "",
        // isAdmin: isAdmin, // <--- uncomment if isAdmin is a field in your User model
      });
      await user.save();
      console.log("New user created successfully");
    }

    // 💡 ИСПРАВЛЕНИЕ: Оборачиваем данные пользователя в объект 'user'
    // Это соответствует тому, что ожидает ваш фронтенд useAuthStore.ts
    res.status(200).json({
      message: "User synced successfully", // Опционально, но полезно
      user: {
        // <-- Обернуто в объект 'user'
        _id: user._id, // Используем _id, а не id
        firebaseUid: user.firebaseUid,
        email: user.email,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        // Если isAdmin является полем в вашей модели User, можете добавить его сюда:
        // isAdmin: user.isAdmin,
      },
      // isAdmin: isAdmin, // Можете отправить isAdmin отдельно, если не хотите его вложенным в user
    });
  } catch (error) {
    console.error("User sync error:", error);
    if (error.code === "auth/id-token-expired") {
      return res
        .status(401)
        .json({ error: "Token expired, please log in again." });
    }
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};
