# Unga Bunga User-Agent

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://addons.mozilla.org/)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/your-username/unga-bunga-User-Agent)

> **Protect your privacy and bypass website restrictions** with advanced user agent spoofing for Firefox.

![Extension Screenshot](docs/images/extension-screenshot.png)

## 🎯 What Can You Do?

### **🛡️ Protect Your Privacy**
- **Hide your real browser** from websites that track you
- **Bypass fingerprinting** techniques used by advertisers
- **Maintain anonymity** while browsing the web
- **Prevent tracking** based on your browser signature

### **🌐 Access Blocked Content**
- **Bypass website restrictions** that block certain browsers
- **Access mobile-only content** on desktop
- **View sites** that require specific browsers
- **Test websites** as different devices

### **⚡ Smart Automation**
- **Auto-rotate user agents** at set intervals
- **Smart filtering** by device and browser type
- **Site-specific rules** - apply only where you want
- **One-click random** user agent selection

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Why Use This Extension?](#-why-use-this-extension)
- [Features](#-features)
- [How to Use](#-how-to-use)
- [Advanced Features](#-advanced-features)
- [Installation](#-installation)
- [FAQ](#-faq)
- [Support](#-support)

## 🚀 Quick Start

1. **Install the extension** (see Installation section below)
2. **Click the extension icon** in your Firefox toolbar
3. **Toggle "Enabled"** to activate
4. **Choose a user agent** from the list or click "Random UA"
5. **Start browsing** - your user agent is now changed!

![Quick Start](docs/images/quick-start.png)

## 🤔 Why Use This Extension?

### **Privacy Protection**
Many websites can identify you by your browser's "fingerprint" - a unique combination of your browser type, operating system, and other details. This extension helps you:

- **Blend in with the crowd** by appearing as different browsers
- **Avoid tracking** from websites that identify your browser
- **Maintain privacy** while browsing sensitive content
- **Prevent fingerprinting** from advertisers and trackers

### **Access More Content**
Some websites block certain browsers or show different content based on your device. This extension lets you:

- **Access mobile sites** on desktop
- **View content** blocked for your browser
- **Test websites** as different devices
- **Bypass restrictions** that limit access

### **Smart Control**
Unlike other extensions, this one gives you precise control:

- **Choose exactly which sites** to apply the user agent to
- **Set automatic rotation** at your preferred intervals
- **Filter by device type** (mobile, desktop, tablet)
- **Select specific browsers** (Chrome, Safari, Firefox, etc.)

## ✨ Features

### 🔄 **Smart User Agent Management**
- **Real user agents** from actual browsers worldwide
- **Automatic updates** with the latest browser versions
- **Smart filtering** by device type and browser
- **Custom user agents** - add your own if needed

![Smart Management](docs/images/smart-management.png)

### 🎯 **Precise Site Control**
- **All Sites**: Apply to every website (default)
- **Whitelist**: Apply only to sites you choose
- **Blacklist**: Apply everywhere except sites you exclude
- **Instant changes** - no page refresh needed

![Site Control](docs/images/site-control.png)

### 🎨 **Easy-to-Use Interface**
- **Clean, modern design** that's easy to navigate
- **Dark theme** that's easy on the eyes
- **One-click actions** for common tasks
- **Visual status indicators** so you always know what's active

![Modern UI](docs/images/modern-ui.png)

### 🔔 **Status at a Glance**
The extension icon shows your current status with color-coded badges:

- 🔴 **Red "OFF"** - Extension is disabled
- 🟢 **Green "ALL"** - Working on all websites
- 🔵 **Blue "WL"** - Working only on whitelisted sites
- 🟣 **Purple "BL"** - Working everywhere except blacklisted sites

![Badge Indicators](docs/images/badge-indicators.png)

### ⚡ **Performance & Reliability**
- **Fast loading** - no delays when browsing
- **24-hour caching** - reduces network requests
- **Memory efficient** - minimal impact on browser performance
- **Reliable operation** - works consistently across all sites

## 🎮 How to Use

### **Basic Usage**

#### **1. Enable the Extension**
- Click the extension icon in your Firefox toolbar
- Toggle the "Enabled" switch to turn it on
- You'll see the badge change color to show it's active

#### **2. Select a User Agent**
- **Choose from the list**: Browse available user agents
- **Use "Random UA"**: Get a random user agent instantly
- **Use "Smart Random"**: Get a random user agent based on your preferences
- **Filter options**: Select device type, browser, and source

#### **3. Apply and Browse**
- Click "Apply" to set your chosen user agent
- Start browsing - the change takes effect immediately
- No need to refresh pages

![Basic Usage](docs/images/basic-usage.png)

### **Advanced Usage**

#### **Device & Browser Filtering**
- **Device Type**: Choose Android, iPhone, iPad, Mac, Windows, Linux
- **Browser Type**: Select Chrome, Firefox, Safari, Edge, Opera, Vivaldi
- **Source**: Filter by All, Custom, Latest, or Most Common user agents

#### **Auto Random Mode**
- **Enable "Auto Smart Random"** toggle
- **Set interval** (1-60 minutes)
- **Extension automatically rotates** user agents based on your preferences
- **Works in background** - no need to keep the popup open

#### **Site-Specific Control**
1. **Open Advanced Options** (click "Show")
2. **Choose your mode**:
   - **All Sites**: Apply to every website (default)
   - **Whitelist**: Apply only to sites you specify
   - **Blacklist**: Apply everywhere except sites you specify
3. **Manage your site lists**:
   - Click "Add Site" to add domains (e.g., `example.com`)
   - Remove sites by clicking the × button
   - Changes apply immediately

![Site Management](docs/images/site-management.png)

## ⚙️ Advanced Features

### **Mode Selection**

| Mode | What It Does | Best For |
|------|-------------|----------|
| All Sites | Applies user agent to every website | General privacy protection |
| Whitelist | Applies only to sites you choose | Selective protection |
| Blacklist | Applies everywhere except specified sites | Block specific sites from spoofing |

### **Auto Random Configuration**
- **Set your interval**: 1-60 minutes
- **Smart filtering**: Respects your device/browser preferences
- **Background operation**: Works even when popup is closed
- **Automatic rotation**: Keeps your fingerprint changing

### **Custom User Agents**
- **Add your own**: Enter custom user agent strings
- **Persistent storage**: Your custom agents are saved
- **Easy management**: Remove with one click
- **Full control**: Use any user agent string you want

## 📦 Installation

### **From Source (Recommended)**

1. **Download the extension**
   - Click the green "Code" button on GitHub
   - Select "Download ZIP"
   - Extract the ZIP file to a folder

2. **Install in Firefox**
   - Open Firefox
   - Type `about:debugging` in the address bar
   - Click "This Firefox" in the sidebar
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the extracted folder

3. **Start using**
   - The extension icon will appear in your toolbar
   - Click it to open the popup and start configuring

### **From Firefox Add-ons Store**

*Coming soon! The extension will be available on the official Firefox Add-ons store.*

## ❓ FAQ

### **Is this extension safe to use?**
Yes! The extension only changes your browser's user agent string and doesn't collect any personal data. All settings are stored locally on your device.

### **Will this break websites?**
Most websites work perfectly with changed user agents. Some sites might show different layouts (mobile vs desktop), but functionality remains the same.

### **Can websites still track me?**
This extension helps protect against browser fingerprinting, but other tracking methods (cookies, IP address, etc.) may still work. For complete privacy, combine with other privacy tools.

### **Why do I need to reload the extension?**
The extension loads user agent data from the internet. If you're offline or the data source is unavailable, the extension will use built-in fallback user agents.

### **Can I use this with other privacy extensions?**
Yes! This extension works well with other privacy tools like uBlock Origin, Privacy Badger, and others.

### **Will this affect my browsing speed?**
No noticeable impact on speed. The extension uses efficient caching and minimal resources.

## 🆘 Support

### **Need Help?**
- **Check this README** for usage instructions
- **Try the FAQ** section above
- **Report issues** on GitHub if something isn't working

### **Want to Contribute?**
- **Report bugs** with detailed steps to reproduce
- **Suggest features** that would be useful
- **Share your experience** with other users

### **Get in Touch**
- **GitHub Issues**: [Report problems or request features](https://github.com/your-username/unga-bunga-User-Agent/issues)
- **Documentation**: This README contains all the information you need
- **Community**: Join discussions in GitHub Discussions

## 📄 License

This project is licensed under the GNU General Public License v3.0. This means you're free to use, modify, and distribute the extension, but any modifications must also be open source.

---

**Made with ❤️ by [Your Name](https://github.com/your-username)**

*Unga Bunga User-Agent - Protect your privacy, access more content*
