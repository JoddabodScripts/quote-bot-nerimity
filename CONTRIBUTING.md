# Contributing to Quote Bot

Thank you for considering contributing to Quote Bot! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

Be respectful and constructive. We want this to be a welcoming community for everyone.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report:
- **Check existing issues** to avoid duplicates
- **Use the bug report template** when creating a new issue
- **Provide detailed information** including steps to reproduce

### Suggesting Enhancements

- **Use the feature request template** when suggesting new features
- **Explain why** the enhancement would be useful
- **Provide examples** of how it would work

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following our coding standards
4. **Test your changes** thoroughly
5. **Commit your changes** with clear messages
6. **Push to your fork** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request** using the PR template

## Development Setup

1. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/quote.git
   cd quote
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Nerimity bot token
   ```

4. **Run the bot:**
   ```bash
   npm start
   ```

### Project Structure

```
quote/
├── src/
│   ├── index.js           # Main bot logic and event handlers
│   └── canvasGenerator.js # Quote image generation
├── .env.example           # Environment variable template
├── package.json           # Dependencies and scripts
└── README.md              # Project documentation
```

## Coding Standards

### JavaScript Style

- Use **ES6+ features** (arrow functions, async/await, destructuring)
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes
- Use **UPPER_SNAKE_CASE** for constants
- **2 spaces** for indentation (consistent with existing code)
- **Semicolons** are optional but be consistent

### Code Quality

- **Write descriptive variable names** - no single letters except loop counters
- **Keep functions small and focused** - one responsibility per function
- **Add comments** for complex logic
- **Handle errors gracefully** - always catch promises and handle edge cases
- **Avoid console.log in production** - use proper logging if needed

### Example:

```javascript
// Good
async function generateQuoteImage(message, author) {
  try {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    // ... image generation logic
    return canvas.toBuffer();
  } catch (error) {
    console.error('Failed to generate quote:', error);
    throw error;
  }
}

// Bad
async function gen(m, a) {
  const c = createCanvas(800, 400);
  // ... no error handling
}
```

## Commit Guidelines

We follow conventional commit format for clear history:

### Commit Message Format

```
<type>(<scope>): <subject>

<body (optional)>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (deps, config, etc.)

### Examples

```bash
feat(canvas): add custom font support
fix(quote): handle long usernames properly
docs: update installation instructions
refactor(index): simplify message handler
chore(deps): update nerimity.js to v1.1.0
```

## Pull Request Process

1. **Update documentation** if you changed behavior or added features
2. **Test your changes** - make sure the bot runs without errors
3. **Follow the PR template** - fill out all sections
4. **Link related issues** using keywords (Fixes #123, Closes #456)
5. **Request review** from maintainers
6. **Be responsive** to feedback and requested changes

### PR Checklist

Before submitting, ensure:

- [ ] Code follows the project's coding standards
- [ ] Changes have been tested locally
- [ ] Documentation has been updated (if needed)
- [ ] Commit messages follow the conventional format
- [ ] No sensitive information (tokens, keys) in commits
- [ ] `.env.example` updated if new env vars added

## Testing Your Changes

### Manual Testing

1. **Start the bot** with `npm start`
2. **Test basic functionality:**
   - Bot connects successfully
   - Responds to mentions
   - Generates quote images correctly
   - Handles edge cases (long text, special characters, etc.)

3. **Test error scenarios:**
   - Invalid message formats
   - Missing permissions
   - Network issues

### What to Test

- ✅ Bot starts without errors
- ✅ Responds to @mentions
- ✅ Generates images for replied messages
- ✅ Handles long usernames (>20 chars)
- ✅ Handles long message text (>500 chars)
- ✅ Works in different server contexts

## Questions?

If you have questions about contributing:
- Open an issue with the "question" label
- Check existing discussions and issues
- Reach out to maintainers

## Thank You!

Your contributions make Quote Bot better for everyone. We appreciate your time and effort! 🎉
