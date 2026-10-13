# NovaBoard — Real-Time Collaborative Kanban Board (MERN + Socket.io)

NovaBoard is a high-performance, real-time collaborative Kanban project management board inspired by modern linear/trello-style workflows. Built using a pure JavaScript MERN stack with Socket.io, Redux Toolkit, and `@dnd-kit`.

---

## 🚀 Key Highlights & Architectural Features

1. **Pixel-Accurate Modern UI**:
   - Soft mint-green app background (`#C5DBD3`) with clean panel layout (`#EFF6F4`).
   - Distinctive teal brand primary (`#0F9488`), warm yellow accent (`#FBD157`), and pastel column tags.
   - Fluid micro-interactions, drag animations, and responsive side navigation.

2. **Real-Time Collaboration via Socket.io**:
   - **Live Task Mutations**: Instant card movement, editing, creation, and deletion broadcasted to all active board viewers.
   - **Live Presence**: Online/offline avatars with green indicators that update as team members join and leave.
   - **Live Typing Indicators**: Real-time indication when another user is modifying a task title or description.
   - **Conflict Handling & Versioning**: Optimistic concurrency control using monotonic task/board versions.

3. **Drag & Drop with Fractional Indexing**:
   - Powered by `@dnd-kit/core` and `@dnd-kit/sortable`.
   - Fractional numeric ordering ensures $O(1)$ reordering without rewriting indices for the entire column.
   - Automatic rebalancing threshold to maintain numeric precision.

4. **Robust Authentication & Security**:
   - JWT access & refresh tokens stored in secure, `httpOnly` cookies.
   - Axios auto-refresh interceptor for seamless session renewals on token expiry.
   - Board role-based access control (`owner`, `admin`, `member`, `viewer`).

---

## 🛠️ Tech Stack

### Frontend (`/frontend`)
- **Core**: React 18 (Pure JavaScript, Vite)
- **Styling**: Tailwind CSS + Custom Design Tokens (Plus Jakarta Sans & Inter typography)
- **State Management**: Redux Toolkit (Normalized task state, presence, filters, offline queue)
- **Server Cache**: TanStack Query (React Query v5)
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **Real-Time**: `socket.io-client`
- **Routing & Forms**: React Router v6, React Hook Form
- **Data Visualization**: Recharts (Analytics and distribution charts)
- **Icons & Notifications**: `lucide-react`, `react-hot-toast`

### Backend (`/backend`)
- **Runtime**: Node.js & Express
- **Database**: MongoDB & Mongoose
- **Websockets**: Socket.io with JWT authentication middleware
- **Security**: bcryptjs, CORS, httpOnly cookies
- **File Uploads**: Multer (task attachments)

---

## 📋 Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
- [MongoDB](https://www.mongodb.com/) running locally on port `27017` or via Docker.

If using Docker:
```bash
# Start MongoDB in the background
docker-compose up -d
```

---

### 2. Backend Setup

```bash
cd backend

# Install backend dependencies (if not already installed)
npm install

# (Optional) Verify environment variables
# Check .env (defaults to PORT=5000, MONGO_URI=mongodb://127.0.0.1:27017/novaboard)

# Seed the database with demo users, the screenshot board, and 11 tasks
npm run seed

# Start backend server in development mode
npm run dev
```

The backend server runs on **`http://localhost:5000`**.

---

### 3. Frontend Setup

In a new terminal window:

```bash
cd frontend

# Install frontend dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```

The frontend application will be live at **`http://localhost:5173`**.

---

## 👥 Demo Accounts

The seed script creates 5 demo accounts with pre-populated tasks matching the project specification:

| Name | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **John Doe** | `john@novaboard.dev` | `password123` | **Owner** |
| **Priya Patel** | `priya@novaboard.dev` | `password123` | **Admin** |
| **Alex Rivera** | `alex@novaboard.dev` | `password123` | **Member** |
| **Maria Garcia** | `maria@novaboard.dev` | `password123` | **Member** |
| **Sam Chen** | `sam@novaboard.dev` | `password123` | **Viewer** |

*Tip: On the Login page (`/login`), click the "Fill Demo Credentials" button to autofill John's login instantly.*

---

## 🔄 Two-Browser Real-Time Sync Testing Script

To verify real-time collaboration across multiple active clients:

1. **Window 1 (Owner)**:
   - Open Chrome (or your regular browser) at `http://localhost:5173`.
   - Log in as `john@novaboard.dev` (`password123`).
   - Open the **"NovaBoard Mobile App"** board.

2. **Window 2 (Member)**:
   - Open an **Incognito / Private Window** (or a different browser like Firefox/Edge) at `http://localhost:5173`.
   - Log in as `priya@novaboard.dev` (`password123`).
   - Open the same board.

3. **Verify Features**:
   - **Live Presence**: Observe the green online indicators next to John and Priya in the top header.
   - **Real-Time Drag & Drop**: Drag a card in Window 1 (e.g., *“Design Notification Banner”* from **To Do** to **In Progress**). Window 2 will reflect the card move smoothly without reloading.
   - **Live Card Editing & Typing**: Click a card in Window 1 and type in the description. Window 2 shows a typing badge on that card.
   - **Live Comments**: Post a comment from Priya in Window 2; John's modal in Window 1 displays the comment instantly.
   - **Filter & Search**: Test quick search, priority filters, and tabs (Board, Overview Analytics, List view).

---

## 📡 API Reference

### Auth (`/api/auth`)
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Authenticate and receive httpOnly cookies
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Clear session cookies
- `GET /api/auth/me` — Get authenticated user profile

### Boards (`/api/boards`)
- `GET /api/boards` — List user's boards
- `POST /api/boards` — Create board
- `GET /api/boards/:boardId` — Fetch board details, columns & tasks
- `PUT /api/boards/:boardId` — Update board meta
- `POST /api/boards/:boardId/invites` — Create invite link or email invite
- `GET /api/boards/:boardId/activities` — Activity log audit feed

### Tasks (`/api/boards/:boardId/tasks`)
- `POST /` — Create task
- `PUT /:taskId` — Update task (with version check)
- `PATCH /:taskId/move` — Move task between columns/positions
- `DELETE /:taskId` — Delete task
- `POST /:taskId/comments` — Add comment
- `POST /:taskId/attachments` — Upload file attachment

---

## 📂 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB connection
│   │   ├── middleware/      # Auth, boardAuth, multer upload, errorHandler
│   │   ├── models/          # User, Board, Task, Comment, Activity models
│   │   ├── routes/          # auth, boards, tasks endpoints
│   │   ├── services/        # Fractional positionService, activityService
│   │   ├── sockets/         # Socket.io room handlers & presence tracker
│   │   ├── app.js           # Express app setup & routes
│   │   ├── index.js         # HTTP + Socket server bootstrap
│   │   └── seed.js          # Demo seed script (matches screenshot)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── board/       # BoardHeader, BoardTabs, BoardView, KanbanColumn,
│   │   │   │                # OverviewView, ListView, InviteModal, ActivityPanel
│   │   │   ├── layout/      # AppLayout, Sidebar, TopBar
│   │   │   ├── tasks/       # SortableTaskCard, TaskCard, TaskModal
│   │   │   └── ui/          # Avatar, PriorityChip
│   │   ├── lib/             # Axios instance (api.js), socket client (socket.js)
│   │   ├── pages/           # LoginPage, RegisterPage, DashboardPage, BoardPage, InviteAcceptPage
│   │   ├── store/           # Redux slices (authSlice, boardSlice, uiSlice)
│   │   ├── App.jsx          # Route definitions
│   │   ├── index.css        # Tailwind directives & design system utilities
│   │   └── main.jsx         # App root wrapper
│   ├── .env.example
│   ├── tailwind.config.js   # Custom theme matching screenshot palette
│   ├── vite.config.js       # Vite configuration with API proxying
│   └── package.json
│
├── docker-compose.yml       # Local MongoDB container
└── README.md
```
# Appsico
