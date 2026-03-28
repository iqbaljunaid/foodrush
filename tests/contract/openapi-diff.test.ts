import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse } from 'yaml';
import { dereference } from '@readme/openapi-parser';
import {
  SERVICES,
  SERVICES_DIR,
  validateSpec,
  getServiceSpecPath,
  loadSpec,
} from './validate-specs.js';

function getGitBaseSpec(specPath: string): string | null {
  try {
    const relativePath = specPath.replace(
      resolve(import.meta.dirname, '../..') + '/',
      '',
    );
    return execSync(`git show HEAD:${relativePath}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // File not in git history yet — no baseline to compare
    return null;
  }
}

interface PathsObject {
  [path: string]: Record<string, unknown>;
}

function extractRoutes(
  spec: Record<string, unknown>,
): Array<{ path: string; method: string }> {
  const paths = spec['paths'] as PathsObject | undefined;
  if (!paths) return [];

  const routes: Array<{ path: string; method: string }> = [];
  const httpMethods = new Set([
    'get', 'post', 'put', 'patch', 'delete', 'options', 'head',
  ]);

  for (const [path, methods] of Object.entries(paths)) {
    for (const method of Object.keys(methods)) {
      if (httpMethods.has(method)) {
        routes.push({ path, method: method.toUpperCase() });
      }
    }
  }
  return routes;
}

interface DiffBreakingChange {
  type: string;
  path: string;
  message: string;
}

function findBreakingChanges(
  baseSpec: Record<string, unknown>,
  currentSpec: Record<string, unknown>,
): DiffBreakingChange[] {
  const changes: DiffBreakingChange[] = [];
  const basePaths = baseSpec['paths'] as PathsObject | undefined;
  const currentPaths = currentSpec['paths'] as PathsObject | undefined;

  if (!basePaths) return changes;
  if (!currentPaths) {
    changes.push({
      type: 'paths-removed',
      path: '/',
      message: 'All paths have been removed',
    });
    return changes;
  }

  // Check for removed paths
  for (const path of Object.keys(basePaths)) {
    if (!(path in currentPaths)) {
      changes.push({
        type: 'path-removed',
        path,
        message: `Path ${path} was removed`,
      });
      continue;
    }

    const baseMethods = basePaths[path] as Record<string, unknown>;
    const currentMethods = currentPaths[path] as Record<string, unknown>;

    // Check for removed methods
    for (const method of Object.keys(baseMethods)) {
      if (
        ['get', 'post', 'put', 'patch', 'delete'].includes(method) &&
        !(method in currentMethods)
      ) {
        changes.push({
          type: 'method-removed',
          path: `${method.toUpperCase()} ${path}`,
          message: `Method ${method.toUpperCase()} removed from ${path}`,
        });
      }
    }
  }

  // Check for removed required request body properties
  for (const [path, methods] of Object.entries(basePaths)) {
    if (!(path in currentPaths)) continue;
    const currentMethods = currentPaths[path] as Record<string, unknown>;

    for (const [method, operation] of Object.entries(
      methods as Record<string, unknown>,
    )) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const currentOp = currentMethods[method] as Record<string, unknown> | undefined;
      if (!currentOp) continue;

      // Check for added required fields in request body (breaking for clients)
      const baseReqBody = (operation as Record<string, unknown>)['requestBody'] as
        | Record<string, unknown>
        | undefined;
      const currentReqBody = currentOp['requestBody'] as
        | Record<string, unknown>
        | undefined;

      if (currentReqBody && !baseReqBody) {
        changes.push({
          type: 'request-body-added',
          path: `${method.toUpperCase()} ${path}`,
          message: `Required request body added to ${method.toUpperCase()} ${path}`,
        });
      }

      // Check for removed response codes
      const baseResponses = (operation as Record<string, unknown>)['responses'] as
        | Record<string, unknown>
        | undefined;
      const currentResponses = currentOp['responses'] as
        | Record<string, unknown>
        | undefined;

      if (baseResponses && currentResponses) {
        for (const code of Object.keys(baseResponses)) {
          if (!(code in currentResponses)) {
            changes.push({
              type: 'response-removed',
              path: `${method.toUpperCase()} ${path}`,
              message: `Response ${code} removed from ${method.toUpperCase()} ${path}`,
            });
          }
        }
      }
    }
  }

  return changes;
}

describe('OpenAPI Contract Tests', () => {
  describe.each(
    SERVICES.map((s) => ({ service: s })),
  )('$service', ({ service }) => {
    const specPath = getServiceSpecPath(service);

    it('should have an openapi.yaml file', () => {
      expect(
        existsSync(specPath),
        `${service} is missing openapi.yaml`,
      ).toBe(true);
    });

    it('should be a valid OpenAPI 3.1 spec', async () => {
      const result = await validateSpec(service);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('should parse and dereference without errors', async () => {
      const api = await dereference(specPath);
      expect(api).toBeDefined();
      expect(api.openapi).toMatch(/^3\.1/);
    });

    it('should have at least /healthz and /readyz routes', () => {
      const spec = loadSpec(specPath);
      const routes = extractRoutes(spec);
      const routePaths = routes.map((r) => r.path);
      expect(routePaths).toContain('/healthz');
      expect(routePaths).toContain('/readyz');
    });

    it('should define all routes with operationId', () => {
      const spec = loadSpec(specPath);
      const paths = spec['paths'] as PathsObject | undefined;
      if (!paths) return;

      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(
          methods as Record<string, unknown>,
        )) {
          if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
          const op = operation as Record<string, unknown>;
          expect(
            op['operationId'],
            `Missing operationId for ${method.toUpperCase()} ${path}`,
          ).toBeDefined();
        }
      }
    });

    it('should have no breaking changes compared to git HEAD', () => {
      const baseContent = getGitBaseSpec(specPath);
      if (baseContent === null) {
        // No baseline — spec is new, skip diff
        return;
      }

      const baseSpec = parse(baseContent) as Record<string, unknown>;
      const currentSpec = loadSpec(specPath);
      const breaking = findBreakingChanges(baseSpec, currentSpec);

      expect(
        breaking,
        `Breaking changes found:\n${breaking.map((c) => `  - ${c.message}`).join('\n')}`,
      ).toEqual([]);
    });
  });

  describe('Cross-service consistency', () => {
    it('should use consistent OpenAPI version across all services', () => {
      const versions = new Set<string>();

      for (const service of SERVICES) {
        const specPath = getServiceSpecPath(service);
        if (!existsSync(specPath)) continue;
        const spec = loadSpec(specPath);
        const version = spec['openapi'] as string;
        versions.add(version);
      }

      expect(
        versions.size,
        `Multiple OpenAPI versions found: ${[...versions].join(', ')}`,
      ).toBe(1);
    });

    it('should define Error schema consistently across services', () => {
      for (const service of SERVICES) {
        const specPath = getServiceSpecPath(service);
        if (!existsSync(specPath)) continue;
        const spec = loadSpec(specPath);
        const schemas = (
          spec['components'] as Record<string, unknown> | undefined
        )?.['schemas'] as Record<string, unknown> | undefined;
        if (!schemas) continue;

        const errorSchema = schemas['Error'] as Record<string, unknown> | undefined;
        if (errorSchema) {
          expect(errorSchema['type']).toBe('object');
        }
      }
    });
  });
});
