# Unga Bunga User-Agent

A powerful and user-friendly Firefox extension for advanced user agent spoofing with anti-detection measures.

## Features

- **Smart User Agent Management**: Automatically fetches and manages the latest user agents from multiple sources
- **Multiple Modes**: All sites, whitelist, or blacklist modes for flexible control
- **Anti-Detection**: Advanced fingerprinting protection and navigator API spoofing
- **Custom User Agents**: Add and manage your own custom user agent strings
- **Smart Random Selection**: Filter user agents by device, browser, and source preferences
- **Auto-Rotation**: Automatically rotate user agents at configurable intervals
- **Modern Architecture**: Built with Manifest V3 for Firefox 109+

## Installation

### From Source

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/unga-bunga-User-Agent.git
   cd unga-bunga-User-Agent
   ```

2. Open Firefox and navigate to `about:debugging`

3. Click "This Firefox" in the left sidebar

4. Click "Load Temporary Add-on" and select the `manifest.json` file

### Building and Packaging

```bash
# Install dependencies (if any)
npm install

# Build the extension
npm run build

# Package for distribution
npm run package
```

## Usage

### Basic Operation

1. **Enable/Disable**: Use the toggle switch to enable or disable the extension
2. **Select User Agent**: Choose from the list of available user agents or use random selection
3. **Apply Changes**: Click "Apply" to set the selected user agent

### Advanced Features

#### Modes

- **All Sites**: Apply user agent spoofing to all websites
- **Whitelist**: Only apply to specified domains
- **Blacklist**: Apply to all sites except specified domains

#### Smart Random

- Configure preferred device, browser, and source
- Use smart random to get contextually appropriate user agents
- Set up automatic rotation at configurable intervals

#### Custom User Agents

- Add your own user agent strings
- Manage and remove custom entries
- Integrate with the main user agent list

### Anti-Detection Features

The extension provides comprehensive protection against:

- User agent detection
- Platform fingerprinting
- Browser fingerprinting
- Canvas fingerprinting
- WebGL fingerprinting
- Audio fingerprinting
- Performance timing attacks

## Development

### Project Structure

```
unga-bunga-User-Agent/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker (background script)
├── content.js            # Content script for anti-detection
├── popup.js              # Popup interface logic
├── popup.html            # Popup interface HTML
├── popup.css             # Popup interface styles
├── icons/                # Extension icons
├── package.json          # Project configuration
└── README.md             # This file
```

### Key Technologies

- **Manifest V3**: Modern Firefox extension architecture
- **Declarative Net Request**: Efficient network request modification
- **Service Workers**: Background script execution
- **ES6+ JavaScript**: Modern JavaScript features
- **CSS3**: Modern styling with animations

### Browser Compatibility

- Firefox 109.0+
- Manifest V3 support required

## Security Features

- **Minimal Permissions**: Only requests necessary permissions
- **Host Permissions**: Granular control over which sites can be accessed
- **Secure Communication**: Uses browser.runtime messaging for secure communication
- **No External Scripts**: All code runs locally within the extension

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.1.0

- Migrated to Manifest V3
- Replaced deprecated webRequest blocking with declarativeNetRequest
- Updated to modern Firefox extension APIs
- Improved error handling and async patterns
- Enhanced anti-detection measures

### v1.0.0

- Initial release with Manifest V2
- Basic user agent spoofing functionality
- Anti-detection measures

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/unga-bunga-User-Agent/issues) page
2. Create a new issue with detailed information
3. Include Firefox version and extension version

## Acknowledgments

- User agent data provided by [ShrekBytes/useragents-data](https://github.com/ShrekBytes/useragents-data)
- Firefox WebExtensions API documentation
- Mozilla Developer Network resources
