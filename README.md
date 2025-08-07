# Unga Bunga User-Agent

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://addons.mozilla.org/)

A powerful Firefox extension for user agent spoofing with smart filtering and privacy protection.

![Extension Icon](images/extension-icon.png)

## ✨ Features

- **🎯 Smart User Agent Management** - Real-time spoofing with intelligent device/browser matching
- **🎲 Smart Random Selection** - Filter by device (Android, iPhone, iPad, Linux, Mac, Windows) and browser (Chrome, Firefox, Edge, Opera, Safari, Vivaldi)
- **⏰ Auto-Random Intervals** - Automatic user agent rotation (1-60 minutes)
- **🎛️ Advanced Site Filtering** - Global, Whitelist, or Blacklist modes
- **🛠️ Custom User Agents** - Add and manage your own user agent strings
- **📊 Visual Status Indicators** - Color-coded badges (Red=OFF, Green=ALL, Blue=WL, Purple=BL)
- **🚀 Performance & Caching** - 24-hour caching with automatic updates

## 📦 Installation

### From Firefox Add-ons Store

1. Visit [Firefox Add-ons Store](https://addons.mozilla.org/)
2. Search for "Unga Bunga User-Agent"
3. Click "Add to Firefox"

### Manual Installation

1. Download the extension files
2. Open Firefox → `about:debugging` → "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `manifest.json`

## 🚀 Quick Start

1. **Enable** - Click extension icon and toggle "Enabled" switch
2. **Select** - Choose device/browser filters and click "Smart Random"
3. **Apply** - Click "Apply" to activate the user agent
4. **Verify** - Check the badge color (green = working)

![Quick Start](images/quick-start.png)

## 📖 Usage

### Basic Controls

- **Random UA** - Get a completely random user agent
- **Smart Random** - Get filtered random user agent
- **Reset Default** - Return to original browser user agent
- **Custom UA** - Enter your own user agent string

### Smart Filtering

- **Device**: Android, iPhone, iPad, Linux, Mac, Windows
- **Browser**: Chrome, Firefox, Edge, Opera, Safari, Vivaldi
- **Source**: All, Custom, Latest, Most Common

### Auto-Random

- Enable "Auto Smart Random" toggle
- Set interval (1-60 minutes)
- Extension changes user agents automatically

### Site Filtering

- **Global Mode** - Apply to all websites
- **Whitelist Mode** - Apply only to selected sites
- **Blacklist Mode** - Apply to all sites except selected ones

### Custom User Agents

- Add your own user agent strings
- Persistent storage and easy removal
- Integrates with all features

## 🎨 Badge Status

| Badge  | Color  | Status    | Meaning                          |
| ------ | ------ | --------- | -------------------------------- |
| 🔴 OFF | Red    | Disabled  | Extension off                    |
| 🟢 ALL | Green  | All Sites | Working globally                 |
| 🔵 WL  | Blue   | Whitelist | Working on whitelisted sites     |
| 🟣 BL  | Purple | Blacklist | Working except blacklisted sites |

## 🔒 Privacy & Security

- **No data collection** - Extension doesn't collect personal data
- **Local storage only** - All settings stored locally
- **No tracking** - No analytics or tracking
- **Secure caching** - 24-hour local cache
- **Minimal permissions** - Only necessary permissions

## 🔧 Troubleshooting

### Common Issues

- **Not working**: Check if enabled (badge should be green/blue/purple)
- **Badge not updating**: Reload extension in `about:debugging`
- **Site filtering**: Verify mode and site list
- **Auto-random**: Check toggle and interval settings

### Getting Help

- Check browser console (F12) for errors
- Reload extension if needed
- Open an issue on GitHub

## 🤝 Contributing

Found a bug or have a feature request? Open an issue or submit a pull request.

## 📄 License

GNU General Public License v3.0 - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- **User Agent Database**: [ShrekBytes/useragents-data](https://github.com/ShrekBytes/useragents-data)
- **User Agent Data**: [useragents.me](https://useragents.me)

---

**Made with ❤️ for privacy-conscious users**

_Unga Bunga User-Agent - Take control of your browser's identity_
