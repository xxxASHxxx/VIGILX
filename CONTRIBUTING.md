# 🤝 Contributing to VIGILX

First off, **thank you** for considering contributing to VIGILX! It's people like you that make VIGILX such a great tool for saving lives on Indian roads.

<br/>

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [How Can I Contribute?](#-how-can-i-contribute)
- [Development Setup](#-development-setup)
- [Style Guidelines](#-style-guidelines)
- [Commit Messages](#-commit-messages)
- [Pull Request Process](#-pull-request-process)

<br/>

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

<br/>

## 🚀 Getting Started

### First Time Contributors

New to open source? Here are some resources to help you get started:

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Understanding the GitHub Flow](https://guides.github.com/introduction/flow/)
- [GitHub's Guide to Forking](https://guides.github.com/activities/forking/)

### Issues

- Look for issues labeled `good first issue` - these are great for newcomers
- Issues labeled `help wanted` are looking for contributors
- Feel free to ask questions on any issue

<br/>

## 💡 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, browser, Node version)

### ✨ Suggesting Features

Feature requests are welcome! Please include:

- **Use case** - Why is this feature needed?
- **Proposed solution** - How should it work?
- **Alternatives considered** - Other ways to solve the problem

### 💻 Code Contributions

1. Pick an issue or create one
2. Comment that you're working on it
3. Fork and create a branch
4. Make your changes
5. Submit a pull request

<br/>

## 🛠️ Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/vigilx.git
cd vigilx

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/vigilx.git

# Install dependencies
npm install
cd backend && npm install && cd ..

# Create environment file
cp backend/.env.example backend/.env

# Start development servers
npm run dev
```

<br/>

## 🎨 Style Guidelines

### JavaScript/React

- Use **ES6+** features
- Prefer **functional components** with hooks
- Use **meaningful variable names**
- Add **comments** for complex logic
- Keep components **small and focused**

```javascript
// ✅ Good
const DrowsinessAlert = ({ level, onDismiss }) => {
  const isHighPriority = level > 0.8;
  
  return (
    <Alert priority={isHighPriority} onClose={onDismiss}>
      {isHighPriority ? 'Wake up!' : 'Stay alert'}
    </Alert>
  );
};

// ❌ Avoid
const Alert = (props) => {
  return <div onClick={props.x}>{props.l > 0.8 ? 'a' : 'b'}</div>;
};
```

### CSS

- Use **CSS variables** for theming
- Follow the existing **color scheme** (maroon/pink theme)
- Keep styles **modular** and component-scoped
- Use **responsive design** patterns

### Git Workflow

```
main
  └── develop
        └── feature/your-feature-name
        └── bugfix/issue-description
        └── hotfix/critical-fix
```

<br/>

## 📝 Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting) |
| `refactor` | Code refactoring |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat(dashboard): add driver fatigue score display
fix(sms): resolve rate limiting issue with Twilio
docs(readme): update installation instructions
refactor(alerts): simplify notification logic
```

<br/>

## 🔄 Pull Request Process

### Before Submitting

- [ ] Update documentation if needed
- [ ] Add/update tests if applicable
- [ ] Run `npm test` to ensure tests pass
- [ ] Run the app locally to verify changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this?

## Screenshots
If applicable, add screenshots

## Related Issues
Fixes #(issue number)
```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Celebrate! 🎉

<br/>

## 🏷️ Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature request |
| `good first issue` | Perfect for newcomers |
| `help wanted` | Extra attention needed |
| `documentation` | Documentation improvements |
| `priority: high` | Urgent issues |
| `priority: low` | Nice to have |

<br/>

## 💬 Getting Help

- **GitHub Issues** - For bugs and features
- **Discussions** - For questions and ideas
- **Email** - For private inquiries

<br/>

---

<div align="center">

### 🙏 Thank You!

Every contribution, no matter how small, helps make roads safer.

**Together, we can save lives.** ❤️

</div>
