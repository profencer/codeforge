# CodeForge Installation Guide

## 🚀 Quick Installation

### Option 1: Global Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/codeforge.git
cd codeforge

# Install globally
npm run install-global

# Verify installation
codeforge --version
```

### Option 2: Development Installation

```bash
# Clone the repository
git clone https://github.com/your-username/codeforge.git
cd codeforge

# Install dependencies
npm install

# Build the project
npm run build

# Link for development
npm run link

# Verify installation
codeforge --version
```

### Option 3: Local Usage

```bash
# Clone and build
git clone https://github.com/your-username/codeforge.git
cd codeforge
npm install
npm run build

# Use locally
npm run codeforge -- --help
# or
./bin/codeforge --help
```

## 📋 Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** 7.0.0 or higher
- **Git** (for repository operations)
- **Docker** (optional, for containerization features)

## 🔧 Verification

After installation, verify CodeForge is working:

```bash
# Check version
codeforge --version

# Show help
codeforge --help

# Create a sample project
mkdir my-test-project
cd my-test-project
codeforge sample --type blog

# Validate the sample
codeforge validate

# Generate API specs
codeforge generate specs
```

## 🛠️ Development Setup

For contributing to CodeForge:

```bash
# Clone and setup
git clone https://github.com/your-username/codeforge.git
cd codeforge
npm install

# Development commands
npm run dev -- sample --type blog    # Run in development mode
npm run build                        # Build TypeScript
npm run test                         # Run tests
npm run lint                         # Check code style
npm run lint:fix                     # Fix code style issues
```

## 📦 Project Structure

```
codeforge/
├── bin/
│   └── codeforge                    # Executable script
├── src/
│   ├── cli/                         # CLI commands
│   ├── core/                        # Core business logic
│   ├── generators/                  # Code generators
│   ├── schemas/                     # JSON schemas
│   └── utils/                       # Utility functions
├── dist/                            # Compiled JavaScript
├── package.json                     # Package configuration
└── README.md                        # Main documentation
```

## 🔄 Updating CodeForge

### Global Installation Update
```bash
cd codeforge
git pull origin main
npm run install-global
```

### Development Installation Update
```bash
cd codeforge
git pull origin main
npm install
npm run build
```

## 🗑️ Uninstallation

### Remove Global Installation
```bash
npm run uninstall-global
```

### Remove Development Link
```bash
npm run unlink
```

## 🐛 Troubleshooting

### Common Issues

**1. Command not found: codeforge**
```bash
# Check if globally installed
npm list -g codeforge

# Reinstall if needed
npm run install-global
```

**2. Permission errors on macOS/Linux**
```bash
# Fix permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

**3. Build errors**
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

**4. Schema not found errors**
```bash
# Ensure schemas are copied
npm run copy-schemas
```

### Getting Help

- **Documentation**: Check README.md and DEMO.md
- **Issues**: Create an issue on GitHub
- **CLI Help**: Run `codeforge --help` for command help

## 🎯 Next Steps

After installation:

1. **Create your first project**: `codeforge init my-api`
2. **Explore samples**: `codeforge sample --type ecommerce`
3. **Read the documentation**: Check README.md and DEMO.md
4. **Join the community**: Star the repository and contribute!

## 📝 Environment Variables

CodeForge supports these environment variables:

```bash
# GitHub integration
export GITHUB_TOKEN=your_github_token

# Default database
export CODEFORGE_DEFAULT_DB=postgresql

# Template directory
export CODEFORGE_TEMPLATES=/path/to/custom/templates
```

## 🔐 Security Notes

- Keep your GitHub token secure
- Review generated code before deployment
- Use environment variables for sensitive data
- Follow security best practices in generated applications

---

**Happy coding with CodeForge! 🚀**
