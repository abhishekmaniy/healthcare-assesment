# 🏥 Healthcare System

A **full-stack healthcare workforce management** application for tracking staff attendance, working hours, and productivity.  
It provides **real-time clock-in/clock-out tracking, statistics, and performance analytics** for healthcare staff.

---

## 📌 Features

- **User Authentication** 
- **Clock In / Clock Out Tracking** with GPS location
- **Daily & Weekly Hours Tracking**
- **Analytics Dashboard** with:
  - Active Workers count
  - Today's Check-ins
  - Average Hours Today
  - Total Hours Worked
- **Hours Per Staff Tab**:
  - Avg hours spent per day
  - Number of daily check-ins
  - Total weekly hours per staff
  - 📊 Charts powered by Chart.js
- **Responsive UI** (Ant Design + Tailwind CSS)
- **Role-based Access** (Admin / Worker)

---

## 🛠️ Tech Stack

### **Frontend**
- Next.js (with Vite or CRA)
- Ant Design (UI components)
- Grommet (UI components)
- Tailwind CSS (styling)
- Chart.js (data visualization)
- Zustand (state management)

### **Backend**
- Prisma ORM
- PostgreSQL (Database)
- OAuth
- Cloud Deployment (e.g., Vercel / Render)

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/abhishekmaniy/healthcare-assesment.git
cd healthcare-assessment
```

### 2️⃣ Install Dependencies
```bash
npm install
npx prisma generate
```

### 3️⃣ Environment Variables
DATABASE_URL=
AUTH0_SECRET=
AUTH0_BASE_URL=
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

### 4️⃣ Run the Application
```bash
npm run dev
```

## 📊 Dashboard Preview
| Card Type            | Example Metric |
| -------------------- | -------------- |
| Active Workers       | 15             |
| Today's Check-ins    | 22             |
| Avg Hours Today      | 6.4h           |
| Total Hours (Weekly) | 280h           |


# 🚀 Deployment
Frontend: Vercel
Database: Neon

## 👨‍💻 Author
Abhishek Maniyar
📧 Email: abhishekmaniyar502@gmail.com
🔗 Portfolio: https://portfolio-abhishek-xi.vercel.app
💼 LinkedIn: https://linkedin.com/in/abhishekmaniyar502/
🐙 GitHub: https://github.com/abhishekmaniy/abhishekmaniy
