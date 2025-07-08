import { firebaseAdmin } from "../lib/firebase.js";
import { User } from "../models/user.model.js";
import dotenv from "dotenv";
dotenv.config();
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

    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    console.log("User from DB:", user);

    if (!user) {
      console.error("User not found in DB for firebaseUid:", decodedToken.uid);
      return res.status(404).json({ error: "User not found" });
    }

    req.user = {
      id: user._id,
      firebaseUid: user.firebaseUid,
      email: decodedToken.email,
      isAdmin: process.env.ADMIN_EMAILS.split(",").includes(decodedToken.email),
    };
    console.log("req.user set in protectRoute:", req.user);

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    res
      .status(401)
      .json({ error: "Authentication failed", details: error.message });
  }
};
