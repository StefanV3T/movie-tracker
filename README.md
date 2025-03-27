# Netflix Watch Tracker

A Chrome extension that tracks your Netflix viewing history, showing what you've watched and how many times you've watched each title.

## Features

- **Automatic Detection**: Tracks Netflix titles as you watch.
- **View Count Tracking**: Displays how many times you've watched each show/movie.
- **Secure Cloud Sync**: Uses Supabase for backend storage.
- **User Authentication**: Keeps your watch history private.
- **Offline Support**: Stores data locally when offline.

## Screenshots

> _[Add screenshots of the extension popup and settings here]_

## Installation

### From Chrome Web Store

1. Visit **Netflix Watch Tracker** on the Chrome Web Store.
2. Click **"Add to Chrome"**.
3. Confirm the installation.

### Manual Installation (Developer Mode)

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **"Load unpacked"** and select the extension folder.
5. The extension will now appear in your extensions list.

## Usage

1. Sign up or log in by clicking the extension icon.
2. Navigate to Netflix and start watching.
3. The extension will automatically track your viewing activity.
4. Click the extension icon to view your watch history.
5. Titles with multiple views will display their view counts.

## Tech Stack

- **Frontend**: JavaScript, HTML, CSS
- **Storage**: Chrome Storage API, Supabase
- **Authentication**: Supabase Auth
- **APIs**: Netflix DOM manipulation for title detection

## Privacy

- All data is stored securely in your Supabase account.
- Watch history is accessible only with your login credentials.
- The extension only interacts with Netflix pages and does not track other browsing activity.

## Development

### Prerequisites

- Chrome browser
- Supabase account and project

### Setup

1. Clone the repository.
2. Create a Supabase project and configure the database tables.
3. Update the Supabase URL and anon key in:
    - `auth.js`
    - `background.js`
    - `popup.js`
4. Load the extension in Chrome using Developer Mode.

## Contributing

Contributions are welcome! Follow these steps to contribute:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/AmazingFeature`.
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`.
4. Push to the branch: `git push origin feature/AmazingFeature`.
5. Open a Pull Request.