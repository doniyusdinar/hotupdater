# Hot Updater - Custom Server Setup Guide

Self-hosted OTA (Over-The-Air) updates for React Native applications using Docker.

## Overview

Hot Updater is a self-hosted solution for delivering updates to React Native apps without going through the app store review process. This repository provides complete documentation and example configurations for running your own Hot Updater server using Docker.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React Native  │────▶│  Hot Updater     │────▶│      MySQL      │
│     Mobile App  │     │     Server       │     │    Database     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │     AWS S3       │
                        │  Bundle Storage  │
                        └──────────────────┘
```

### Components

1. **Hot Updater Server** - Express-based API server managing update metadata
2. **MySQL Database** - Stores bundle versions, channels, and app information
3. **AWS S3** - Stores the actual React Native bundle files
4. **CLI Tool** - Deploys bundles from your CI/CD pipeline
5. **React Native SDK** - Client-side library for checking and downloading updates

## Features

- Full control over your update infrastructure
- AWS S3 integration for reliable bundle storage
- MySQL 8.0 database for metadata management
- API key authentication for admin operations
- Docker-based deployment for easy setup
- Support for multiple update channels (production, staging, dev)
- Version-based and app-version-based update strategies
- TypeScript support throughout the stack

## Quick Start

### Prerequisites

Before you begin, ensure you have:

- Docker & Docker Compose installed
- Node.js 20+ (for local development)
- AWS Account with S3 access
- Git

See [docs/01-prerequisites.md](docs/01-prerequisites.md) for detailed requirements.

### 5-Minute Setup

1. **Clone this repository**
   ```bash
   git clone <your-repo-url>
   cd pahamify.infra.hot.updater
   ```

2. **Copy example environment file**
   ```bash
   cp examples/.env.example .env
   ```

3. **Configure your environment variables**
   Edit `.env` with your settings:
   ```env
   # Database
   DATABASE_URL=mysql://root:root@localhost:3307/hot_updater
   PORT=3000
   API_KEY=your-secret-api-key-here

   # AWS S3
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   S3_BUCKET_NAME=your-bucket-name
   ```

4. **Start the services**
   ```bash
   docker-compose up -d
   ```

5. **Generate database schema**
   ```bash
   docker-compose exec hot-updater npx hot-updater db generate src/hotUpdater.ts --yes
   ```

Your server is now running at `http://localhost:3000/hot-updater`

## Documentation

| Document | Description |
|----------|-------------|
| [Prerequisites](docs/01-prerequisites.md) | Required software and tools |
| [Project Setup](docs/02-project-setup.md) | Initialize project and install dependencies |
| [Database Setup](docs/03-database-setup.md) | Configure MySQL with Drizzle ORM |
| [Server Configuration](docs/04-server-configuration.md) | Create Hot Updater instance |
| [Framework Setup](docs/05-framework-setup.md) | Configure Express server with auth |
| [Docker Deployment](docs/06-docker-deployment.md) | Deploy with Docker Compose |
| [Storage Configuration](docs/07-storage-configuration.md) | Configure AWS S3 storage |
| [CLI Configuration](docs/08-cli-configuration.md) | Set up deployment CLI |
| [React Native Integration](docs/09-react-native-integration.md) | Integrate with mobile app |
| [Authentication & Security](docs/10-authentication-security.md) | Secure admin endpoints |
| [Deployment Checklist](docs/11-deployment-checklist.md) | Pre-deployment verification |
| [Troubleshooting](docs/12-troubleshooting.md) | Common issues and solutions |

## Example Files

Ready-to-use example configurations are available in the `examples/` directory:

- `package.json` - Required dependencies
- `src/drizzle.ts` - Database connection
- `src/hotUpdater.ts` - Hot Updater instance with AWS S3
- `src/index.ts` - Express server with API key auth
- `Dockerfile` - Multi-stage production build
- `docker-compose.yml` - Complete Docker setup
- `.env.example` - Environment variables template
- `hot-updater.config.ts` - CLI configuration

## API Endpoints

### Public Endpoints (React Native Clients)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hot-updater/version` | Get server version |
| GET | `/hot-updater/fingerprint/:platform/:hash/:channel/:minBundleId/:bundleId` | Check for updates by device fingerprint |
| GET | `/hot-updater/app-version/:platform/:version/:channel/:minBundleId/:bundleId` | Check for updates by app version |

### Admin Endpoints (Require API Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hot-updater/api/bundles` | List all bundles |
| GET | `/hot-updater/api/bundles/:id` | Get specific bundle |
| POST | `/hot-updater/api/bundles` | Create/update bundle |
| DELETE | `/hot-updater/api/bundles/:id` | Delete bundle |
| GET | `/hot-updater/api/bundles/channels` | List all channels |

## Technology Stack

- **Framework**: Express.js
- **Database**: MySQL 8.0 with Drizzle ORM
- **Storage**: AWS S3
- **Deployment**: Docker & Docker Compose
- **Language**: TypeScript
- **Authentication**: API Key (Bearer token)

## Security Considerations

- Always use strong API keys in production
- Store credentials in environment variables
- Never commit `.env` files to version control
- Use HTTPS in production
- Implement proper CORS policies
- Regularly rotate API keys
- Monitor access logs

## Development Workflow

1. **Local Development**
   ```bash
   npm run dev
   ```

2. **Deploy a Bundle**
   ```bash
   npx hot-updater deploy
   ```

3. **View Logs**
   ```bash
   docker-compose logs -f hot-updater
   ```

4. **Stop Services**
   ```bash
   docker-compose down
   ```

## Support

- Official Documentation: [hot-updater.dev](https://hot-updater.dev)
- GitHub Issues: [github.com/gronxbhot-updater](https://github.com/gronxbhot-updater)
- Troubleshooting Guide: [docs/12-troubleshooting.md](docs/12-troubleshooting.md)

## License

This documentation follows the same license as the Hot Updater project.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
