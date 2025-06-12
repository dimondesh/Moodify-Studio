import { User } from "../models/user.model.js";


export const authCallback = async (req, res, next) => {
    try {
        const { id, firstName, lastName, imageUrl } = req.body;

        const user = await User.findOne({ clerkId: id });
        
        if (!user) {
            const newUser = await User.create({
                fullName: `${firstName} ${lastName}`,
                imageUrl,
                clerkId: id,
            });
            return res.status(200).json({success: true});
        }
    } catch (error) {
        console.error("Error in /callback route:", error);
        next(error);
        
    }
}