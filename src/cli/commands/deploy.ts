import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Octokit } from '@octokit/rest';
import { ProjectConfig } from '../../core/types';

export class DeployCommand {
  async execute(target: string, options: any): Promise<void> {
    const spinner = ora('Loading configuration...').start();

    try {
      // Load configuration
      const configPath = path.resolve(process.cwd(), options.config);
      if (!await fs.pathExists(configPath)) {
        spinner.fail(chalk.red(`Configuration file not found: ${options.config}`));
        return;
      }

      const config: ProjectConfig = await fs.readJson(configPath);

      switch (target.toLowerCase()) {
        case 'github':
          await this.deployToGitHub(config, options, spinner);
          break;
        case 'docker':
          await this.deployToDocker(config, options, spinner);
          break;
        default:
          spinner.fail(chalk.red(`Unknown deployment target: ${target}`));
          return;
      }

    } catch (error) {
      spinner.fail(chalk.red('✗ Deployment failed'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private async deployToGitHub(config: ProjectConfig, options: any, spinner: ora.Ora): Promise<void> {
    spinner.text = 'Preparing GitHub deployment...';

    // Get GitHub token
    const token = options.token || process.env.GITHUB_TOKEN || config.github?.token;
    if (!token) {
      spinner.fail(chalk.red('GitHub token is required. Use --token option or set GITHUB_TOKEN environment variable'));
      return;
    }

    // Get repository owner
    const owner = config.github?.owner;
    if (!owner) {
      spinner.fail(chalk.red('GitHub owner is required in configuration'));
      return;
    }

    const octokit = new Octokit({ auth: token });
    const repoName = config.project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    try {
      spinner.text = 'Creating GitHub repository...';

      // Create repository
      const createRepoResponse = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: config.project.description || `${config.project.name} - Generated with CodeForge`,
        private: options.private || config.github?.private || false,
        auto_init: false,
        has_issues: true,
        has_projects: true,
        has_wiki: false
      });

      const repoUrl = createRepoResponse.data.html_url;
      const cloneUrl = createRepoResponse.data.clone_url;

      spinner.text = 'Uploading generated files...';

      // Check if generated directory exists
      const generatedDir = path.resolve(process.cwd(), 'generated');
      if (!await fs.pathExists(generatedDir)) {
        spinner.fail(chalk.red('Generated directory not found. Run "codeforge generate" first.'));
        return;
      }

      // Upload files to repository
      await this.uploadFilesToRepo(octokit, owner, repoName, generatedDir, spinner);

      if (options.push) {
        spinner.text = 'Creating initial commit...';
        // The files are already uploaded via GitHub API, so we don't need to push
      }

      spinner.succeed(chalk.green('✓ Successfully deployed to GitHub!'));

      // Show repository information
      console.log('\n' + chalk.cyan.bold('🎉 Repository Created:'));
      console.log(chalk.white(`  Repository: ${repoUrl}`));
      console.log(chalk.white(`  Clone URL: ${cloneUrl}`));
      
      if (config.github?.topics && config.github.topics.length > 0) {
        spinner.start('Adding repository topics...');
        await octokit.rest.repos.replaceAllTopics({
          owner,
          repo: repoName,
          names: config.github.topics
        });
        spinner.succeed('✓ Repository topics added');
      }

      this.showGitHubNextSteps(repoUrl, cloneUrl);

    } catch (error: any) {
      if (error.status === 422 && error.message && error.message.includes('name already exists')) {
        spinner.fail(chalk.red(`Repository ${owner}/${repoName} already exists`));
      } else {
        throw error;
      }
    }
  }

  private async uploadFilesToRepo(
    octokit: Octokit, 
    owner: string, 
    repo: string, 
    sourceDir: string, 
    spinner: ora.Ora
  ): Promise<void> {
    const files = await this.getAllFiles(sourceDir);
    
    for (const file of files) {
      const relativePath = path.relative(sourceDir, file);
      const content = await fs.readFile(file, 'utf-8');
      const encodedContent = Buffer.from(content).toString('base64');

      spinner.text = `Uploading ${relativePath}...`;

      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: relativePath,
        message: `Add ${relativePath}`,
        content: encodedContent,
        committer: {
          name: 'CodeForge',
          email: 'codeforge@example.com'
        },
        author: {
          name: 'CodeForge',
          email: 'codeforge@example.com'
        }
      });
    }

    // Create README.md if it doesn't exist
    const readmePath = path.join(sourceDir, 'README.md');
    if (!await fs.pathExists(readmePath)) {
      const readmeContent = this.generateRepositoryReadme(owner, repo);
      const encodedReadme = Buffer.from(readmeContent).toString('base64');

      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'README.md',
        message: 'Add README.md',
        content: encodedReadme,
        committer: {
          name: 'CodeForge',
          email: 'codeforge@example.com'
        },
        author: {
          name: 'CodeForge',
          email: 'codeforge@example.com'
        }
      });
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private generateRepositoryReadme(owner: string, repo: string): string {
    return `# ${repo}

This repository was generated using [CodeForge](https://github.com/codeforge/codeforge).

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional)

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/${owner}/${repo}.git
cd ${repo}
\`\`\`

2. Install dependencies:
\`\`\`bash
cd backend
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

4. Start the development server:
\`\`\`bash
npm run start:dev
\`\`\`

### Using Docker

1. Start with Docker Compose:
\`\`\`bash
docker-compose up -d
\`\`\`

### API Documentation

Once the server is running, you can access:

- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/v1/health

## Project Structure

\`\`\`
${repo}/
├── backend/           # NestJS backend application
├── specs/            # API specifications (OpenAPI/AsyncAPI)
├── docker-compose.yml # Docker configuration
└── README.md         # This file
\`\`\`

## Generated with CodeForge

This project was scaffolded using CodeForge, a code-first backend generation platform.

- **Data Models**: Defined using JSON Schema
- **API Specifications**: Auto-generated OpenAPI 3.0 and AsyncAPI 2.0
- **Backend**: Complete NestJS application with TypeORM
- **Infrastructure**: Docker configuration for easy deployment

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
`;
  }

  private async deployToDocker(config: ProjectConfig, options: any, spinner: ora.Ora): Promise<void> {
    spinner.text = 'Preparing Docker deployment...';

    // Check if Docker is available
    try {
      const { execSync } = require('child_process');
      execSync('docker --version', { stdio: 'ignore' });
    } catch (error) {
      spinner.fail(chalk.red('Docker is not installed or not available'));
      return;
    }

    const generatedDir = path.resolve(process.cwd(), 'generated');
    if (!await fs.pathExists(generatedDir)) {
      spinner.fail(chalk.red('Generated directory not found. Run "codeforge generate" first.'));
      return;
    }

    const backendDir = path.join(generatedDir, 'backend');
    if (!await fs.pathExists(backendDir)) {
      spinner.fail(chalk.red('Backend directory not found. Run "codeforge generate backend" first.'));
      return;
    }

    try {
      spinner.text = 'Building Docker image...';
      
      const { execSync } = require('child_process');
      const imageName = config.project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      
      // Build Docker image
      execSync(`docker build -t ${imageName}:latest .`, {
        cwd: backendDir,
        stdio: 'pipe'
      });

      spinner.text = 'Starting containers with Docker Compose...';
      
      // Start with docker-compose
      execSync('docker-compose up -d', {
        cwd: generatedDir,
        stdio: 'pipe'
      });

      spinner.succeed(chalk.green('✓ Successfully deployed with Docker!'));

      console.log('\n' + chalk.cyan.bold('🐳 Docker Deployment:'));
      console.log(chalk.white(`  Image: ${imageName}:latest`));
      console.log(chalk.white('  Application: http://localhost:3000'));
      console.log(chalk.white('  API Docs: http://localhost:3000/api/docs'));
      console.log(chalk.white('  Health Check: http://localhost:3000/api/v1/health'));

      this.showDockerNextSteps();

    } catch (error) {
      spinner.fail(chalk.red('Docker deployment failed'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  }

  private showGitHubNextSteps(repoUrl: string, cloneUrl: string): void {
    console.log('\n' + chalk.cyan.bold('Next steps:'));
    console.log(chalk.white('  1. Clone the repository locally:'));
    console.log(chalk.gray(`     git clone ${cloneUrl}`));
    console.log(chalk.white('  2. Set up the development environment:'));
    console.log(chalk.gray('     cd backend && npm install'));
    console.log(chalk.white('  3. Configure environment variables:'));
    console.log(chalk.gray('     cp .env.example .env'));
    console.log(chalk.white('  4. Start the development server:'));
    console.log(chalk.gray('     npm run start:dev'));
    console.log('\n' + chalk.gray(`Visit ${repoUrl} to manage your repository`));
  }

  private showDockerNextSteps(): void {
    console.log('\n' + chalk.cyan.bold('Next steps:'));
    console.log(chalk.white('  • View running containers: docker-compose ps'));
    console.log(chalk.white('  • View logs: docker-compose logs -f'));
    console.log(chalk.white('  • Stop containers: docker-compose down'));
    console.log(chalk.white('  • Rebuild and restart: docker-compose up -d --build'));
  }
}
