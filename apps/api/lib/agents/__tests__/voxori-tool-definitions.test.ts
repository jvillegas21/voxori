import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildVapiHttpTool,
  buildVapiHttpTools,
  resolveApiBaseUrl,
} from '../voxori-tool-definitions';

describe('resolveApiBaseUrl', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.VOXORI_API_URL;
    delete process.env.API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  afterEach(() => {
    process.env = env;
  });

  it('prefers VOXORI_API_URL', () => {
    process.env.VOXORI_API_URL = 'https://api.voxori.test/';
    expect(resolveApiBaseUrl()).toBe('https://api.voxori.test');
  });

  it('falls back to API_BASE_URL then localhost', () => {
    process.env.API_BASE_URL = 'http://localhost:3002';
    expect(resolveApiBaseUrl()).toBe('http://localhost:3002');
  });
});

describe('buildVapiHttpTool', () => {
  it('wires server url, secret header, and explicit schema for log-lead', () => {
    const tool = buildVapiHttpTool('log-lead', 'https://api.example.com', 'secret-abc');

    expect(tool).toMatchObject({
      type: 'function',
      function: {
        name: 'log-lead',
        parameters: {
          required: ['caller_phone'],
          additionalProperties: false,
        },
      },
      server: {
        url: 'https://api.example.com/tools/log-lead',
        headers: { 'X-Voxori-Tool-Secret': 'secret-abc' },
      },
    });
  });

  it('includes record-consent required fields', () => {
    const tool = buildVapiHttpTool('record-consent', 'https://api.example.com', 's') as {
      function: { parameters: { required: string[] } };
    };

    expect(tool.function.parameters.required).toEqual(['consent_given']);
  });

  it('builds all requested tools', () => {
    const tools = buildVapiHttpTools(
      ['record-consent', 'search-listings'],
      'https://api.example.com',
      'secret'
    );
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => (t as { function: { name: string } }).function.name)).toEqual([
      'record-consent',
      'search-listings',
    ]);
  });
});
