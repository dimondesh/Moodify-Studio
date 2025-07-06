import { User } from "../models/user.model.js";
import { firebaseAdmin } from "../lib/firebase.js";

export const syncUserWithDb = async (req, res) => {
  console.log("Start user sync");

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    const { uid, email, name, picture } = decodedToken;

    if (!uid || !email) {
      return res.status(400).json({ error: "Token is missing UID or email" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid: uid },
      {
        email: email,
        fullName: name || email,
        imageUrl: picture || null,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    if (updatedUser) {
      console.log(
        `✅ User synced: ${updatedUser.email} with MongoDB ID: ${updatedUser._id}`
      );
    } else {
      console.error("Failed to find or create user with findOneAndUpdate");
      return res.status(500).json({ error: "Failed to sync user" });
    }

    res.status(200).json({
      message: "User synced successfully",
      user: {
        _id: updatedUser._id,
        firebaseUid: updatedUser.firebaseUid,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        imageUrl: updatedUser.imageUrl,
      },
    });
  } catch (error) {
    console.error("❌ User sync error caught on backend:", error);
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
