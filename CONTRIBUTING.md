# Contributing to NestJS Inngest

Thank you for your interest in contributing to NestJS Inngest! This document provides guidelines for contributing to the project.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nestjs-inngest.git
cd nestjs-inngest
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

## Project Structure

```
nestjs-inngest/
├── src/
│   ├── decorators/     # Function and configuration decorators
│   ├── interfaces/     # TypeScript interfaces and types
│   ├── module/         # NestJS module implementation
│   ├── services/       # Core services (InngestService, Explorer, Controller)
│   ├── utils/          # Utility functions and testing helpers
│   └── index.ts        # Main export file
├── test/               # Test files
├── examples/           # Usage examples
└── docs/               # Documentation
```

## Making Changes

1. Create a new branch from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following the existing code style

3. Add tests for new functionality

4. Update documentation if needed

5. Ensure all tests pass:
```bash
npm test
npm run build
npm run lint
```

6. Commit your changes:
```bash
git commit -m "feat: add new feature description"
```

## Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer composition over inheritance
- Keep functions small and focused

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` code style changes (formatting, etc.)
- `refactor:` code refactoring
- `test:` adding or updating tests
- `chore:` maintenance tasks

## Pull Request Process

1. Update the README.md if needed
2. Update version numbers following semantic versioning
3. Ensure CI passes
4. Request review from maintainers

## Testing

- Write unit tests for new functionality
- Update integration tests when needed
- Test with different NestJS and Inngest versions
- Include examples in the `/examples` directory

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments to public APIs
- Include examples for new features
- Update TypeScript interfaces and types

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a GitHub release
4. Publish to npm

## Getting Help

- Open an issue for bugs or feature requests
- Join discussions in GitHub Discussions
- Check existing issues and PRs before creating new ones

## License

By contributing to NestJS Inngest, you agree that your contributions will be licensed under the MIT License.