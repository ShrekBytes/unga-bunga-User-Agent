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
   - Togglhe extension icon in your toolbar
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

![Quick Start Guide](images/quick-start-guide.png)e the "Enabled" switch to ON
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

#### Setting a Custom User Agent

1. Open the extension popup
2. Enter your desired user agent string in the text area
3. Click "Apply" to activate it immediately

#### Using Random User Agents

1. Click "Random UA" for a completely random user agent
3. Use "Reset Default" to return to your browser's original user agent

![Basic Controls](images/basic-controls.png)

### Smart Random Selection

#### Filtering by Device

#### Filtering by Browser

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


### Custom User Agents

#### Adding Custom User Agents
#### Managing Custom User Agents
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


## 🔒 Privacy & Security

### Data Handling

- **No data collection**: The extension doesn't collect or transmit any personal data
- **Local storage only**: All settings are stored locally in your browser
- **No tracking**: No analytics or tracking mechanisms
- **Open source**: Full transparency with GPL v3 license
- **Secure caching**: User agent lists are cached locally with 24-hour expiry
- **Input validation**: All user inputs are validated and sanitized
- **Minimal permissions**: Only requests necessary permissions



## 🤝 Contributing & Support

Found a bug or have a feature request? Open an issue or submit a pull request.

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.


## 🙏 Acknowledgments

- **User Agent Database**: Powered by [ShrekBytes/useragents-data](https://github.com/ShrekBytes/useragents-data)
- **User Agent Data**: Sourced from [useragents.me](https://useragents.me)

---

**Made with ❤️ for privacy-conscious users**

_Unga Bunga User-Agent - Take control of your browser's identity_
