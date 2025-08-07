# Unga Bunga User-Agent

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://addons.mozilla.org/)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/your-username/unga-bunga-User-Agent)

> Advanced user agent spoofing Firefox extension with anti-detection features, smart filtering, and modern minimal UI.

![Extension Screenshot](docs/images/extension-screenshot.png)

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [Advanced Options](#-advanced-options)
- [Badge Status Indicators](#-badge-status-indicators)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🔄 **Smart User Agent Management**

- **Automatic Updates**: Fetches latest user agents from multiple sources
- **Smart Filtering**: Filter by device type, browser, and source
- **Random Selection**: Intelligent random user agent selection based on preferences
- **Custom User Agents**: Add and manage your own user agent strings

![Smart Management](docs/images/smart-management.png)

### 🎯 **Advanced Site Control**

- **Global Mode**: Apply user agent to all websites
- **Whitelist Mode**: Apply user agent only to specific sites
- **Blacklist Mode**: Apply user agent everywhere except specified sites
- **Real-time Updates**: Changes apply immediately without page refresh

![Site Control](docs/images/site-control.png)

### 🎨 **Modern Minimal UI**

- **Clean Design**: Modern, clutter-free interface
- **Dark Theme**: Easy on the eyes with dark mode
- **Responsive Layout**: Optimized for different screen sizes
- **Intuitive Controls**: Easy-to-use toggle switches and buttons

![Modern UI](docs/images/modern-ui.png)

### 🔔 **Status Indicators**

- **Badge System**: Visual status indicator on extension icon
- **Color Coding**:
  - 🔴 Red "OFF" - Extension disabled
  - 🟢 Green "ALL" - All sites mode
  - 🔵 Blue "WL" - Whitelist mode
  - 🟣 Purple "BL" - Blacklist mode

![Badge Indicators](docs/images/badge-indicators.png)

### ⚡ **Performance Features**

- **Caching System**: 24-hour cache for user agent lists
- **Efficient Loading**: Fast startup and response times
- **Memory Optimized**: Minimal resource usage
- **Background Processing**: Non-blocking operations

### 🔧 **Advanced Options**

- **Collapsible Interface**: Advanced options hidden by default
- **Auto Random**: Automatic user agent rotation with configurable intervals
- **Device Targeting**: Specific device type selection
- **Browser Targeting**: Browser-specific user agent selection

![Advanced Options](docs/images/advanced-options.png)

## 📦 Installation

### From Source

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/unga-bunga-User-Agent.git
   cd unga-bunga-User-Agent
   ```

2. **Load in Firefox**
   - Open Firefox
   - Navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file

### From Firefox Add-ons Store

_Coming soon!_

## 🚀 Usage

### Basic Usage

1. **Enable the Extension**

   - Click the extension icon in the toolbar
   - Toggle the "Enabled" switch to activate

2. **Select a User Agent**

   - Choose from the filtered list based on your preferences
   - Use "Random UA" for quick random selection
   - Use "Smart Random" for targeted selection

3. **Apply Changes**
   - Click "Apply" to set the selected user agent
   - Changes take effect immediately

![Basic Usage](docs/images/basic-usage.png)

### Advanced Usage

#### **Device & Browser Filtering**

- Select your preferred device type (Android, iPhone, Mac, Windows, etc.)
- Choose your target browser (Chrome, Firefox, Safari, etc.)
- Filter by source (All, Custom, Latest, Most Common)

#### **Auto Random Mode**

- Enable "Auto Smart Random" toggle
- Set interval in minutes (1-60)
- Extension automatically rotates user agents based on preferences

#### **Site-Specific Control**

1. **Open Advanced Options**

   - Click "Show" in the Advanced Options section

2. **Choose Mode**

   - **All Sites**: Apply to all websites (default)
   - **Whitelist**: Apply only to specified sites
   - **Blacklist**: Apply everywhere except specified sites

3. **Manage Site Lists**
   - Click "Add Site" to add domains
   - Enter domain (e.g., `example.com`)
   - Remove sites by clicking the × button

![Site Management](docs/images/site-management.png)

## ⚙️ Advanced Options

### **Mode Selection**

| Mode      | Description                             | Badge Color |
| --------- | --------------------------------------- | ----------- |
| All Sites | Apply user agent to all websites        | 🟢 Green    |
| Whitelist | Apply only to specified sites           | 🔵 Blue     |
| Blacklist | Apply everywhere except specified sites | 🟣 Purple   |

### **Auto Random Configuration**

- **Interval**: 1-60 minutes
- **Smart Filtering**: Respects device/browser preferences
- **Background Operation**: Works even when popup is closed

### **Custom User Agents**

- Add your own user agent strings
- Persistent storage across sessions
- Easy removal with one click

## 🔔 Badge Status Indicators

The extension icon shows your current status:

| Status    | Badge  | Meaning                                     |
| --------- | ------ | ------------------------------------------- |
| Disabled  | 🔴 OFF | Extension is turned off                     |
| All Sites | 🟢 ALL | Working on all websites                     |
| Whitelist | 🔵 WL  | Working only on whitelisted sites           |
| Blacklist | 🟣 BL  | Working everywhere except blacklisted sites |

## 🛠️ Development

### **Project Structure**

```
unga-bunga-User-Agent/
├── manifest.json          # Extension manifest
├── background.js          # Background script
├── popup.html            # Popup interface
├── popup.js              # Popup logic
├── popup.css             # Styling
├── content.js            # Content script
├── icons/                # Extension icons
│   └── icon.svg
└── docs/                 # Documentation
    └── images/           # Screenshots and images
```

### **Key Components**

#### **Background Script (`background.js`)**

- User agent management and caching
- Request interception and modification
- Badge status updates
- Site list management

#### **Popup Interface (`popup.html/js/css`)**

- Modern minimal UI
- Real-time status updates
- Advanced options management
- Responsive design

#### **Content Script (`content.js`)**

- Anti-detection features
- User agent parsing
- Page integration

### **Building for Distribution**

1. **Create ZIP file**

   ```bash
   zip -r unga-bunga-user-agent.zip . -x "*.git*" "docs/*" "README.md"
   ```

2. **Submit to Firefox Add-ons Store**
   - Create developer account
   - Upload the ZIP file
   - Complete the submission process

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### **Reporting Issues**

- Use the [GitHub Issues](https://github.com/your-username/unga-bunga-User-Agent/issues) page
- Include detailed steps to reproduce
- Provide system information and Firefox version

### **Feature Requests**

- Open a new issue with the "enhancement" label
- Describe the feature and its benefits
- Include mockups if possible

### **Code Contributions**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**

- Follow existing code style
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation if needed

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright (C) 2024 Your Name

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

## 🙏 Acknowledgments

- **User Agent Data**: [ShrekBytes/useragents-data](https://github.com/ShrekBytes/useragents-data) for providing user agent lists
- **Firefox WebExtensions API**: Mozilla for the excellent extension platform
- **Open Source Community**: All contributors and users who provide feedback

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/your-username/unga-bunga-User-Agent/issues)
- **Documentation**: Check this README for usage instructions
- **Community**: Join discussions in the GitHub Discussions section

---

**Made with ❤️ by [Your Name](https://github.com/your-username)**

_Unga Bunga User-Agent - Advanced user agent spoofing for Firefox_
