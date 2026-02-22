# Contributing to OctoDos

Thank you for considering contributing to OctoDos! Every contribution makes this tool better.

## Code of Conduct

By contributing, you agree to uphold our community standards:
- Be respectful and inclusive
- Focus on constructive feedback
- This tool is for **authorized security testing ONLY**
- Do not contribute code designed for malicious purposes

## How to Contribute

### Reporting Bugs
1. Check existing issues to avoid duplicates
2. Open a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Node.js version and OS

### Suggesting Features
1. Open an issue with the "enhancement" label
2. Describe the feature and its use case
3. Explain how it improves security auditing

### Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Guidelines
- Use `const`/`let`, never `var`
- Add JSDoc comments for all functions
- Follow existing code style (2-space indent)
- Include error handling for all network operations
- Test changes locally before submitting

## Development Setup

```bash
git clone <repo-url>
cd octodos
npm install
node test-server.js  # Start test server
node index.js        # Run interactive mode
```

## Priority Areas

We especially welcome contributions in:
- 🛡️ New defensive analysis techniques
- 🔍 Additional recon/OSINT methods
- 🌐 Proxy source improvements
- 📊 Report generation enhancements
- 🧪 Test coverage improvements

*ZetaGo-Aurum © 2026*
