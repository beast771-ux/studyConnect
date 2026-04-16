# StudyConnect (MERN + Socket.IO)

StudyConnect is a full-stack academic collaboration platform built from your report requirements:

- Real-time group chat
- Topic-based discussions
- Message categories (`doubt`, `explanation`, `resource`, `announcement`)
- Doubt resolution with accepted answers
- Pinned messages/announcements
- Shared resource repository
- Shared resource repository (links + device file uploads)
- Role-based access (`admin` / `member`)
- Weekly activity summaries
- Group calendar/events
- Profile view/edit (name, bio, department, semester)
- One-click audio call room launch for study groups

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express + Socket.IO
- Database layer: Mongo-ready (`MONGODB_URI`) with in-memory fallback for local demo runs
- Auth/Security: JWT + bcrypt

## Run locally

```bash
cd studyconnect-app
npm install
cp server/.env.example server/.env
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:8000`
- API health: `http://localhost:8000/api/health`

If `MONGO_URI` (or `MONGODB_URI`) is empty or unavailable, the app automatically runs with in-memory persistence so everything still works.
