# CloudVault ☁️🔒

![CloudVault Dashboard](./frontend/dashboard.png)

A modern, high-performance, and secure cloud storage platform. CloudVault enables users to effortlessly store, organize, and share their files and folders with real-time virus scanning and secure sharing capabilities.

## ✨ Features

- **Resumable Chunked Uploads**: Large files are automatically split and uploaded in 10MB chunks with full pause, resume, cancel, and automatic network retry support.
- **Recursive Folder Uploads**: Upload entire directory structures directly. The system automatically creates matching nested folder paths and places files accordingly.
- **Interactive Drag & Drop**: Drop folders or multiple files directly onto the storage workspace grid to upload them recursively.
- **Range-Based Downloads & Streaming**: Supports HTTP range requests, enabling users to stream video/audio with seek capability and resume paused downloads.
- **Detailed Activity Logging**: Tracks and logs all user operations (uploads, deletes, logins) along with the exact file and folder names for admins.
- **Secure Storage & Sharing**: Share files and folders with other users seamlessly, managed via transfer requests and access control.
- **Security First**: Real-time integration with ClamAV daemon to scan every uploaded file/chunk for malware before final assembly.
- **Modern Auth & Glassy UI**: Fully JWT-secured sessions paired with a premium, responsive glassmorphism dark-theme dashboard.
- **Fully Containerized**: Ready to spin up in seconds with a single command via Docker Compose (Nginx reverse proxy, React Frontend, Node Backend, PostgreSQL Database, ClamAV).

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

### Installation & Deployment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Vaibhavthepro/Cloud-Storage.git
   cd Cloud-Storage
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory based on your setup. You will need variables for the PostgreSQL database, JWT secrets, etc.

3. **Spin up the containers:**
   CloudVault is fully containerized. Simply run the following command to build and start the entire stack:
   ```bash
   docker-compose up -d --build
   ```

4. **Access the application:**
   - **Frontend**: http://localhost
   - **Backend API**: http://localhost/api

## 🛠️ Technology Stack

**Frontend:**
- React (Vite)
- TypeScript
- Custom CSS (Glassmorphism design)
- Axios & React Router

**Backend:**
- Node.js & Express
- TypeScript
- Prisma ORM
- PostgreSQL
- ClamAV (Virus Scanning)
- Archiver (Zip streaming)
- JWT (Authentication)

## 🐳 Docker Services Overview

- `frontend`: The React UI served via an NGINX container.
- `backend`: The Express Node.js REST API.
- `db`: PostgreSQL database for all metadata and user accounts.
- `clamav`: Daemon for real-time virus/malware checking of file uploads.
- `proxy`: Main NGINX reverse proxy directing traffic to the frontend or backend appropriately.

## 📄 License

This project is open-source and available for use. 
