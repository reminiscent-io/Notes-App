# Voice Notes App

## Overview

Voice Notes is a cross-platform web and mobile application designed for frictionless thought capture through voice-first interaction. Users speak thoughts which are automatically transcribed using OpenAI Whisper and intelligently categorized using GPT-4o-mini. The app follows a brutally minimal design philosophy where the microphone button is the hero element.

**Platform Support:**
- Web: Uses MediaRecorder API for audio capture (works in Chrome, Firefox, Safari)
- Mobile: Uses expo-audio for native iOS/Android recording via Expo Go

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
- **AI Integration**: OpenAI API (Whisper for transcription, GPT-4o-mini for understanding)
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

### Custom Sections (Smart Folders)
- **Creation**: Voice command "Create a work section" or "Create a section called Family for birthdays, relatives"
- **Auto-tagging**: Notes automatically tagged to matching sections based on keywords during transcription
- **Storage**: Sections stored in AsyncStorage with key "@voice_notes_sections"
- **Schema**: `{ id, name, icon, keywords[], createdAt }`
- **Archiving**: Voice command "Archive my completed work tasks" hides notes from main view while keeping them searchable
- **Hooks**: `useCustomSections` for section CRUD, notes have `tags[]` and `archivedAt` fields

### Settings & Management
- **Settings Screen**: Accessible from gear icon in main feed header
- **Section Management**: View, delete custom sections (deleting also cleans up note tags)
- **Archived Notes**: View all archived notes, swipe right to unarchive (reschedules reminders)
- **Discoverability**: QueryModal shows rotating example prompts every 3 seconds to teach voice commands

### Data Flow
1. User records voice → Audio file sent to `/api/transcribe` with custom sections
2. OpenAI Whisper transcribes audio → text
3. GPT-4o-mini extracts structured data (title, category, due date, entities, tags)
4. Client stores note in AsyncStorage with auto-assigned tags
5. UI updates with categorized note card, appears in matching custom sections

### Database Schema
- Uses Drizzle ORM with PostgreSQL dialect
- Currently has a `users` table (schema in `shared/schema.ts`)
- Notes are stored client-side in AsyncStorage (not yet synced to server database)

## External Dependencies

### Third-Party Services
- **OpenAI API** (required): Whisper for speech-to-text, GPT-4o-mini for natural language understanding
  - Secret: `OPENAI_API_KEY` (stored in Replit secrets)

### Database
- **PostgreSQL**: Configured via Drizzle ORM
  - Environment variable: `DATABASE_URL`
  - Migrations directory: `./migrations`

### Audio Recording
- **Web**: MediaRecorder API with automatic MIME type detection (webm, mp4, ogg fallback)
- **Native**: expo-audio with optimized settings (mono, 16kHz, 32kbps)
- **Unified Hook**: `useUnifiedAudioRecorder` abstracts platform differences

### Key NPM Packages
- `expo-audio` - Audio recording on mobile (native only)
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