# Unga Bunga User-Agent

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://addons.mozilla.org/)

A powerful and user-friendly Firefox extension for advanced user agent spoofing with intelligent anti-detection features. Take control of your browser's identity with precision and ease.

![Extension Icon with Badge](images/extension-icon-badge.png)

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Badge Status Indicators](#-badge-status-indicators)
- [Privacy & Security](#-privacy--security)
- [Troubleshooting](#-troubleshooting)
- [Contributing & Support](#-contributing--support)
- [License](#-license)

## ✨ Features

### 🎯 **Smart User Agent Management**

Real-time user agent spoofing with intelligent device and browser matching for realistic user agents. Automatic user agent rotation with customizable intervals and one-click random user agent selection.

**How it works**: The extension intercepts HTTP requests and replaces the User-Agent header with your selected value. It also updates browser properties to maintain consistency across all fingerprinting methods.

![Smart User Agent Management](images/smart-ua-management.png)

### 🎲 **Smart Random Selection**

Advanced filtering system that lets you select user agents based on specific criteria. Filter by device type (Android, iPhone, iPad, Linux, Mac, Windows), browser (Chrome, Firefox, Edge, Opera, Safari, Vivaldi), or source (Latest, Most Common, Custom, All).

**How it works**: Choose your preferred device and browser, then click "Smart Random" to get a matching user agent. The system filters through thousands of real user agents to find the perfect match for your criteria.

![Smart Random Features](images/smart-random-features.png)

### ⏰ **Auto-Random with Intervals**

Automated user agent rotation that changes your browser identity at specified intervals (1-60 minutes). Works in the background without requiring popup interaction and respects your current device/browser preferences.

**How it works**: Enable the auto-random toggle, set your desired interval, and the extension will automatically change user agents in the background. Perfect for maintaining privacy during long browsing sessions.

![Auto-Random Interface](images/auto-random-interface.png)

### 🎛️ **Advanced Site Filtering**

Three modes of operation for targeted privacy protection. Global Mode applies to all websites, Whitelist Mode applies only to selected sites, and Blacklist Mode applies to all sites except selected ones.

**How it works**:

- **Global Mode**: Maximum privacy protection for all websites
- **Whitelist Mode**: Add specific domains to apply user agent spoofing only to those sites
- **Blacklist Mode**: Add specific domains to exclude them from user agent spoofing

![Advanced Site Filtering](images/site-filtering.png)

### 🛠️ **Custom User Agents**

Add and manage your own user agent strings with persistent storage. Custom user agents integrate seamlessly with all other features including smart random selection.

**How it works**: Enter any user agent string in the custom input field and save it. Your custom user agents are stored locally and can be used with random selection, auto-random, and all filtering features.

![Custom User Agents](images/custom-user-agents.png)

### 📊 **Visual Status Indicators**

Real-time badge indicators on the extension icon show current status with color-coded feedback. Red for disabled, green for all sites, blue for whitelist, and purple for blacklist mode.

**How it works**: The badge updates instantly when you change settings, providing immediate visual feedback about your current privacy protection status.

![Badge Status Indicators](images/badge-indicators.png)

### 🚀 **Performance & Caching**

24-hour caching of user agent lists with automatic updates and manual refresh options. Optimized data structures ensure fast response times for all operations.

**How it works**: User agent data is cached locally for 24 hours to reduce network requests and improve performance. The cache automatically refreshes when needed, or you can manually refresh for the latest data.

## 📦 Installation

### From Firefox Add-ons Store (Recommended)

1. Visit the [Firefox Add-ons Store](https://addons.mozilla.org/)
2. Search for "Unga Bunga User-Agent"
3. Click "Add to Firefox"
4. Confirm the installation

### Manual Installation (Developer Mode)

1. Download the extension files
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox" tab
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension folder

## 🚀 Quick Start

1. **Enable the Extension**

   - Click the extension icon in your toolbar
   - Toggle the "Enabled" switch to ON
   - The badge will turn green indicating active status

2. **Set Your First User Agent**

   - Choose your preferred device (Android, iPhone, etc.)
   - Select your preferred browser (Chrome, Firefox, etc.)
   - Click "Smart Random" to get a matching user agent
   - Click "Apply" to activate it

3. **Verify It's Working**
   - Visit any website
   - The extension will automatically spoof your user agent
   - Check the badge color to confirm active status

![Quick Start Guide](images/quick-start-guide.png)

## 🎨 Badge Status Indicators

The extension icon displays a colored badge to show current status:

| Badge  | Color  | Status    | Meaning                                 |
| ------ | ------ | --------- | --------------------------------------- |
| 🔴 OFF | Red    | Disabled  | Extension is turned off                 |
| 🟢 ALL | Green  | All Sites | Working on all websites                 |
| 🔵 WL  | Blue   | Whitelist | Working only on whitelisted sites       |
| 🟣 BL  | Purple | Blacklist | Working on all sites except blacklisted |

![Badge Status Table](images/badge-status-table.png)

## 🔒 Privacy & Security

### Data Handling

- **No data collection**: The extension doesn't collect or transmit any personal data
- **Local storage only**: All settings are stored locally in your browser
- **No tracking**: No analytics or tracking mechanisms
- **Open source**: Full transparency with GPL v3 license

### Security Features

- **Secure caching**: User agent lists are cached locally with 24-hour expiry
- **Input validation**: All user inputs are validated and sanitized
- **Error handling**: Graceful error handling without data leaks
- **Minimal permissions**: Only requests necessary permissions

### Privacy Benefits

- **Fingerprint protection**: Reduces browser fingerprinting
- **Tracking prevention**: Makes tracking more difficult
- **Privacy enhancement**: Improves overall online privacy
- **Customizable protection**: Choose your level of privacy

## 🔧 Troubleshooting

### Common Issues

#### Extension Not Working

1. **Check if enabled**: Ensure the toggle switch is ON
2. **Verify badge color**: Should be green, blue, or purple (not red)
3. **Check user agent**: Make sure a user agent is selected
4. **Refresh page**: Try refreshing the current webpage

#### Badge Not Updating

1. **Reload extension**: Go to `about:debugging` and reload the extension
2. **Check console**: Open browser console (F12) for error messages
3. **Restart browser**: Close and reopen Firefox

#### Site Filtering Not Working

1. **Check mode**: Ensure you're in the correct mode (Whitelist/Blacklist)
2. **Verify site list**: Make sure sites are properly added to the list
3. **Check domain format**: Use format like `example.com` (without http://)

#### Auto-Random Not Working

1. **Check toggle**: Ensure "Auto Smart Random" is enabled
2. **Verify interval**: Set interval to 1-60 minutes
3. **Check filters**: Ensure device/browser filters are set
4. **Wait for interval**: Changes happen at the specified interval

### Getting Help

If you encounter issues not covered here:

1. **Check the console**: Open browser console (F12) for error messages
2. **Reload the extension**: Go to `about:debugging` and reload
3. **Report issues**: Create an issue on GitHub with details
4. **Check permissions**: Ensure the extension has necessary permissions

## 🤝 Contributing & Support

Found a bug or have a feature request? Open an issue or submit a pull request.

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

### What This Means

- **Free to use**: You can use this extension for any purpose
- **Free to modify**: You can modify the code as needed
- **Free to distribute**: You can share modified versions
- **Open source**: All code is publicly available
- **Copyleft**: Modified versions must also be open source

## 🙏 Acknowledgments

- **User Agent Database**: Powered by [ShrekBytes/useragents-data](https://github.com/ShrekBytes/useragents-data)
- **User Agent Data**: Sourced from [useragents.me](https://useragents.me)

---

**Made with ❤️ for privacy-conscious users**

_Unga Bunga User-Agent - Take control of your browser's identity_
