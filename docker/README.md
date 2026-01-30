# Local Docker Images - AssetSim Pro

This directory contains Dockerfiles for locally built images used in AssetSim Pro's development environment.

## Overview

AssetSim Pro uses Docker Compose for local development (per ADR-003). While most services use official Microsoft images from `mcr.microsoft.com`, some services require custom local builds for full control over versioning and dependencies.

## SignalR Emulator

### Purpose

The Azure SignalR Local Emulator enables local development and testing of real-time communication features without connecting to Azure SignalR Service in the cloud.

### Why Local Build?

Microsoft distributes the Azure SignalR Local Emulator as a .NET global tool (`Microsoft.Azure.SignalR.Emulator`) but **does not publish an official Docker image**. Previously, AssetSim Pro used a community-maintained image (`klabbet/signalr-emulator`), but this project now builds its own image for:

- **Full control**: Direct dependency management and security scanning
- **Reproducibility**: Pin exact .NET SDK and emulator tool versions
- **Optimization**: Multi-stage builds reduce final image size
- **Transparency**: Clear Dockerfile shows exactly what's installed
- **Maintenance**: No dependency on third-party image availability

### Architecture

The SignalR emulator Dockerfile uses a **multi-stage build**:

1. **Build Stage** (`mcr.microsoft.com/dotnet/sdk:6.0`)
   - Installs .NET SDK 6.0 (can install tools for any .NET version)
   - Installs `Microsoft.Azure.SignalR.Emulator` version `1.0.0-preview1-10809` as a global tool
   - This stage is discarded after the build

2. **Runtime Stage** (`mcr.microsoft.com/dotnet/aspnet:3.1`)
   - Uses ASP.NET Core 3.1 runtime (required by emulator version `1.0.0-preview1-10809`)
   - Copies only the emulator tool binaries from build stage
   - Uses built-in `curl` for Docker health checks
   - Exposes port 8888
   - Runs `asrs-emulator start` as entrypoint

**Note on .NET Versions:** The emulator version `1.0.0-preview1-10809` requires .NET Core 3.1 runtime. The build stage uses .NET SDK 6.0 to install the tool, but the runtime stage uses .NET Core 3.1 to execute it.

### Version Pinning

**Current Version**: `1.0.0-preview1-10809`

This version is pinned for compatibility and reproducibility. The emulator is in preview, so version changes may introduce breaking changes.

### Building the Image

The image is built automatically by Docker Compose when needed:

```bash
# Build the SignalR emulator image
docker compose build signalr-emulator

# Build all images (if multiple local builds exist)
docker compose build

# Force rebuild (ignore cache)
docker compose build --no-cache signalr-emulator
```

### Image Tag

**Tag**: `signalr-emulator:local-1.0.0`

This tag indicates:
- Service name: `signalr-emulator`
- Build type: `local` (not pulled from registry)
- Emulator version: `1.0.0` (matching `1.0.0-preview1-10809`)

### Configuration

The emulator is configured via environment variables in `docker-compose.yml`:

```yaml
environment:
  - Azure__SignalR__Emulator__Upstream__UrlPrefix=http://host.docker.internal:7071
```

**Key Settings:**
- **Upstream URL**: Points to Azure Functions local dev server (port 7071)
- **Port**: 8888 (exposed to host machine)
- **Health Check**: Validates emulator is responding at `http://localhost:8888/`

### Connection String

Backend functions connect using this connection string (in `apps/backend/local.settings.json`):

```
Endpoint=http://localhost;Port=8999;AccessKey=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGH;Version=1.0;
```

**Note**: The connection string specifies `Port=8999` (emulator's internal format), but actual connections use port `8888`. This is standard emulator behavior.

## Testing and Verification

### 1. Build the Image

```bash
docker compose build signalr-emulator
```

**Expected Output**:
```
[+] Building 45.2s (12/12) FINISHED
 => [build 1/2] FROM mcr.microsoft.com/dotnet/sdk:8.0
 => [build 2/2] RUN dotnet tool install --global Microsoft.Azure.SignalR.Emulator --version 1.0.0-preview1-10809
 => [runtime 1/3] FROM mcr.microsoft.com/dotnet/aspnet:8.0
 => [runtime 2/3] RUN apt-get update && apt-get install -y wget
 => [runtime 3/3] COPY --from=build /root/.dotnet/tools /root/.dotnet/tools
 => exporting to image
 => => naming to docker.io/library/signalr-emulator:local-1.0.0
```

### 2. Verify Image Tag

```bash
docker images signalr-emulator:local-1.0.0
```

**Expected Output**:
```
REPOSITORY          TAG           IMAGE ID       CREATED         SIZE
signalr-emulator    local-1.0.0   abc123def456   2 minutes ago   220MB
```

### 3. Start the Service

```bash
docker compose up -d signalr-emulator
```

### 4. Check Service Health

```bash
docker compose ps signalr-emulator
```

**Expected Output**:
```
NAME                     STATUS                    PORTS
signalr-emulator         Up 10 seconds (healthy)   0.0.0.0:8888->8888/tcp
```

### 5. Test Connectivity

```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri http://localhost:8888/ -UseBasicParsing

# Unix/Linux/macOS
curl http://localhost:8888/
```

**Expected**: HTTP response (200 OK or similar), indicating emulator is running

### 6. Verify Backend Connection

Start the Azure Functions backend:

```bash
npm run backend:start
```

**Check logs for**:
```
Azure SignalR Service connection established
SignalR hub 'market-data' initialized
```

## Updating the Emulator Version

### When to Update

- New emulator versions are released with bug fixes or features
- Security vulnerabilities are patched
- Compatibility with newer .NET versions is needed

### Update Process

1. **Check for new versions** on [NuGet](https://www.nuget.org/packages/Microsoft.Azure.SignalR.Emulator):
   ```bash
   dotnet tool search Microsoft.Azure.SignalR.Emulator
   ```

2. **Update Dockerfile**:
   ```dockerfile
   # Change this line in docker/signalr-emulator/Dockerfile:
   RUN dotnet tool install --global Microsoft.Azure.SignalR.Emulator --version NEW_VERSION
   ```

3. **Update image tag** in `docker-compose.yml`:
   ```yaml
   signalr-emulator:
     build: ./docker/signalr-emulator
     image: signalr-emulator:local-NEW_VERSION
   ```

4. **Update this README** with new version number

5. **Rebuild and test**:
   ```bash
   # Force rebuild with no cache
   docker compose build --no-cache signalr-emulator
   
   # Test the new build
   docker compose up -d signalr-emulator
   npm run backend:start
   ```

6. **Verify compatibility**:
   - Run backend functions that use SignalR
   - Check frontend receives real-time updates
   - Run E2E tests: `npm run test:e2e`

7. **Commit changes**:
   ```bash
   git add docker/signalr-emulator/Dockerfile docker-compose.yml docker/README.md
   git commit -m "build(docker): update SignalR emulator to version NEW_VERSION"
   ```

### Rollback

If the new version causes issues:

```bash
# Revert Dockerfile and docker-compose.yml changes
git checkout HEAD -- docker/signalr-emulator/Dockerfile docker-compose.yml

# Rebuild previous version
docker compose build --no-cache signalr-emulator
docker compose up -d signalr-emulator
```

## Rebuild Triggers

Developers should rebuild the SignalR emulator image when:

1. **After `git pull`** that updates `docker/signalr-emulator/Dockerfile`
   ```bash
   git pull
   docker compose build signalr-emulator
   ```

2. **When Dockerfile version changes** (indicated by merge conflicts or git diff)
   ```bash
   git diff docker/signalr-emulator/Dockerfile
   docker compose build signalr-emulator
   ```

3. **When experiencing connection issues** (force clean rebuild)
   ```bash
   docker compose down
   docker rmi signalr-emulator:local-1.0.0
   docker compose build --no-cache signalr-emulator
   docker compose up -d
   ```

4. **When switching branches** with different emulator versions
   ```bash
   git checkout feature/new-signalr-version
   docker compose build signalr-emulator
   ```

## Troubleshooting

### Build Fails: "dotnet tool install failed"

**Symptom**: Build fails during `dotnet tool install` step

**Solution**:
- Check internet connectivity (NuGet download required)
- Verify version `1.0.0-preview1-10809` still exists on NuGet
- Try building with `--no-cache`: `docker compose build --no-cache signalr-emulator`

### Health Check Failing

**Symptom**: Container starts but health check shows "unhealthy"

**Solution**:
```bash
# Check container logs
docker compose logs signalr-emulator

# Verify port 8888 is not in use
netstat -ano | findstr :8888  # Windows
lsof -i :8888                 # Unix/Linux/macOS

# Test health check manually
docker compose exec signalr-emulator wget --no-verbose --tries=1 --spider http://localhost:8888/
```

### Backend Can't Connect

**Symptom**: Azure Functions logs show "SignalR connection failed"

**Solution**:
1. Verify emulator is running: `docker compose ps signalr-emulator`
2. Check connection string in `apps/backend/local.settings.json`
3. Ensure port 8888 is accessible from host:
   ```bash
   curl http://localhost:8888/
   ```
4. Check emulator logs: `docker compose logs signalr-emulator`

### Image Size Too Large

**Symptom**: Image exceeds 500MB

**Solution**: The multi-stage build should keep the image around 200-250MB. If larger:
- Verify multi-stage build is being used (check Dockerfile)
- Ensure only runtime stage is in final image
- Clean up apt cache: `rm -rf /var/lib/apt/lists/*`

## Additional Resources

- **[Azure SignalR Emulator Documentation](https://learn.microsoft.com/azure/azure-signalr/signalr-howto-emulator)**
- **[AssetSim Pro Architecture (ADR-003)](../ARCHITECTURE.md#adr-003-local-development-strategy)**
- **[Getting Started Guide](../GETTING_STARTED.md)**
- **[Backend README](../apps/backend/README.md)**

---

**Last Updated**: January 30, 2026  
**Emulator Version**: 1.0.0-preview1-10809  
**Maintainer**: AssetSim Pro Development Team
