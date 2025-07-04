import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { DataModelParser } from '../../core/data-model-parser';
import { ProjectConfig } from '../../core/types';

export class InitCommand {
  async execute(projectName: string, options: any): Promise<void> {
    const spinner = ora('Initializing CodeForge project...').start();

    try {
      // Determine target directory
      const targetDir = options.directory || projectName;
      const projectPath = path.resolve(process.cwd(), targetDir);

      // Check if directory already exists
      if (await fs.pathExists(projectPath)) {
        spinner.stop();
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${targetDir} already exists. Overwrite?`,
            default: false
          }
        ]);

        if (!overwrite) {
          console.log(chalk.yellow('✗ Project initialization cancelled'));
          return;
        }

        await fs.remove(projectPath);
        spinner.start('Initializing CodeForge project...');
      }

      // Create project directory structure
      await this.createProjectStructure(projectPath);
      spinner.text = 'Creating configuration files...';

      // Gather project information
      spinner.stop();
      const projectInfo = await this.gatherProjectInfo(projectName);
      spinner.start('Generating configuration...');

      // Create configuration files
      await this.createConfigFiles(projectPath, projectInfo);
      spinner.text = 'Creating sample data model...';

      // Create sample data model
      await this.createSampleDataModel(projectPath, options.template);
      spinner.text = 'Setting up project files...';

      // Create additional project files
      await this.createProjectFiles(projectPath, projectInfo);

      // Initialize git repository if requested
      if (options.git) {
        spinner.text = 'Initializing git repository...';
        await this.initializeGit(projectPath);
      }

      // Install dependencies if not skipped
      if (!options.skipInstall) {
        spinner.text = 'Installing dependencies...';
        await this.installDependencies(projectPath);
      }

      spinner.succeed(chalk.green('✓ Project initialized successfully!'));

      // Show next steps
      this.showNextSteps(targetDir, projectInfo);

    } catch (error) {
      spinner.fail(chalk.red('✗ Failed to initialize project'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private async createProjectStructure(projectPath: string): Promise<void> {
    const directories = [
      'models',
      'generated',
      'templates',
      'docs',
      '.codeforge'
    ];

    await fs.ensureDir(projectPath);
    
    for (const dir of directories) {
      await fs.ensureDir(path.join(projectPath, dir));
    }
  }

  private async gatherProjectInfo(defaultName: string): Promise<any> {
    return await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: defaultName,
        validate: (input) => input.length > 0 || 'Project name is required'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: `${defaultName} API generated with CodeForge`
      },
      {
        type: 'input',
        name: 'version',
        message: 'Initial version:',
        default: '1.0.0',
        validate: (input) => /^\d+\.\d+\.\d+$/.test(input) || 'Version must be in semver format (x.y.z)'
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author:',
        default: ''
      },
      {
        type: 'list',
        name: 'database',
        message: 'Database type:',
        choices: [
          { name: 'PostgreSQL', value: 'postgresql' },
          { name: 'MySQL', value: 'mysql' },
          { name: 'MongoDB', value: 'mongodb' },
          { name: 'SQLite', value: 'sqlite' }
        ],
        default: 'postgresql'
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Select features to include:',
        choices: [
          { name: 'Authentication & Authorization', value: 'auth', checked: true },
          { name: 'Swagger/OpenAPI Documentation', value: 'swagger', checked: true },
          { name: 'AsyncAPI Specifications', value: 'asyncapi', checked: false },
          { name: 'Docker Configuration', value: 'docker', checked: true },
          { name: 'Unit Testing Setup', value: 'testing', checked: true },
          { name: 'Logging & Monitoring', value: 'monitoring', checked: false }
        ]
      }
    ]);
  }

  private async createConfigFiles(projectPath: string, projectInfo: any): Promise<void> {
    const config: ProjectConfig = {
      project: {
        name: projectInfo.name,
        description: projectInfo.description,
        version: projectInfo.version,
        author: projectInfo.author
      },
      database: {
        type: projectInfo.database,
        host: 'localhost',
        port: this.getDefaultPort(projectInfo.database),
        database: projectInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
      },
      features: {
        authentication: projectInfo.features.includes('auth'),
        authorization: projectInfo.features.includes('auth'),
        swagger: projectInfo.features.includes('swagger'),
        asyncapi: projectInfo.features.includes('asyncapi'),
        docker: projectInfo.features.includes('docker'),
        testing: projectInfo.features.includes('testing'),
        logging: projectInfo.features.includes('monitoring'),
        monitoring: projectInfo.features.includes('monitoring')
      },
      generation: {
        outputDir: 'generated',
        templateDir: 'templates',
        overwrite: false,
        backup: true
      }
    };

    await fs.writeJson(
      path.join(projectPath, 'codeforge.config.json'),
      config,
      { spaces: 2 }
    );
  }

  private async createSampleDataModel(projectPath: string, template: string): Promise<void> {
    const parser = new DataModelParser();
    const sampleModel = parser.generateSample();

    // Customize based on template
    if (template === 'ecommerce') {
      // TODO: Create ecommerce-specific sample
    } else if (template === 'social') {
      // TODO: Create social media-specific sample
    }

    await fs.writeJson(
      path.join(projectPath, 'models', 'data-model.json'),
      sampleModel,
      { spaces: 2 }
    );
  }

  private async createProjectFiles(projectPath: string, projectInfo: any): Promise<void> {
    // Create README.md
    const readme = `# ${projectInfo.name}

${projectInfo.description}

## Getting Started

1. Review and modify the data model in \`models/data-model.json\`
2. Generate API specifications: \`codeforge generate specs\`
3. Generate NestJS backend: \`codeforge generate backend\`
4. Deploy to GitHub: \`codeforge deploy github\`

## Commands

- \`codeforge validate\` - Validate data model and configuration
- \`codeforge preview\` - Preview generated code
- \`codeforge generate specs\` - Generate OpenAPI/AsyncAPI specifications
- \`codeforge generate backend\` - Generate NestJS backend
- \`codeforge generate docker\` - Generate Docker configuration
- \`codeforge deploy github\` - Deploy to GitHub repository

## Project Structure

\`\`\`
${projectInfo.name}/
├── models/              # Data model definitions
├── generated/           # Generated code output
├── templates/           # Custom templates (optional)
├── docs/               # Documentation
└── codeforge.config.json # Project configuration
\`\`\`

Generated with [CodeForge](https://github.com/codeforge/codeforge)
`;

    await fs.writeFile(path.join(projectPath, 'README.md'), readme);

    // Create .gitignore
    const gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Generated files
generated/
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# CodeForge
.codeforge/cache/
`;

    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
  }

  private getDefaultPort(database: string): number {
    const ports: Record<string, number> = {
      postgresql: 5432,
      mysql: 3306,
      mongodb: 27017,
      sqlite: 0
    };
    return ports[database] || 5432;
  }

  private async initializeGit(projectPath: string): Promise<void> {
    const { execSync } = require('child_process');
    try {
      execSync('git init', { cwd: projectPath, stdio: 'ignore' });
      execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
      execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'ignore' });
    } catch (error) {
      // Git initialization is optional, don't fail the entire process
      console.warn(chalk.yellow('⚠ Failed to initialize git repository'));
    }
  }

  private async installDependencies(projectPath: string): Promise<void> {
    // This would install any project-specific dependencies
    // For now, we'll skip this as the generated code will have its own package.json
  }

  private showNextSteps(targetDir: string, projectInfo: any): void {
    console.log('\n' + chalk.green.bold('🎉 Project created successfully!'));
    console.log('\n' + chalk.cyan.bold('Next steps:'));
    console.log(chalk.white(`  1. cd ${targetDir}`));
    console.log(chalk.white('  2. Review the data model in models/data-model.json'));
    console.log(chalk.white('  3. Run: codeforge validate'));
    console.log(chalk.white('  4. Run: codeforge generate specs'));
    console.log(chalk.white('  5. Run: codeforge generate backend'));
    console.log('\n' + chalk.gray('For help: codeforge --help'));
  }
}
