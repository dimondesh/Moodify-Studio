import { firebaseAdmin } from "../lib/firebase.js";
import { User } from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  console.log("ProtectRoute middleware triggered");

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.error("No token provided");
      return res.status(401).json({ error: "Token required" });
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    console.log("Decoded token:", decodedToken);

    // Ищем пользователя по firebaseUid, который пришел из декодированного токена
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    console.log("User from DB:", user);

    if (!user) {
      console.error("User not found in DB for firebaseUid:", decodedToken.uid);
      return res.status(404).json({ error: "User not found" });
    }

    // Прикрепляем к объекту запроса данные пользователя из вашей MongoDB
    // Это будет доступно в последующих контроллерах как req.user
    req.user = {
      id: user._id, // MongoDB _id
      firebaseUid: user.firebaseUid,
    };

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    res
      .status(401)
      .json({ error: "Authentication failed", details: error.message });
  }
};
