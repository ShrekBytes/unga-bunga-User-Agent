# Development Guide

This guide covers development practices, architecture, and best practices for the Unga Bunga User-Agent extension.

## Architecture Overview

### Manifest V3 Structure

The extension follows the Manifest V3 architecture:

- **Service Worker**: `background.js` runs as a service worker, handling background tasks
- **Content Scripts**: `content.js` injects anti-detection measures into web pages
- **Popup Interface**: `popup.html/js/css` provides the user interface
- **Declarative Net Request**: Uses rules-based approach for modifying network requests

### Key Components

#### Background Script (Service Worker)

- Manages user agent data and settings
- Handles declarative net request rules
- Processes extension messages
- Manages auto-rotation timers

#### Content Script

- Injects anti-detection measures
- Overrides navigator APIs
- Protects against fingerprinting
- Runs at document start for maximum coverage

#### Popup Interface

- User-friendly control panel
- Real-time status updates
- Configuration management
- User agent selection and management

## Development Setup

### Prerequisites

- Node.js 16+
- Firefox 109+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/unga-bunga-User-Agent.git
cd unga-bunga-User-Agent

# Install dependencies
npm install

# Build the extension
npm run build
```

### Development Commands

```bash
# Development build
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Package for distribution
npm run package

# Clean build directory
npm run clean
```

## Code Standards

### JavaScript

- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use async/await for asynchronous operations
- Follow ESLint rules defined in `.eslintrc.json`

### Manifest V3 Best Practices

- Use `declarativeNetRequest` instead of `webRequest` blocking
- Minimize permissions to only what's necessary
- Use service workers for background tasks
- Implement proper error handling

### Security Considerations

- Validate all user inputs
- Sanitize data before injection
- Use content security policy
- Implement proper message validation

## Testing

### Manual Testing

1. Load the extension in Firefox using `about:debugging`
2. Test on various websites
3. Verify user agent spoofing works
4. Check anti-detection measures
5. Test different modes (all, whitelist, blacklist)

### Automated Testing

- ESLint for code quality
- Build validation
- Manifest validation

## Debugging

### Background Script

- Use `console.log()` for debugging
- Check browser console for errors
- Use Firefox DevTools for service worker debugging

### Content Script

- Check page console for injected script logs
- Verify script injection timing
- Test on different page types

### Popup

- Use browser console for popup debugging
- Check for runtime errors
- Verify message passing

## Building and Distribution

### Development Build

```bash
npm run dev
```

Creates a development build in the `dist/` directory.

### Production Build

```bash
npm run build
```

Creates a production-ready build with validation.

### Packaging

```bash
npm run package
```

Creates a distributable ZIP file.

## Common Issues and Solutions

### Manifest V3 Migration Issues

- **Problem**: `webRequest` blocking not working
- **Solution**: Use `declarativeNetRequest` with proper rules

- **Problem**: Background script not persisting
- **Solution**: Service workers have different lifecycle, use proper event handling

### Permission Issues

- **Problem**: Extension not working on certain sites
- **Solution**: Check `host_permissions` and ensure proper URL patterns

### Content Script Issues

- **Problem**: Script not injecting
- **Solution**: Verify `run_at` timing and `matches` patterns

## Performance Considerations

### Background Script

- Minimize storage operations
- Use efficient data structures
- Implement proper caching

### Content Script

- Minimize DOM manipulation
- Use efficient selectors
- Avoid blocking operations

### Network Requests

- Implement proper caching
- Use declarative rules efficiently
- Minimize rule updates

## Security Best Practices

### Input Validation

- Validate all user inputs
- Sanitize data before storage
- Implement proper escaping

### Message Passing

- Validate message structure
- Implement proper authentication
- Use secure communication channels

### Content Injection

- Sanitize injected content
- Use CSP headers
- Implement proper sandboxing

## Contributing

### Code Review Process

1. Fork the repository
2. Create a feature branch
3. Implement changes following standards
4. Test thoroughly
5. Submit pull request

### Testing Requirements

- Manual testing on multiple sites
- Cross-browser compatibility
- Performance impact assessment
- Security review

### Documentation

- Update README.md for user-facing changes
- Update DEVELOPMENT.md for technical changes
- Include code comments for complex logic
- Document API changes

## Resources

### Firefox Extension Development

- [Firefox WebExtensions Documentation](https://extensionworkshop.com/)
- [Manifest V3 Migration Guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration/)
- [Declarative Net Request API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest)

### JavaScript Best Practices

- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [ES6+ Features](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference)

### Security

- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
