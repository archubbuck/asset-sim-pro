# Multi-stage build for Azure SignalR Local Emulator
# Stage 1: Build stage with .NET SDK
# Note: Using .NET 6.0 SDK as it can install tools for any version
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build

# Install Azure SignalR Emulator as a .NET global tool
# Version 1.0.0-preview1-10809 pinned for compatibility with AssetSim Pro
# This version requires .NET Core 3.1 runtime
RUN dotnet tool install --global Microsoft.Azure.SignalR.Emulator --version 1.0.0-preview1-10809

# Stage 2: Runtime stage with ASP.NET Core 3.1 runtime (required by emulator)
FROM mcr.microsoft.com/dotnet/aspnet:3.1 AS runtime

# Copy the global tool from build stage
COPY --from=build /root/.dotnet/tools /root/.dotnet/tools

# Add .NET global tools to PATH
ENV PATH="${PATH}:/root/.dotnet/tools"

# Expose SignalR emulator port
EXPOSE 8888

# Set working directory
WORKDIR /app

# Run the Azure SignalR Emulator
# The emulator will use environment variables from docker-compose.yml:
# - Azure__SignalR__Emulator__Upstream__UrlPrefix
ENTRYPOINT ["asrs-emulator", "start"]
