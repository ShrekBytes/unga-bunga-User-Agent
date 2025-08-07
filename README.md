# Unga Bunga User-Agent

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://addons.mozilla.org/)

A powerful and user-friendly Firefox extension for advanced user agent spoofing with intelligent anti-detection features. Take control of your browser's identity with precision and ease.

![Extension Icon with Badge](images/extension-icon-badge.png)

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
  - [Basic User Agent Control](#basic-user-agent-control)
  - [Smart Random Selection](#smart-random-selection)
  - [Auto-Random with Intervals](#auto-random-with-intervals)
  - [Advanced Site Filtering](#advanced-site-filtering)
  - [Custom User Agents](#custom-user-agents)
- [Badge Status Indicators](#-badge-status-indicators)
- [Privacy & Security](#-privacy--security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🎯 **Smart User Agent Management**

- **Real-time user agent spoofing** for enhanced privacy
- **Intelligent device and browser matching** for realistic user agents
- **Automatic user agent rotation** with customizable intervals
- **One-click random user agent selection**

![Smart User Agent Management](images/smart-ua-management.png)

### 🎲 **Smart Random Selection**

- **Device-specific filtering**: Android, iPhone, iPad, Linux, Mac, Windows
- **Browser-specific filtering**: Chrome, Firefox, Edge, Opera, Safari, Vivaldi
- **Source-based filtering**: Latest, Most Common, Custom, or All sources
- **Instant filtering** with live user agent count updates

![Smart Random Features](images/smart-random-features.png)

### ⏰ **Auto-Random with Intervals**

- **Scheduled user agent changes** (1-60 minutes)
- **Smart filtering** during auto-random selection
- **Background operation** without popup interaction
- **Easy interval adjustment** with real-time updates

![Auto-Random Interface](images/auto-random-interface.png)

### 🎛️ **Advanced Site Filtering**

- **Global Mode**: Apply to all websites
- **Whitelist Mode**: Apply only to selected sites
- **Blacklist Mode**: Apply to all sites except selected ones
- **Easy site management** with add/remove functionality

![Advanced Site Filtering](images/site-filtering.png)

### 🛠️ **Custom User Agents**

- **Add your own user agent strings**
- **Persistent storage** of custom user agents
- **Easy removal** with one-click delete
- **Integration** with smart random selection

![Custom User Agents](images/custom-user-agents.png)

### 📊 **Visual Status Indicators**

- **Real-time badge indicators** on extension icon
- **Color-coded status**: Red (OFF), Green (ALL), Blue (WL), Purple (BL)
- **Instant visual feedback** for current mode
- **Professional appearance** with minimal design

![Badge Status Indicators](images/badge-indicators.png)

### 🚀 **Performance & Caching**

- **24-hour caching** of user agent lists
- **Automatic updates** with manual refresh option
- **Efficient memory usage** with optimized data structures
- **Fast response times** for all operations

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

## 📖 Usage Guide

### Basic User Agent Control

#### Setting a Custom User Agent

1. Open the extension popup
2. Enter your desired user agent string in the text area
3. Click "Apply" to activate it immediately

#### Using Random User Agents

1. Click "Random UA" for a completely random user agent
2. Click "Smart Random" for a filtered random selection
3. Use "Reset Default" to return to your browser's original user agent

![Basic Controls](images/basic-controls.png)

### Smart Random Selection

#### Filtering by Device

- **Android**: Mobile Android devices
- **iPhone**: iOS mobile devices
- **iPad**: iOS tablet devices
- **Linux**: Desktop Linux systems
- **Mac**: macOS desktop systems
- **Windows**: Windows desktop systems

#### Filtering by Browser

- **Chrome**: Google Chrome browser
- **Firefox**: Mozilla Firefox browser
- **Edge**: Microsoft Edge browser
- **Opera**: Opera browser
- **Safari**: Apple Safari browser
- **Vivaldi**: Vivaldi browser

#### Filtering by Source

- **All**: All available user agents
- **Custom**: Only your custom user agents
- **Latest**: Most recent user agent strings
- **Most Common**: Frequently used user agents

![Smart Random Interface](images/smart-random-interface.png)

### Auto-Random with Intervals

#### Setting Up Auto-Random

1. Enable "Auto Smart Random" toggle
2. Set your desired interval (1-60 minutes)
3. Choose your preferred device and browser filters
4. The extension will automatically change user agents at the specified interval

#### Managing Auto-Random

- **Enable/Disable**: Toggle the switch to start/stop auto-random
- **Adjust Interval**: Change the minutes value to update the interval
- **Filter Settings**: Auto-random respects your current device/browser preferences

![Auto-Random Setup](images/auto-random-setup.png)

### Advanced Site Filtering

#### Global Mode (Default)

- User agent spoofing applies to **all websites**
- No site list management needed
- Maximum privacy protection

#### Whitelist Mode

- User agent spoofing applies **only to selected sites**
- Add sites to the whitelist for targeted protection
- Useful for specific privacy needs

#### Blacklist Mode

- User agent spoofing applies to **all sites except selected ones**
- Add sites to the blacklist to exclude them
- Useful when you want to exclude certain sites

#### Managing Site Lists

1. Select your desired mode (Whitelist/Blacklist)
2. Click "Add Site" to add a new domain
3. Enter the domain (e.g., `example.com`)
4. Click "Add" to confirm
5. Remove sites by hovering and clicking the × button

![Site Management](images/site-management.png)

### Custom User Agents

#### Adding Custom User Agents

1. Enter your user agent string in the custom input field
2. Click "Add" to save it
3. Your custom user agent will appear in the list
4. It will be included in smart random selection

#### Managing Custom User Agents

- **View**: All custom user agents are listed below the input
- **Remove**: Hover over a custom user agent and click × to delete
- **Integration**: Custom user agents work with all features

![Custom User Agents Management](images/custom-ua-management.png)

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
