import { ProblemDetails as LocalProblemDetails } from './problem-details';
import { ProblemDetails as CanonicalProblemDetails } from '@assetsim/shared/error-models';

/**
 * Safeguard test to ensure the local ProblemDetails interface stays in sync
 * with the canonical version in @assetsim/shared/error-models
 * 
 * This test exists because we maintain a duplicate interface to work around
 * ng-packagr cross-library dependency issues during compilation.
 * 
 * If this test fails, it means the canonical ProblemDetails has been updated
 * and the local copy in libs/client/core/src/lib/models/problem-details.ts
 * needs to be synchronized.
 */
describe('ProblemDetails Interface Synchronization', () => {
  it('should have the same shape as the canonical ProblemDetails interface', () => {
    // Create test objects that satisfy both interfaces
    const testObject: LocalProblemDetails = {
      type: 'https://assetsim.com/errors/test',
      title: 'Test Error',
      status: 400,
      detail: 'Test detail message',
      instance: '/test/123',
      additionalProperty: 'test'
    };

    // If this compiles, both interfaces have the same required properties
    const canonicalTest: CanonicalProblemDetails = testObject;
    const localTest: LocalProblemDetails = canonicalTest;

    // Runtime check to ensure the object satisfies both interfaces
    expect(canonicalTest).toBeDefined();
    expect(localTest).toBeDefined();
    expect(testObject.type).toBe('https://assetsim.com/errors/test');
    expect(testObject.title).toBe('Test Error');
    expect(testObject.status).toBe(400);
    expect(testObject.detail).toBe('Test detail message');
  });

  it('should have all required properties in both interfaces', () => {
    // Test with minimal required properties
    const minimalObject: LocalProblemDetails = {
      type: 'https://assetsim.com/errors/minimal',
      title: 'Minimal Error',
      status: 500,
      detail: 'Minimal detail'
    };

    // Verify it can be assigned to canonical interface
    const canonicalMinimal: CanonicalProblemDetails = minimalObject;

    expect(canonicalMinimal.type).toBe('https://assetsim.com/errors/minimal');
    expect(canonicalMinimal.title).toBe('Minimal Error');
    expect(canonicalMinimal.status).toBe(500);
    expect(canonicalMinimal.detail).toBe('Minimal detail');
  });

  it('should support optional instance property in both interfaces', () => {
    const withInstance: LocalProblemDetails = {
      type: 'https://assetsim.com/errors/test',
      title: 'Test',
      status: 404,
      detail: 'Not found',
      instance: '/resource/456'
    };

    const canonicalWithInstance: CanonicalProblemDetails = withInstance;

    expect(canonicalWithInstance.instance).toBe('/resource/456');
  });

  it('should support additional extensibility properties in both interfaces', () => {
    const withExtensions: LocalProblemDetails = {
      type: 'https://assetsim.com/errors/validation',
      title: 'Validation Error',
      status: 400,
      detail: 'Invalid input',
      errors: [{ field: 'email', message: 'Invalid email format' }],
      traceId: 'abc-123-def'
    };

    const canonicalWithExtensions: CanonicalProblemDetails = withExtensions;

    // Access index signature properties using bracket notation
    expect(canonicalWithExtensions['errors']).toBeDefined();
    expect(canonicalWithExtensions['traceId']).toBe('abc-123-def');
  });

  /**
   * Type-level test: This function won't be called at runtime, but TypeScript
   * will validate that the interfaces are compatible at compile time.
   * If the canonical interface changes (e.g., a required property is added),
   * this will cause a compilation error.
   */
  function typeCompatibilityCheck() {
    // Test that local can be assigned to canonical
    const local: LocalProblemDetails = {} as LocalProblemDetails;
    const canonical: CanonicalProblemDetails = local;

    // Test that canonical can be assigned to local
    const canonical2: CanonicalProblemDetails = {} as CanonicalProblemDetails;
    const local2: LocalProblemDetails = canonical2;

    // Suppress unused variable warnings
    void canonical;
    void local2;
  }

  // Keep the function reference to ensure TypeScript checks it
  void typeCompatibilityCheck;
});
