/**
 * Shared utility for checking Docker service status
 */

import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Check if Docker services are running
 * @returns Object with running status and list of running services
 */
export function checkDockerServices(): {
  running: boolean;
  services: string[];
  dockerInstalled: boolean;
} {
  try {
    // Check if Docker daemon is running
    execSync('docker info', { stdio: 'ignore' });

    // Check which services are running
    const output = execSync(
      'docker compose ps --services --filter "status=running"',
      {
        cwd: path.resolve(__dirname, '..', '..'),
        encoding: 'utf-8',
      }
    );

    const runningServices = output
      .trim()
      .split('\n')
      .filter((s) => s.length > 0);

    return {
      running: runningServices.length > 0,
      services: runningServices,
      dockerInstalled: true,
    };
  } catch (error) {
    // Docker not installed, not running, or services not started
    return { running: false, services: [], dockerInstalled: false };
  }
}

/**
 * Check if specific service is running
 * @param serviceName Name of the Docker service to check
 * @returns True if the service is running
 */
export function checkDockerService(serviceName: string): boolean {
  const { services } = checkDockerServices();
  return services.includes(serviceName);
}
