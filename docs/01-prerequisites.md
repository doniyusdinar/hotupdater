# Prerequisites

Before setting up your Hot Updater custom server, ensure you have the following software, tools, and access requirements.

## Required Software

### Docker & Docker Compose

Docker is required to containerize your Hot Updater server and PostgreSQL database.

**Installation:**

- **macOS**: Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
- **Windows**: Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- **Linux**:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  ```

**Verify Installation:**
```bash
docker --version
docker-compose --version
```

Expected output:
```
Docker version 24.0.0 or higher
Docker Compose version v2.20.0 or higher
```

### Node.js 20+

Node.js is required for the Hot Updater server and CLI tool.

**Installation:**

- **macOS** (using Homebrew):
  ```bash
  brew install node@20
  ```

- **Windows**: Download from [nodejs.org](https://nodejs.org/)

- **Linux** (using NodeSource):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

**Verify Installation:**
```bash
node --version
npm --version
```

Expected output:
```
v20.x.x or higher
10.x.x or higher
```

### Git

Git is required for version control and cloning the repository.

**Installation:**

- **macOS**: Usually pre-installed, or install via Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

- **Windows**: Download from [git-scm.com](https://git-scm.com/download/win)

- **Linux**:
  ```bash
  sudo apt-get install git  # Ubuntu/Debian
  sudo yum install git      # CentOS/RHEL
  ```

**Verify Installation:**
```bash
git --version
```

## Required Services & Accounts

### AWS Account with S3 Access

Hot Updater uses AWS S3 to store React Native bundle files.

**Requirements:**

1. Active AWS Account
2. S3 Bucket created
3. IAM User with programmatic access
4. IAM Policy with S3 permissions

**S3 Permissions Required:**

Your IAM user needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

**Create S3 Bucket:**

1. Go to AWS Console → S3
2. Click "Create bucket"
3. Choose a globally unique name
4. Select your region
5. Configure settings (block public access recommended)
6. Create bucket

**Create IAM User:**

1. Go to AWS Console → IAM → Users → "Create user"
2. Set username (e.g., `hot-updater`)
3. Select "Attach policies directly"
4. Create or attach the S3 policy above
5. After creation, go to "Security credentials" tab
6. Click "Create access key"
7. Select "Application running outside AWS"
8. Save the Access Key ID and Secret Access Key

### (Optional) Text Editor / IDE

Choose your preferred code editor:

- [VS Code](https://code.visualstudio.com/) (recommended)
- [WebStorm](https://www.jetbrains.com/webstorm/)
- [IntelliJ IDEA](https://www.jetbrains.com/idea/)
- Any other TypeScript-compatible editor

## Optional Tools

### Development Tools

These tools are helpful for local development:

- **ts-node**: For running TypeScript files directly
  ```bash
  npm install -g ts-node
  ```

- **nodemon**: For auto-restarting the server during development
  ```bash
  npm install -g nodemon
  ```

### Database Tools

For managing your PostgreSQL database:

- **pgAdmin**: [pgadmin.org](https://www.pgadmin.org/) - GUI tool
- **psql**: Command-line tool (included with PostgreSQL)
- **TablePlus**: [tableplus.com](https://tableplus.com/) - Multi-database GUI

### Docker Management Tools

- **OrbStack**: [orbstack.dev](https://orbstack.dev/) - Faster Docker alternative for macOS
- **Portainer**: [portainer.io](https://www.portainer.io/) - Docker management UI

## Knowledge Requirements

Basic familiarity with the following concepts is helpful:

### Essential

- Command-line interface (terminal)
- Environment variables
- REST APIs
- JSON

### Helpful (but not required)

- Docker containerization concepts
- PostgreSQL database basics
- React Native development
- AWS S3 storage
- TypeScript

## System Requirements

### Minimum

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disk**: 10 GB free space
- **OS**: Linux, macOS, or Windows with WSL2

### Recommended (Production)

- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Disk**: 50+ GB SSD
- **OS**: Linux (Ubuntu 20.04+ or Debian 11+)

## Network Requirements

### Outbound Access

Your server needs outbound internet access to:

- AWS S3 endpoints (`s3.[region].amazonaws.com`)
- npm registry (`registry.npmjs.org`)
- Any other storage provider you use

### Inbound Access

Your React Native apps need to reach:

- Hot Updater server (port 3000 by default)
- Or your reverse proxy (port 80/443 if using nginx/Apache)

## Next Steps

Once you have all prerequisites installed:

1. [Project Setup](02-project-setup.md) - Initialize the project and install dependencies
2. [Database Setup](03-database-setup.md) - Configure PostgreSQL database
3. [Docker Deployment](06-docker-deployment.md) - Deploy with Docker Compose

## Troubleshooting

### Docker Issues

**Problem:** `docker: command not found`

**Solution:** Make sure Docker is installed and added to your system PATH. Restart your terminal after installation.

**Problem:** Docker daemon not running (macOS/Windows)

**Solution:** Open Docker Desktop and wait for it to start. The whale icon in the menu bar/taskbar should be steady (not animating).

### Node.js Issues

**Problem:** Multiple Node.js versions installed

**Solution:** Use `nvm` (Node Version Manager) to manage versions:
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 20
nvm install 20
nvm use 20
```

### AWS Credentials Issues

**Problem:** Credentials not working

**Solution:**
1. Verify IAM user has correct permissions
2. Check that access keys are correctly copied
3. Ensure credentials are set in environment variables
4. Try testing with AWS CLI:
   ```bash
   aws s3 ls
   ```
