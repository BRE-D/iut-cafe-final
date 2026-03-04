<div align="center">

<img src="public/iut-logo.png" alt="IUT Logo" width="100"/>

# 🕌 IUT Cafeteria
### Smart Iftar Ordering System

**DevSprint 2026 · CSE Department · Islamic University of Technology**

[![TypeScript](https://img.shields.io/badge/TypeScript-90%25-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)

---

*A real-time, microservices-powered cafeteria ordering platform built for Ramadan Iftar meal distribution at IUT.*

</div>

---

## ✨ Features

### 🎓 Student Portal
- **Iftar Box Menu** — 7 curated meal packages with full contents listed per box
- **Cart-based ordering** — add multiple boxes, adjust quantities, confirm in one click
- **Live order tracking** — real-time status pipeline: *Pending → Stock Verified → In Kitchen → Ready*
- **Order history** — scoped per account, persists across sessions
- **Iftar countdown timer** — live countdown to Dhaka Iftar, updated every second
- **Division-wise Iftar times** — scrolling ticker for all 8 Bangladesh divisions
- **Quran verse of the moment** — Arabic + English translation, refreshes after each order

### 🔧 Admin Portal
- **Separate login** at `/admin` with role-isolated credentials
- **Stock Management** — view live inventory for all 7 boxes, add stock with one click
- **Order Dashboard** — monitor all incoming orders in real time

### 🎨 UI / UX
- **Light & Dark mode** — pastel IUT greens (light) and deep dark with bright green accents (dark), preference saved to localStorage
- **Adaptive IUT logo** — hand-crafted SVG that switches colours with the theme
- **Fully responsive** — works on mobile, tablet, and desktop
- **Mock mode fallback** — runs completely offline with no backend; order tracking simulates progression automatically

---

## 🏗️ Architecture

```
  [React SPA — Vite + TypeScript]
           │
           │ HTTP / SSE
           ▼
    [API Gateway :3000]
     │         │         │
     ▼         ▼         ▼
[Identity  [Stock    [Notification
 Provider   Service    Hub :3003]
  :3001]    :3002]        ▲
                          │ POST /notify
                    [Stock Service]
```

The backend is split into **4 independent microservices**, each running in its own process and Docker container:

| Service | Port | Responsibility |
|---|---|---|
| **API Gateway** | 3000 | Single entry point, JWT verification, request routing |
| **Identity Provider** | 3001 | Login, JWT issuance, credential validation |
| **Stock Service** | 3002 | Menu inventory, order placement, optimistic locking |
| **Notification Hub** | 3003 | SSE stream management, real-time status fanout |

---

## 🍱 Iftar Box Menu

| Box | Main Dish | Includes |
|---|---|---|
| Box 1 | Beef Biryani | Payesh, Chicken Fry, Dates (3), Banana, Muri, SMC Electrolyte |
| Box 2 | Murg Polao | Beef Halim, Samosa, Dates (3), Orange, Muri, Drinko |
| Box 3 | Beef Biryani + Halim | Chola, Dates (3), Banana, Muri, Laban |
| Box 4 | Murg Polao + Halim | Samosa, Dates (3), Apple, Muri, Drinko (Lychee) |
| Box 5 | Beef Biryani + Samosa | Chola, Dates (3), Banana, Muri, SMC (Orange/Lemon) |
| Box 6 | Chicken Biryani + Kebab | Beef Halim, Dates (3), Watermelon/Banana, Muri, SMC (Lemon) |
| Box 7 | Mutton Biryani | Beef Halim, Chola, Dates (3), Banana, Muri, Laban |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js v22 LTS](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for backend services)
- Windows 10/11 (for `.bat` launcher) — or run services manually on macOS/Linux

### 1. Clone

```bash
git clone https://github.com/BRE-D/iut-cafe-final.git
cd iut-cafe-final
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Key variables in `.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SSE_URL=http://localhost:3003/events
JWT_SECRET=your-secret-here
```

### 4. Launch everything

**Windows — one-click launcher:**
```
start.bat
```

This opens **5 separate Command Prompt windows**, one per service, so you can monitor each independently:

```
[Identity Provider]  →  port 3001
[Stock Service]      →  port 3002
[Notification Hub]   →  port 3003
[API Gateway]        →  port 3000
[Frontend]           →  port 5173
```

**Manual (any OS):**
```bash
# Terminal 1 — Identity Provider
cd iut-cafeteria-v2/identity-provider && node index.js

# Terminal 2 — Stock Service
cd iut-cafeteria-v2/stock-service && node index.js

# Terminal 3 — Notification Hub
cd iut-cafeteria-v2/notification-hub && node index.js

# Terminal 4 — API Gateway
cd iut-cafeteria-v2/gateway && node index.js

# Terminal 5 — Frontend
npm run dev
```

### 5. Open in browser

| Portal | URL |
|---|---|
| **Student** | http://localhost:5173 |
| **Admin** | http://localhost:5173/admin |

---

## 🔐 Demo Credentials

| Portal | ID / Username | Password | Access |
|---|---|---|---|
| Student | `240042132` | `password123` | Full student access |
| Student | *(any ID)* | `devsprint` | Demo student access |
| Admin | `admin` | `admin123` | Dashboard + stock management |
| Admin | `admin2` | `admin456` | Stock manager role |

> **Note:** The app works fully offline without any backend. Mock mode activates automatically and simulates real-time order status progression.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | Component-based UI |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| TailwindCSS | 3.x | Utility-first styling |
| Radix UI | 1.x | Accessible headless components |
| React Router | 6.x | Client-side routing |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 22 LTS | Runtime for all 4 microservices |
| Express | 4.x | HTTP server & routing |
| jsonwebtoken | 9.x | JWT signing and verification |
| bcryptjs | 2.x | Password hashing |
| SSE (native) | — | Real-time order status push |
| Docker Compose | 2.x | Multi-service orchestration |

### External APIs
| API | Used For |
|---|---|
| [aladhan.com](https://aladhan.com/prayer-times-api) | Iftar (Maghrib) times by GPS coordinates for all 8 Bangladesh divisions |
| [api.quran.com](https://quran.api-docs.io/) | Random Quranic verse with Arabic text and English translation |

---

## 📁 Project Structure

```
iut-cafe-final/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx          # Adaptive IUT logo SVG, countdown, theme toggle
│   │   ├── MenuPage.tsx        # Iftar box grid, cart system, confirm order
│   │   ├── OrderTracker.tsx    # Real-time 4-stage order tracker
│   │   ├── OrderHistory.tsx    # Per-account order history
│   │   ├── AdminDashboard.tsx  # Admin overview panel
│   │   ├── StockManagement.tsx # Add stock per menu item
│   │   ├── IftarTicker.tsx     # Scrolling division-wise Iftar times
│   │   ├── QuranVerseCard.tsx  # Arabic verse + translation display
│   │   └── CafeteriaLogin.tsx  # Student & admin login forms
│   ├── hooks/
│   │   ├── useIftarTimes.ts    # Fetches times via GPS coordinates (fixes Chittagong)
│   │   ├── useOrderSSE.ts      # SSE connection + mock timer fallback
│   │   ├── useQuranVerse.ts    # Quran API integration
│   │   └── useAuth.ts          # JWT auth state management
│   ├── lib/
│   │   └── api.ts              # All API calls, per-user session store, mock fallback
│   ├── index.css               # CSS variables — light/dark theme tokens
│   └── App.tsx                 # Root component, theme logic, routing
│
├── iut-cafeteria-v2/
│   ├── gateway/                # API Gateway microservice
│   ├── identity-provider/      # Auth microservice
│   ├── stock-service/          # Inventory & orders microservice
│   └── notification-hub/       # SSE fanout microservice
│
├── start.bat                   # One-click Windows launcher
└── .env                        # Environment configuration
```

---

## 🔄 Order Flow

```
Student confirms cart
        │
        ▼
POST /api/order (× items in cart)
        │
        ▼
Stock Service validates & deducts inventory
  (optimistic locking — prevents overselling)
        │
        ▼
POST /notify → Notification Hub
        │
        ▼
SSE event pushed to student's browser
        │
        ▼
OrderTracker advances: Pending → Stock Verified → In Kitchen → Ready 🎉
```

---

## 🌙 Ramadan Features

- **Live countdown** to Dhaka Iftar time in the navbar (updates every second)
- **Division-wise Iftar times** for all 8 Bangladesh divisions in the ticker:
  Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur, Mymensingh
- **GPS-coordinate API lookup** — avoids unreliable city-name lookups (fixes Chittagong/Barishal)
- **Quran verse** — Arabic + English, random verse per session, refreshes after each order
- **Iftar dua** on the order confirmation screen

---

## 🤝 Contributing

This project was built for **DevSprint 2026** at IUT. Contributions, issues, and suggestions are welcome.

1. Fork the repository
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">

Built with 🤍 for Ramadan · **Islamic University of Technology** · DevSprint 2026

*"اللَّهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ"*
*O Allah, for You I fasted and in You I believed.*

</div>
