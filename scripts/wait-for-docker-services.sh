#!/bin/bash
# Wait for Docker Compose services to be healthy
# This script waits for all services to be running and critical services (sql) to be healthy.
# Non-critical services may remain unhealthy or have no healthcheck.

set -e

echo "Waiting for Docker Compose services to be ready..."
timeout=300
elapsed=0

# Get total number of services
total_services=$(docker compose config --services | wc -l)

# Critical services that MUST be healthy (have healthchecks and must pass)
critical_services=("sql")

while [ $elapsed -lt $timeout ]; do
  # Count running services
  running_services=$(docker compose ps --services --filter "status=running" | wc -l)
  
  # Check if any service exited
  if docker compose ps | grep -qE "Exit"; then
    echo "ERROR: One or more services exited"
    docker compose ps
    docker compose logs
    exit 1
  fi
  
  # Check if all services are running
  if [ "$running_services" -eq "$total_services" ]; then
    # All services running, now check health status
    # Get count of healthy services (services that have healthchecks and are healthy)
    healthy_count=$(docker compose ps --format json | jq -r 'select(.Health == "healthy") | .Service' | wc -l)
    
    # Count services with no healthcheck defined
    no_healthcheck_count=$(docker compose ps --format json | jq -r 'select(.Health == "") | .Service' | wc -l)
    
    # Count services still starting up
    starting_count=$(docker compose ps --format json | jq -r 'select(.Health == "starting" or .Health == "unhealthy") | .Service' | wc -l)
    
    # Check if critical services are healthy
    critical_healthy=true
    for service in "${critical_services[@]}"; do
      # Get health status for this specific service (use -r for raw output without quotes)
      service_health=$(docker compose ps --format json | jq -rs "map(select(.Service == \"$service\")) | .[0].Health // \"unknown\"")
      # Remove quotes from jq string output
      service_health=$(echo "$service_health" | tr -d '"')
      
      if [ "$service_health" != "healthy" ]; then
        critical_healthy=false
        echo "⏳ Critical service '$service' is not yet healthy (status: $service_health)"
        break
      fi
    done
    
    echo "Service health status: $healthy_count healthy, $starting_count starting/unhealthy, $no_healthcheck_count no healthcheck"
    
    if [ "$critical_healthy" = true ]; then
      echo "✅ All $total_services services are running and critical services are healthy!"
      docker compose ps
      exit 0
    fi
    
    echo "Waiting for critical services to be healthy..."
  else
    echo "Waiting for services to start... ($running_services/$total_services running)"
  fi
  
  sleep 5
  elapsed=$((elapsed + 5))
done

echo "❌ Timeout waiting for services after ${timeout}s"
docker compose ps
docker compose logs
exit 1
