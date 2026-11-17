# 🛡️ UpdatePilot — Software Update Intelligence & Management Platform

UpdatePilot is a centralized software inventory and automated update management platform designed for Windows endpoints. It enables administrators and users to discover installed applications, identify outdated software via Windows Package Manager (`winget`), and execute verified updates remotely through a secure web dashboard.

## 🏗️ System Architecture

The platform consists of three core components:
1. **Frontend Dashboard (`Next.js` + `Tailwind CSS`):** Web interface for device pairing, application inventory filtering, update confirmation workflows, and audit log tracking.
2. **Backend API (`Node.js` + `Express` + `PostgreSQL` + `Prisma ORM`):** RESTful API managing JWT user authentication, SHA-256 hashed agent tokens, job queues (`ScanJob`, `UpdateJob`), and audit trails.
3. **Windows Desktop Agent (`Node.js` + `TypeScript`):** Background service that polls the backend, executes `winget list` and `winget upgrade`, and reports post-update verification results.

## 🚀 Local Setup & Execution Guide

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev

### 2.Frontend Setup
cd frontend
npm install
npm run dev

### 3.Windows Agent Setup
cd agent
npm install
# Pair device from Web Dashboard -> Agent Setup to generate token
npm start