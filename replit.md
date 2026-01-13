# Voice Notes App

## Overview

Voice Notes is a React Native/Expo mobile application designed for frictionless thought capture through voice-first interaction. Users speak thoughts into their phone, which are automatically transcribed using OpenAI Whisper and intelligently categorized using GPT-5. The app follows a brutally minimal design philosophy where the microphone button is the hero element.

The application uses a monorepo structure with three main directories:
- `client/` - Expo/React Native frontend
- `server/` - Express.js backend API
- `shared/` - Shared schemas and types (Drizzle ORM + Zod)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation with Native Stack (no tabs, single-screen focus)
- **State Management**: React Context for notes (`useNotes`), TanStack React Query for server state
- **Local Storage**: AsyncStorage for persisting notes locally
- **Animations**: React Native Reanimated for micro-interactions and gestures
- **Styling**: StyleSheet-based with a centralized theme system (`client/constants/theme.ts`)

**Key Design Patterns**:
- Voice-first UX with prominent mic button (80x80pt floating action button)
- Modal overlays for recording and query states
- Swipe gestures on note cards (right to complete, left to delete)
- Section-based organization (Today, Tomorrow, Ideas, Shopping)
- Push notifications for reminders based on note category/due date
- Voice commands to complete or delete notes via query modal

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **AI Integration**: OpenAI API (Whisper for transcription, GPT-5 for understanding)
- **File Upload**: Multer for handling audio file uploads
- **Storage Pattern**: Interface-based storage (`IStorage`) with in-memory implementation currently

**API Endpoints**:
- `POST /api/transcribe` - Accepts audio file, returns transcription + structured note data
- `POST /api/query` - Voice search against existing notes, supports action intents (complete, delete)

### Notifications System
- **Framework**: expo-notifications for local push notifications
- **Scheduling Logic**:
  - Notes with specific `dueDate`: reminder 15 minutes before
  - "Today" notes without time: reminder at 6 PM (or 1 hour later if past 6 PM)
  - "Tomorrow" notes: reminder at 9 AM next day
  - "Shopping" notes: reminder at 10 AM next day
  - "Ideas" and "Other": no automatic reminder
- **Hooks**: `useNotifications` manages scheduling, cancellation, and permissions
- Reminders are automatically cancelled when notes are completed or deleted

### Data Flow
1. User records voice → Audio file sent to `/api/transcribe`
2. OpenAI Whisper transcribes audio → text
3. GPT-5 extracts structured data (title, category, due date, entities)
4. Client stores note in AsyncStorage
5. UI updates with categorized note card

### Database Schema
- Uses Drizzle ORM with PostgreSQL dialect
- Currently has a `users` table (schema in `shared/schema.ts`)
- Notes are stored client-side in AsyncStorage (not yet synced to server database)

## External Dependencies

### Third-Party Services
- **OpenAI API** (required): Whisper for speech-to-text, GPT-5 for natural language understanding
  - Environment variable: `OPENAI_API_KEY`

### Database
- **PostgreSQL**: Configured via Drizzle ORM
  - Environment variable: `DATABASE_URL`
  - Migrations directory: `./migrations`

### Key NPM Packages
- `expo-audio` - Audio recording on mobile
- `expo-notifications` - Push notifications and reminders
- `openai` - OpenAI API client
- `drizzle-orm` + `drizzle-zod` - Database ORM and validation
- `multer` - Multipart form handling for audio uploads
- `react-native-reanimated` - Gesture animations
- `@tanstack/react-query` - Server state management

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for transcription and AI features
- `EXPO_PUBLIC_DOMAIN` - Public domain for API calls from mobile client
- `REPLIT_DEV_DOMAIN` - Development domain (Replit-specific)