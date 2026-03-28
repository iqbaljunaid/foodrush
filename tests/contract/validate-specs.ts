import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse } from 'yaml';
import { validate } from '@readme/openapi-parser';

const SERVICES_DIR = resolve(import.meta.dirname, '../../services');

const SERVICES = [
  'order-service',
  'catalogue-service',
  'dispatch-service',
  'location-service',
  'notification-service',
  'payment-service',
] as const;

interface ValidationResult {
  service: string;
  valid: boolean;
  errors: string[];
}

export async function validateSpec(
  serviceName: string,
): Promise<ValidationResult> {
  const specPath = join(SERVICES_DIR, serviceName, 'openapi.yaml');
  const errors: string[] = [];

  if (!existsSync(specPath)) {
    return { service: serviceName, valid: false, errors: [`openapi.yaml not found at ${specPath}`] };
  }

  try {
    const raw = readFileSync(specPath, 'utf-8');
    const doc = parse(raw) as Record<string, unknown>;

    // Check OpenAPI version
    const version = doc['openapi'];
    if (typeof version !== 'string' || !version.startsWith('3.1')) {
      errors.push(`Expected OpenAPI 3.1.x, found: ${String(version)}`);
    }

    // Validate with parser (dereferences and validates)
    await validate(specPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Validation failed: ${message}`);
  }

  return { service: serviceName, valid: errors.length === 0, errors };
}

export async function validateAllSpecs(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const service of SERVICES) {
    const result = await validateSpec(service);
    results.push(result);
  }

  return results;
}

export function getServiceSpecPath(serviceName: string): string {
  return join(SERVICES_DIR, serviceName, 'openapi.yaml');
}

export function loadSpec(specPath: string): Record<string, unknown> {
  const raw = readFileSync(specPath, 'utf-8');
  return parse(raw) as Record<string, unknown>;
}

export { SERVICES, SERVICES_DIR };

// Run standalone
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  validateAllSpecs()
    .then((results) => {
      let hasFailure = false;
      for (const r of results) {
        if (r.valid) {
          console.log(`✓ ${r.service}`);
        } else {
          hasFailure = true;
          console.error(`✗ ${r.service}`);
          for (const e of r.errors) {
            console.error(`  - ${e}`);
          }
        }
      }
      if (hasFailure) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Validation failed:', err);
      process.exit(1);
    });
}
