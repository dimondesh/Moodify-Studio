import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import { clerkMiddleware } from '@clerk/express'
import userRoutes from './routes/user.route.js';
import adminRoutes from './routes/admin.route.js';
import authRoutes from './routes/auth.route.js';
import songRoutes from './routes/song.route.js';
import albumRoutes from './routes/album.route.js';
import statsRoutes from './routes/stat.route.js';
import fileUpload from 'express-fileupload';
import path from 'path';
import { log } from 'console';


dotenv.config();



const PORT = process.env.PORT || 5000;
const app = express();

const __dirname = path.resolve();

app.use(clerkMiddleware());


app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, 'temp'),
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    
}));

const jsonParser = express.json();
app.use(jsonParser);

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statsRoutes);


app.use((err, req, res, next) => { 
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    });
});


app.listen(PORT, () => {
    connectDB();
    console.log('Server is running on port 5000');
});