# PulseTrack 

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

PulseTrack is an open-source, cross-platform personal productivity and habit-tracking application designed with an offline-first architecture. It empowers users to build customizable routines, track their progress with detailed analytics, and manage their daily tasks seamlessly without relying on a constant internet connection. Cloud synchronization is entirely optional.

## Features

- **Offline-First Architecture:** Local data persistence ensures lightning-fast interactions and usability without an internet connection.
- **Optional Cloud Synchronization:** Securely sync your data across devices using an optional cloud-backed account.
- **Customizable Routines:** Create dynamic, multi-step daily routines tailored to your lifestyle.
- **Advanced Analytics:** Visualize your consistency, streak history, and completion rates with interactive charts.
- **Smart Reminders:** Push notifications and contextual nudges to keep you on track.
- **Cross-Platform:** Available on iOS, Android, and Web with a unified codebase.

## Tech Stack

- **Frontend & Mobile:** React Native (Expo), React, TypeScript, Tailwind CSS
- **Local Storage:** SQLite (via WatermelonDB for offline-first sync capabilities)
- **Backend (Optional Cloud):** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Drizzle ORM

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo CLI
- PostgreSQL (if running the cloud sync server locally)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone [https://github.com/GauravKarakoti/PulseTrack.git](https://github.com/yourusername/PulseTrack.git)
   cd PulseTrack
   ```
2. Install dependencies
```bash
# Install mobile/frontend dependencies
cd apps/mobile
npm install

# Install backend dependencies
cd ../../apps/server
npm install
```
3. Configure Environment Variables

Copy the example environment files and update them with your local settings.
```bash
cp .env.example .env
```
4. Start the Development Servers
```bash
# Start the optional backend server
cd apps/server
npm run dev

# Start the Expo application
cd ../../apps/mobile
npm run start
```

## Architecture Overview
PulseTrack uses a local-first sync model. All read and write operations happen against the local SQLite database instantly. A background sync engine tracks local changes (inserts, updates, deletes) and synchronizes them with the PostgreSQL backend via the Express API when the device is online and the user has enabled cloud sync.

## Contributing
We welcome contributions from the community! Whether it's a bug fix, new feature, or documentation improvement, please read our [Contributing Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) before submitting a pull request.