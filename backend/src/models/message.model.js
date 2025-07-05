import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: String, // Этот String должен содержать MongoDB _id
      required: true,
    },
    receiverId: {
      type: String, // Этот String должен содержать MongoDB _id
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
