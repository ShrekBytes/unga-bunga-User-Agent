# User Agent Spoofer - Firefox Extension

A privacy-focused Firefox extension that allows you to spoof your browser's user agent string with advanced anti-detection features.

## Features

### Core Functionality

- **User Agent Spoofing**: Change your browser's user agent string to any value
- **Automatic Data Loading**: Fetches real user agent data from [ShrekBytes/useragents-data](https://github.com/ShrekBytes/useragents-data)
- **Custom User Agents**: Add your own custom user agent strings
- **Random Selection**: Get random user agents based on real-world usage statistics

### Anti-Detection Measures

- **Navigator Property Spoofing**: Updates `platform`, `appVersion`, `vendor`, etc. to match the spoofed user agent
- **Window Object Spoofing**: Adds browser-specific objects (`window.chrome`, `window.safari`, etc.)
- **Canvas Fingerprinting Protection**: Adds subtle noise to canvas operations
- **WebGL Fingerprinting Protection**: Modifies WebGL parameters
- **Audio Fingerprinting Protection**: Adds minimal noise to audio data
- **Performance Timing Protection**: Filters out fingerprinting-related entries

### UI Features

- **Minimal Dark Theme**: Clean, modern interface with dark colors
- **Filter Tabs**: Browse user agents by type (Desktop, Mobile, Custom)
- **Real-time Status**: See current user agent and enabled status
- **Quick Actions**: Random user agent selection and data refresh

## Installation

### Method 1: Load as Temporary Extension (Development)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this extension

### Method 2: Build and Install

1. Clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file

## Usage

### Basic Usage

1. Click the extension icon in your toolbar
2. Toggle the "Enabled" switch to activate user agent spoofing
3. Select a user agent from the list or use "Random UA"
4. The selected user agent will be applied immediately

### Adding Custom User Agents

1. Scroll to the "Add Custom User Agent" section
2. Enter your custom user agent string
3. Click "Add" or press Enter
4. Your custom user agent will appear in the "Custom" tab

### Filtering User Agents

- **All**: Shows all available user agents
- **Desktop**: Shows only desktop user agents
- **Mobile**: Shows only mobile user agents
- **Custom**: Shows only your custom user agents

### Anti-Detection Features

The extension automatically implements several anti-detection measures:

- Synchronizes spoofed values across all navigator properties
- Adds browser-specific objects to prevent detection
- Protects against canvas, WebGL, and audio fingerprinting
- Maintains consistency across page reloads and new tabs

## File Structure

```
user-agent-spoofer/
├── manifest.json          # Extension manifest
├── background.js          # Background script (core logic)
├── content.js            # Content script (anti-detection)
├── popup.html            # Popup UI HTML
├── popup.css             # Popup UI styles
├── popup.js              # Popup UI logic
└── README.md             # This file
```

## Technical Details

### Background Script (`background.js`)

- Manages user agent data fetching and storage
- Handles HTTP request interception
- Provides API for popup and content scripts
- Implements user agent selection logic

### Content Script (`content.js`)

- Injects anti-detection measures into web pages
- Overrides navigator and window properties
- Protects against fingerprinting techniques
- Maintains consistency across page contexts

### Popup UI (`popup.html`, `popup.css`, `popup.js`)

- Provides user interface for extension control
- Handles user interactions and data display
- Communicates with background script
- Implements filtering and selection features

## Privacy Features

### Data Handling

- User agents are fetched from public repositories
- Custom user agents are stored locally
- No data is sent to external servers (except for initial user agent fetching)
- All settings are stored locally in browser storage

### Anti-Detection

- Comprehensive navigator property spoofing
- Browser-specific object injection
- Fingerprinting protection for canvas, WebGL, and audio
- Performance timing protection

## Development

### Building

The extension is ready to use as-is. No build process is required.

### Testing

1. Load the extension in Firefox
2. Visit websites that detect user agents
3. Use browser developer tools to verify spoofing
4. Test anti-detection measures

### Customization

- Modify `popup.css` for UI changes
- Update `content.js` for additional anti-detection measures
- Extend `background.js` for new features

## Troubleshooting

### Extension Not Working

1. Check if the extension is enabled in `about:addons`
2. Verify permissions are granted
3. Check browser console for errors
4. Reload the extension if needed

### User Agent Not Changing

1. Ensure the extension is enabled
2. Check if a user agent is selected
3. Try refreshing the page
4. Check if the website is using other detection methods

### Anti-Detection Issues

1. Some websites may use advanced detection techniques
2. The extension focuses on common fingerprinting methods
3. Additional measures may be needed for specific sites

## Contributing

Feel free to submit issues and enhancement requests. The extension is designed to be modular and easy to extend.

## License

This project is open source and available under the MIT License.
