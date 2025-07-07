# Moodify - Your Personal Music Streaming Service

![Moodify Logo](https://github.com/dimondesh/Moodify/blob/main/frontend/public/Preview.png) Moodify is a modern, full-featured music streaming service designed to help you enjoy your favorite music, organize your collection, and discover new tracks. This project serves as a personal portfolio piece, showcasing a complete web application development cycle.

## 🚀 Key Features

* **Music Library:** Browse and listen to an extensive collection of songs and albums.
* **Personal Collection:** Add your favorite tracks to your personal liked songs collection.
* **Playback Control:** An intuitive player with functions for play, pause, track skipping, repeat (single or playlist), shuffle, and volume control.
* **Responsive Design:** Enjoy your music seamlessly across all devices, from desktop computers to mobile phones.
* **User Authentication:** Secure login and account management powered by Firebase.
* **Song Uploads:** Users can upload their own tracks (backend functionality).
* **Activity Statuses:** Monitor the real-time activity status of other users using Socket.IO.
* **Search Functionality:** Quickly find songs by title or artist.

## 🛠️ Technologies Used

The Moodify project is built using a modern technology stack:

**Frontend:**
* **React:** A popular JavaScript library for building user interfaces.
* **TypeScript:** A superset of JavaScript that adds static typing for improved code reliability and quality.
* **Vite:** A fast and lightweight build tool for modern web projects.
* **Tailwind CSS:** A utility-first CSS framework for rapid and flexible styling.
* **Zustand:** A lightweight and convenient state management solution for React applications.
* **React Router DOM:** For declarative routing in React applications.
* **Shadcn/ui:** A collection of reusable UI components built with Radix UI and Tailwind CSS.
* **Axios:** An HTTP client for making API requests.
* **Socket.IO Client:** For real-time bidirectional event-based communication.

**Backend:**
* **Node.js:** A JavaScript runtime environment for server-side applications.
* **Express.js:** A fast, unopinionated, minimalist web framework for Node.js.
* **MongoDB:** A NoSQL database for storing application data.
* **Mongoose:** An ODM (Object Data Modeling) library for MongoDB and Node.js.
* **Firebase Admin SDK:** For verifying user tokens and integrating with Firebase Authentication.
* **Socket.IO:** For real-time communication between the client and server.
* **Express Fileupload:** Middleware for handling file uploads.
* **Sharp:** (Planned/Used) A high-performance Node.js image processing library (for resizing and cropping album covers).
* **Cloudinary:** (Planned/Used) A cloud-based service for storing and managing media files (images and audio).

**Database & Authentication:**
* **MongoDB Atlas:** Cloud-hosted MongoDB database service.
* **Firebase Authentication:** A service for user management and authentication.

**Deployment:**
* **Vercel:** For deploying the frontend application.
* **Render:** For deploying the backend server.

## 🚀 Getting Started Locally

To get the Moodify project up and running on your local machine, follow these steps:

### 1. Clone the repository

```bash
git clone [https://github.com/dimondesh/Moodify.git](https://github.com/dimondesh/Moodify.git)
cd Moodify
