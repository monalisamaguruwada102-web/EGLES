# EGLES SMIS 🏫

**EGLES Secondary School Management & Information System** is a state-of-the-art, premium digital ecosystem designed to seamlessly connect students, staff, and administration. Built with modern web technologies, it features a highly aesthetic, responsive, and installable Progressive Web App (PWA) interface.

## 🌐 Live Application
Access the live platform here: **[https://hospital-g8fe.onrender.com](https://hospital-g8fe.onrender.com)**

## ✨ Key Features

- **Premium UI/UX:** Glassmorphism design, dynamic micro-animations, and fluid transitions.
- **Role-Based Access Control:** Dedicated portals for Administrators, Teachers, Staff, Bursars, and Students.
- **Progressive Web App (PWA):** Installable on desktop and mobile devices for a native-like experience complete with offline indicators.
- **Public Gateway:** A comprehensive public-facing portal featuring:
  - Live event countdowns
  - Interactive campus map ("Drone's Eye View")
  - Wall of Excellence & Academic Pathways
  - Live statistics and public notices
- **Student Dashboard:** Secure access to academic results, fee statements, class attendance tracking, and campus notices.
- **Accessibility Center:** Built-in support for dyslexic-friendly fonts, font scaling, and reduced motion preferences.
- **Dynamic Theming:** Multiple premium themes including Cyber Glass, Light, Midnight, and Aurora.

## 🚀 Getting Started

### Prerequisites

To run this application locally, you just need a modern web browser. For the PWA and service workers to function correctly, the files should be served via a local web server rather than opened directly from the filesystem.

### Running Locally

1. Navigate to the project directory:
   ```bash
   cd EGLES
   ```
2. Start a local static file server. For example:
   ```bash
   # Using Node.js
   npx serve .

   # Or using Python 3
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` (or the port provided by your server) in your browser.

## 🛠 Technology Stack

- **Core:** HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Storage:** IndexedDB / LocalStorage (managed via `db.js`)
- **Styling:** Custom modern CSS utilizing CSS Variables, grid/flexbox, and advanced backdrop-filters.
- **Fonts & Visuals:** 'Outfit' font family (Google Fonts) and Chart.js for data visualization.

## 📱 PWA Support

EGLES SMIS is fully PWA-ready.
1. Serve the application over HTTPS or `localhost` to activate the Service Worker (`sw.js`).
2. The browser will display an "Install Egles SMIS" prompt.
3. Once installed, it operates as a standalone desktop or mobile application.

## 🔒 Security & Roles

The system employs a client-side authentication layer for session management:
- **Staff/Admin Login:** Dedicated gateway for faculty and administration management.
- **Student Portal:** Direct access via verified Student ID and Full Name.
- All session states (`egles_session`) and preferences (`egles_theme`, accessibility options) are maintained locally.

---
*© 2026 Egles Secondary School. All academic rights reserved.*
