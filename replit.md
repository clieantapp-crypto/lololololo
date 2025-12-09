# Next.js Arabic Login System

## Project Overview
This is a Next.js 13 application featuring an Arabic RTL (Right-to-Left) interface for a login and notification management system. The application uses Firebase for authentication and Firestore for data storage.

## Recent Changes (December 9, 2025)
- Added inbox-style conversation view with chat-bubble data display
- Added approval buttons for card, card OTP, and phone OTP
- Added card blocking list feature with toggle UI
- Added CSV export for card data (excludes blocked cards)
- Added country filter dropdown for visitor filtering
- Added visitor vs data user differentiation (green/gray dots)
- Sorting prioritizes unread items first, then newest by date

## Previous Changes (December 8, 2025)
- Configured Next.js to run on Replit environment
- Updated development server to bind to 0.0.0.0:5000 for Replit proxy compatibility
- Added experimental allowedOrigins configuration for cross-origin support
- Set up deployment configuration for autoscale deployment
- Installed all dependencies via npm

## Tech Stack
- **Framework**: Next.js 13.5.1 (App Router)
- **Language**: TypeScript 5.2.2
- **Styling**: Tailwind CSS 3.3.3
- **UI Components**: Radix UI primitives
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore & Realtime Database
- **Icons**: Lucide React
- **Themes**: next-themes for dark mode support

## Project Structure
```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Login page (main entry)
│   ├── login/             # Login route
│   ├── notifications/     # Notifications page
│   └── admin/             # Admin page
├── components/            # React components
│   ├── ui/               # Reusable UI components (Radix-based)
│   └── *.tsx             # Feature components
├── lib/                   # Utility libraries
│   ├── firestore.ts      # Firebase configuration
│   ├── firestore-services.ts
│   └── utils.ts
├── hooks/                 # Custom React hooks
└── public/               # Static assets
```

## Firebase Configuration
The application uses Firebase with the following services:
- **Firebase Auth**: User authentication
- **Firestore**: Document database for notifications and user data
- **Realtime Database**: Real-time data synchronization

Firebase credentials are configured in `lib/firestore.ts`.

## Default Login Credentials
- Email: `me199@admin.xo`
- Password: `me199@admin.xo`

## Development
The application runs on port 5000 and is accessible via Replit's webview.

**Start development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Run production server:**
```bash
npm start
```

## Key Features
- Arabic RTL interface
- Firebase authentication
- Dark mode theme with green accents
- Responsive design
- Notification management system
- Admin panel
- Real-time data updates

## Architecture Notes
- Uses Next.js App Router (app directory structure)
- Client-side rendering for interactive components ("use client")
- Tailwind CSS with custom animations
- Component-based architecture with Radix UI primitives

## Deployment
Configured for Replit Autoscale deployment:
- Build command: `npm run build`
- Run command: `npm run start`
- Deployment type: Autoscale (stateless, scales automatically)
