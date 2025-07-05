# CodeForge

A code-first service for generating API specifications and scaffolding NestJS backends from data models.

**🎯 CLI-first alternative to Amplication for developers who prefer code over GUI**

## 🚀 Quick Installation & Usage

### Installation Options

#### Option 1: Local Usage (Recommended for Testing)
```bash
# Clone and setup
git clone https://github.com/your-username/codeforge.git
cd codeforge
./setup.sh

# Use locally
./bin/codeforge --help
```

#### Option 2: Global Installation
```bash
# Clone and install globally
git clone https://github.com/your-username/codeforge.git
cd codeforge
npm run install-global

# Use anywhere
codeforge --help
```

#### Option 3: Development Setup
```bash
# For contributors
git clone https://github.com/your-username/codeforge.git
cd codeforge
npm install
npm run build
npm run link

# Use globally in development mode
codeforge --help
```

### Quick Start

```bash
# 1. Create a new project
mkdir my-api && cd my-api

# 2. Generate sample data model
codeforge sample --type blog

# 3. Validate the model
codeforge validate

# 4. Generate everything
codeforge generate all

# 5. Check what was created
codeforge info
```

## 🎯 Key Features

### ✅ **Complete Workflow**
```
Data Models → API Specs → NestJS Backend → GitHub Repo + Docker
```

### 🛠️ **What CodeForge Generates**

- **📄 API Specifications**: OpenAPI 3.0 & AsyncAPI 2.0
- **🏗️ NestJS Backend**: Complete TypeScript applications
- **🐳 Infrastructure**: Docker & docker-compose configurations
- **🔗 GitHub Integration**: Automatic repository creation
- **📚 Documentation**: Auto-generated Swagger docs
- **🔐 Authentication**: JWT-based auth system

### 🎮 **CLI Commands**

```bash
codeforge init <project>          # Initialize new project
codeforge sample --type <type>    # Generate sample (blog/ecommerce/social)
codeforge validate               # Validate data model & config
codeforge generate <type>        # Generate specs/backend/docker/all
codeforge preview <type>         # Preview generated files
codeforge info                   # Show project status
codeforge deploy github         # Deploy to GitHub
```

## 📊 Example: Blog API

### 1. Data Model Definition
```json
{
  "name": "BlogAPI",
  "version": "1.0.0",
  "entities": [
    {
      "name": "User",
      "fields": [
        {
          "name": "id",
          "dataType": { "type": "string", "format": "uuid" },
          "isPrimaryKey": true,
          "isGenerated": true
        },
        {
          "name": "email",
          "dataType": { "type": "string", "format": "email" },
          "isUnique": true
        }
      ]
    }
  ]
}
```

### 2. Generated Output
- **OpenAPI Spec**: Complete REST API documentation
- **NestJS Backend**: Controllers, services, entities, DTOs
- **Docker Setup**: Multi-container development environment
- **GitHub Repo**: Ready for deployment

## 🏗️ Architecture

### Technology Stack
- **Core**: Node.js + TypeScript
- **CLI**: Commander.js + Inquirer
- **Templates**: Handlebars
- **Validation**: Ajv + JSON Schema
- **Generated**: NestJS + TypeORM + PostgreSQL

### Project Structure
```
codeforge/
├── bin/codeforge              # Executable CLI script
├── src/
│   ├── cli/                   # CLI commands
│   ├── core/                  # Business logic
│   ├── generators/            # Code generators
│   └── schemas/               # JSON schemas
├── templates/                 # Generation templates
└── dist/                      # Compiled output
```

## 🎯 vs Amplication

| Feature | CodeForge | Amplication |
|---------|-----------|-------------|
| **Interface** | CLI-first | GUI-first |
| **Target Users** | Developers | Business users |
| **Data Models** | JSON Schema | Visual editor |
| **Workflow** | Automated CLI | Manual steps |
| **Customization** | Template-based | Plugin system |
| **Deployment** | GitHub integration | Cloud platform |

## 📚 Documentation

- **[INSTALLATION.md](INSTALLATION.md)** - Detailed installation guide
- **[DEMO.md](DEMO.md)** - Complete demo walkthrough
- **[Generated README](test-cli/README.md)** - Example project documentation

## 🔧 Development

### Prerequisites
- Node.js 16+
- npm 7+
- Git
- Docker (optional)

### Setup
```bash
git clone https://github.com/your-username/codeforge.git
cd codeforge
npm install
npm run build
npm test
```

### Contributing
1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📈 Roadmap

### Current Features ✅
- [x] Data model validation
- [x] OpenAPI/AsyncAPI generation
- [x] NestJS backend scaffolding
- [x] Docker infrastructure
- [x] GitHub integration
- [x] CLI interface

### Planned Features 🚧
- [ ] Custom templates
- [ ] Database migrations
- [ ] GraphQL support
- [ ] Microservices architecture
- [ ] Cloud deployment (AWS/GCP/Azure)
- [ ] Real-time features (WebSockets)

## 🎉 Success Stories

✅ **Production Ready**: Generated backends compile and run successfully
✅ **Developer Friendly**: Intuitive CLI with rich feedback
✅ **Complete Automation**: End-to-end workflow from models to deployment
✅ **Best Practices**: Generated code follows NestJS conventions
✅ **Type Safety**: Full TypeScript coverage

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/codeforge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/codeforge/discussions)
- **Documentation**: Check the docs/ directory

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for developers who prefer code over clicks**
