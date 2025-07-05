#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { InitCommand } from './commands/init';
import { GenerateCommand } from './commands/generate';
import { ValidateCommand } from './commands/validate';
import { PreviewCommand } from './commands/preview';
import { DeployCommand } from './commands/deploy';

const program = new Command();

// ASCII Art Banner
const banner = `
 ██████╗ ██████╗ ██████╗ ███████╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
██║     ██║   ██║██║  ██║█████╗  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
██║     ██║   ██║██║  ██║██╔══╝  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
╚██████╗╚██████╔╝██████╔╝███████╗██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
 ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
`;

function showBanner() {
  console.log(chalk.cyan(banner));
  console.log(
    boxen(
      chalk.white.bold('Code-First Backend Generation Platform\n') +
      chalk.gray('Transform data models into production-ready APIs'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        textAlignment: 'center'
      }
    )
  );
}

// Main program configuration
program
  .name('codeforge')
  .description('Code-first service for generating API specifications and scaffolding NestJS backends')
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--no-banner', 'Disable banner display')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.banner !== false) {
      showBanner();
    }
  });

// Initialize new project
program
  .command('init')
  .description('Initialize a new CodeForge project')
  .argument('<project-name>', 'Name of the project to create')
  .option('-d, --directory <dir>', 'Target directory (default: project name)')
  .option('-t, --template <template>', 'Project template', 'basic')
  .option('--skip-install', 'Skip npm install')
  .option('--git', 'Initialize git repository')
  .action(async (projectName, options) => {
    const initCommand = new InitCommand();
    await initCommand.execute(projectName, options);
  });

// Generate specifications and code
program
  .command('generate')
  .description('Generate API specifications and backend code')
  .argument('[type]', 'What to generate: specs, backend, docker, all', 'all')
  .option('-c, --config <file>', 'Configuration file path', 'codeforge.config.json')
  .option('-m, --model <file>', 'Data model file path', 'models/data-model.json')
  .option('-o, --output <dir>', 'Output directory', 'generated')
  .option('--overwrite', 'Overwrite existing files')
  .option('--dry-run', 'Show what would be generated without creating files')
  .action(async (type, options) => {
    const generateCommand = new GenerateCommand();
    await generateCommand.execute(type, options);
  });

// Validate data model
program
  .command('validate')
  .description('Validate data model and configuration')
  .option('-m, --model <file>', 'Data model file path', 'models/data-model.json')
  .option('-c, --config <file>', 'Configuration file path', 'codeforge.config.json')
  .option('--strict', 'Enable strict validation mode')
  .action(async (options) => {
    const validateCommand = new ValidateCommand();
    await validateCommand.execute(options);
  });

// Preview generated code
program
  .command('preview')
  .description('Preview generated code without creating files')
  .argument('[type]', 'What to preview: specs, backend, docker, all', 'all')
  .option('-c, --config <file>', 'Configuration file path', 'codeforge.config.json')
  .option('-m, --model <file>', 'Data model file path', 'models/data-model.json')
  .option('--format <format>', 'Output format: tree, list, detailed', 'tree')
  .action(async (type, options) => {
    const previewCommand = new PreviewCommand();
    await previewCommand.execute(type, options);
  });

// Deploy to GitHub
program
  .command('deploy')
  .description('Deploy generated code to GitHub repository')
  .argument('[target]', 'Deployment target: github, docker', 'github')
  .option('-c, --config <file>', 'Configuration file path', 'codeforge.config.json')
  .option('--token <token>', 'GitHub personal access token')
  .option('--private', 'Create private repository')
  .option('--push', 'Push initial commit')
  .action(async (target, options) => {
    const deployCommand = new DeployCommand();
    await deployCommand.execute(target, options);
  });

// Sample command to generate example data model
program
  .command('sample')
  .description('Generate sample data model and configuration')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('--type <type>', 'Sample type: blog, ecommerce, social', 'blog')
  .action(async (options) => {
    const { SampleCommand } = await import('./commands/sample');
    const sampleCommand = new SampleCommand();
    await sampleCommand.execute(options);
  });

// Info command to show project status
program
  .command('info')
  .description('Show project information and status')
  .option('-c, --config <file>', 'Configuration file path', 'codeforge.config.json')
  .action(async (options) => {
    const { InfoCommand } = await import('./commands/info');
    const infoCommand = new InfoCommand();
    await infoCommand.execute(options);
  });

// Error handling for async commands
process.on('uncaughtException', (error) => {
  console.error(chalk.red.bold('✗ Uncaught Exception:'));
  console.error(chalk.red(error.message));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red.bold('✗ Unhandled Rejection:'));
  console.error(chalk.red(String(reason)));
  process.exit(1);
});

// Parse command line arguments
program.parse();
