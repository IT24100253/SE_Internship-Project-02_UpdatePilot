# UpdatePilot — Software Update Intelligence & Management Platform

A Windows-first full-stack software update intelligence platform combining a **Next.js** web dashboard, a **Node.js/Express + PostgreSQL (Prisma)** backend API, and a local **Windows Agent (WinGet)** to discover installed applications, detect updates, and execute user-confirmed upgrades safely[cite: 5, 7, 9].

## Live Deployment
- **Web Dashboard:** https://se-internship-project-02-update-pil.vercel.app

## Local Setup Instructions
1. **Backend:** `cd backend && cp .env.example .env && npm install && npx prisma migrate dev && npm run dev`
2. **Frontend:** `cd frontend && cp .env.example .env.local && npm install && npm run dev`
3. **Windows Agent:** `cd agent && npm install && npm start`

## Running Automated Tests
```bash
cd backend
node --test tests/updatepilot.test.js
```

## Security & Known Limitations
- **Command Allowlisting:** Only validated package identifiers (`[a-zA-Z0-9._-]+`) are passed to `winget upgrade --id`[cite: 9, 10].
- **User Confirmation:** No silent or unattended updates are executed without explicit user confirmation[cite: 8, 10].
- **Limitations:** Supports Windows 10/11 environments with WinGet installed; applications not indexed in WinGet are flagged as `UNMATCHED`[cite: 7, 14].