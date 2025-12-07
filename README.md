# Script Writer

A simple, trustworthy web application for writing video and movie scripts with cloud sync capabilities.

## Features

- **Classic Courier font** at 12pt size
- **Toggle between white and black backgrounds**
- **File management** - Save and access your scripts
- **Cloud sync** - Login to sync your scripts across devices
- **Export as .txt** - Download your scripts as plain text files
- **Scene templates** - Generate numbered scene templates with proper formatting
- **Version history** - Access previous versions of your scripts
- **Keyboard shortcuts**:
  - `Ctrl+S` (or `Cmd+S` on Mac) - Save file
  - `Ctrl+B` (or `Cmd+B` on Mac) - Toggle dark mode
  - `Ctrl+N` (or `Cmd+N` on Mac) - New script

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables (Optional)

Create a `.env` file in the root directory (or set environment variables):

```bash
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

**For Google Sign-In (Optional):**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set Application type to "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
7. Copy the Client ID and Client Secret to your `.env` file

**Note:** Google Sign-In will work without configuration, but users won't be able to use it until you set up the credentials.

### 3. Start the Backend Server

```bash
npm run server
```

The server will run on `http://localhost:3000`

### 4. Open the App

Simply open `index.html` in your web browser. No build process required.

## Authentication

### Register/Login

**Email/Password:**
1. Click the "Login" button in the sidebar header
2. Choose "Register" to create a new account or "Login" to sign in
3. Enter your email and password (minimum 6 characters)
4. Your scripts will automatically sync to the cloud

**Google Sign-In:**
1. Click the "Login" button in the sidebar header
2. Click "Sign in with Google" (or "Sign up with Google" on the Register tab)
3. A popup window will open for Google authentication
4. Sign in with your Google account
5. Your scripts will automatically sync to the cloud

**Note:** Google Sign-In requires server configuration (see Setup section above)

### Cloud Sync

- **Automatic sync**: When logged in, all saves and deletes are automatically synced to the cloud
- **Manual sync**: Click the "Sync" button to manually sync all local files to the cloud
- **On login**: Your cloud files are automatically downloaded when you log in

## Storage System

The app uses a hybrid storage approach:

- **Local storage**: All files are stored in browser localStorage for offline access
- **Cloud storage**: When logged in, files are synced to the cloud server
- **Version history**: Previous versions of scripts are saved automatically

## API Endpoints

The backend server provides the following endpoints:

- `POST /api/register` - Register a new user
- `POST /api/login` - Login with email and password
- `GET /api/scripts` - Get all user's scripts (requires auth)
- `POST /api/scripts` - Save a script (requires auth)
- `POST /api/scripts/sync` - Sync multiple scripts (requires auth)
- `DELETE /api/scripts/:id` - Delete a script (requires auth)

## File Format

Saved files are plain text (.txt) format, perfect for sharing or importing into other applications.

## Scene Templates

The app includes a scene template generator that creates properly formatted screenplay scenes with:
- Numbered scene headings (1., 2., 3., etc.)
- Scene structure with placeholders for setting, characters, dialogue, and action
- Automatic numbering that continues from existing scenes

## Development

### Backend

The backend server uses:
- Express.js for the API
- SQLite for database
- JWT for authentication
- bcryptjs for password hashing

### Database

The database file (`database.sqlite`) is created automatically on first run. It contains:
- `users` table for user accounts
- `scripts` table for script files and versions

## Security Notes

- Change the `JWT_SECRET` in `server.js` for production use
- Use HTTPS in production
- Consider adding rate limiting for production
- The default JWT expiration is 30 days
