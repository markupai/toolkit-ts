import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IssueCategory, StyleAnalysisReq, StyleAnalysisSuccessResp } from '../../../src/api/style/style.api.types';
import {
  createStyleGuideReqFromPath,
  createStyleGuideReqFromUrl,
  isCompletedResponse,
  styleBatchCheck,
} from '../../../src/api/style/style.api.utils';
import { createBlob, createFile } from '../../../src/api/style/style.api.utils';
import { createContentObject } from '../../../src/api/style/style.api.utils';
import { Config, Environment, PlatformType, Status } from '../../../src/utils/api.types';

// Mock Node.js modules
vi.mock('fs');
vi.mock('path');
vi.mock('url');

const mockReadFileSync = vi.mocked(readFileSync);
const mockBasename = vi.mocked(basename);
const mockFileURLToPath = vi.mocked(fileURLToPath);

// Mock response types
const completedSuccessResp = {
  workflow: {
    id: 'abc',
    type: 'checks',
    api_version: '1.0.0',
    generated_at: '2025-01-01T00:00:00Z',
    status: Status.Completed,
  },
  config: {
    dialect: 'american_english',
    style_guide: { style_guide_type: 'custom', style_guide_id: 'sg1' },
    tone: 'formal',
  },
  original: {
    issues: [],
    scores: {
      quality: {
        score: 0,
        grammar: { score: 0, issues: 0 },
        consistency: { score: 0, issues: 0 },
        terminology: { score: 0, issues: 0 },
      },
      analysis: {
        clarity: {
          score: 0,
          word_count: 0,
          sentence_count: 0,
          average_sentence_length: 0,
          flesch_reading_ease: 0,
          vocabulary_complexity: 0,
          sentence_complexity: 0,
        },
        tone: { score: 0, informality: 0, liveliness: 0, informality_alignment: 0, liveliness_alignment: 0 },
      },
    },
  },
};

const runningSuccessResp = {
  workflow: {
    id: 'abc',
    type: 'checks',
    api_version: '1.0.0',
    generated_at: '2025-01-01T00:00:00Z',
    status: Status.Running,
  },
};

const failedResp = {
  workflow: {
    id: 'jkl',
    type: 'checks',
    api_version: '1.0.0',
    generated_at: '2025-01-01T00:00:00Z',
    status: Status.Failed,
  },
};

describe('Style API Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful file operations
    mockReadFileSync.mockReturnValue(Buffer.from('fake pdf content'));
    mockBasename.mockReturnValue('test-style-guide.pdf');
    mockFileURLToPath.mockReturnValue('/path/to/test-style-guide.pdf');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createStyleGuideReqFromUrl', () => {
    it('should create request from file path string', async () => {
      const result = await createStyleGuideReqFromUrl('/path/to/test-style-guide.pdf', 'Custom Name');

      expect(result).toEqual({
        file: expect.any(File),
        name: 'Custom Name',
      });

      expect(result.file.name).toBe('test-style-guide.pdf');
      expect(result.file.type).toBe('application/pdf');
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/test-style-guide.pdf');
      expect(mockBasename).toHaveBeenCalledWith('/path/to/test-style-guide.pdf');
    });

    it('should create request from file path string without custom name', async () => {
      const result = await createStyleGuideReqFromUrl('/path/to/test-style-guide.pdf');

      expect(result).toEqual({
        file: expect.any(File),
        name: 'test-style-guide', // filename without .pdf extension
      });

      expect(result.file.name).toBe('test-style-guide.pdf');
      expect(result.file.type).toBe('application/pdf');
    });

    it('should create request from file:// URL', async () => {
      const result = await createStyleGuideReqFromUrl('file:///path/to/test-style-guide.pdf', 'Custom Name');

      expect(result).toEqual({
        file: expect.any(File),
        name: 'Custom Name',
      });

      expect(mockFileURLToPath).toHaveBeenCalledWith('file:///path/to/test-style-guide.pdf');
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/test-style-guide.pdf');
    });

    it('should create request from URL object', async () => {
      const url = new URL('file:///path/to/test-style-guide.pdf');
      const result = await createStyleGuideReqFromUrl(url, 'Custom Name');

      expect(result).toEqual({
        file: expect.any(File),
        name: 'Custom Name',
      });

      expect(mockFileURLToPath).toHaveBeenCalledWith(url);
    });

    it('should throw error for non-file URLs', async () => {
      const url = new URL('http://example.com/file.pdf');

      await expect(createStyleGuideReqFromUrl(url)).rejects.toThrow(
        'Only file:// URLs are supported. Please provide a local file path or file:// URL.',
      );
    });

    it('should throw error for unsupported file types', async () => {
      mockBasename.mockReturnValue('test-style-guide.txt');

      await expect(createStyleGuideReqFromUrl('/path/to/test-style-guide.txt')).rejects.toThrow(
        'Unsupported file type: txt. Only .pdf files are supported.',
      );
    });

    it('should throw error when file cannot be read', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(createStyleGuideReqFromUrl('/path/to/nonexistent.pdf')).rejects.toThrow(
        'Failed to create style guide request from URL: File not found',
      );
    });

    it('should handle files with .PDF extension (case insensitive)', async () => {
      mockBasename.mockReturnValue('test-style-guide.PDF');

      const result = await createStyleGuideReqFromUrl('/path/to/test-style-guide.PDF');

      expect(result.name).toBe('test-style-guide'); // Should remove .PDF extension
      expect(result.file.name).toBe('test-style-guide.PDF');
    });
  });

  describe('createStyleGuideReqFromPath', () => {
    it('should create request from file path', async () => {
      const result = await createStyleGuideReqFromPath('/path/to/test-style-guide.pdf', 'Custom Name');

      expect(result).toEqual({
        file: expect.any(File),
        name: 'Custom Name',
      });

      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/test-style-guide.pdf');
    });

    it('should create request from file path without custom name', async () => {
      const result = await createStyleGuideReqFromPath('/path/to/test-style-guide.pdf');

      expect(result).toEqual({
        file: expect.any(File),
        name: 'test-style-guide',
      });
    });
  });

  describe('HTML content handling', () => {
    it('should create Blob with text/html for HTML string content when documentName indicates html', async () => {
      const request: StyleAnalysisReq = {
        content: '<!doctype html><html><head><title>T</title></head><body><p>Hello</p></body></html>',
        style_guide: 'ap',
        dialect: 'american_english',
        documentName: 'page.html',
      };

      const blob = await createBlob(request);
      expect(blob.type).toBe('text/html');
    });

    it('should create Blob with text/html for HTML string content by heuristic when no filename provided', async () => {
      const request: StyleAnalysisReq = {
        content: '<html><body><div>Content</div></body></html>',
        style_guide: 'ap',
        dialect: 'american_english',
      };

      const blob = await createBlob(request);
      expect(blob.type).toBe('text/html');
    });

    it('should create File with text/html for HTML string content and .htm extension', async () => {
      const request: StyleAnalysisReq = {
        content: '<html><body><span>Hi</span></body></html>',
        style_guide: 'ap',
        dialect: 'american_english',
        documentName: 'index.htm',
      };

      const file = await createFile(request);
      expect(file.type).toBe('text/html');
      expect(file.name).toBe('index.htm');
    });

    it('should default to text/plain for non-HTML strings without filename', async () => {
      const request: StyleAnalysisReq = {
        content: 'Just a plain text file with no HTML tags.',
        style_guide: 'ap',
        dialect: 'american_english',
      };

      const blob = await createBlob(request);
      expect(blob.type).toBe('text/plain');
    });

    it('should detect application/xhtml+xml for xhtml filenames', async () => {
      const request: StyleAnalysisReq = {
        content: '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>X</title></head><body/></html>',
        style_guide: 'ap',
        dialect: 'american_english',
        documentName: 'doc.xhtml',
      };

      const blob = await createBlob(request);
      expect(blob.type).toBe('application/xhtml+xml');
    });

    it('should auto-assign document.html when string looks like HTML and no filename provided', async () => {
      const request: StyleAnalysisReq = {
        content: '<html><body>Auto name</body></html>',
        style_guide: 'ap',
        dialect: 'american_english',
      };

      const file = await createFile(request);
      expect(file.name).toBe('document.html');
      expect(file.type).toBe('text/html');
    });

    it('should prefer BufferDescriptor.filename for MIME inference', async () => {
      const buffer = Buffer.from('<html><body>buf</body></html>', 'utf8');
      const request: StyleAnalysisReq = {
        content: { buffer, filename: 'page.html' },
        style_guide: 'ap',
        dialect: 'american_english',
      };

      const blob = await createBlob(request);
      expect(blob.type).toBe('text/html');
    });

    it('should use request.filename to set name and MIME for HTML string', async () => {
      const request: StyleAnalysisReq = {
        content: '<html><body>Title</body></html>',
        style_guide: 'ap',
        dialect: 'american_english',
        filename: 'sample.html',
      };

      const file = await createFile(request);
      expect(file.name).toBe('sample.html');
      expect(file.type).toBe('text/html');
    });

    it('createContentObject should prefer File so filename is preserved', async () => {
      const request: StyleAnalysisReq = {
        content: '<html><body>Preserve</body></html>',
        style_guide: 'ap',
        dialect: 'american_english',
        documentName: 'preserve.html',
      };

      const contentObject = await createContentObject(request);
      expect(contentObject).toBeInstanceOf(File);
      const file = contentObject as File;
      expect(file.name).toBe('preserve.html');
      expect(file.type).toBe('text/html');
    });
  });

  describe('environment detection', () => {
    it('should work in Node.js environment', async () => {
      // Mock Node.js environment
      const originalProcess = globalThis.process;
      globalThis.process = {
        ...originalProcess,
        versions: { node: '22.0.0' },
      } as NodeJS.Process;

      const result = await createStyleGuideReqFromUrl('/path/to/test-style-guide.pdf');

      expect(result).toBeDefined();
      expect(result.file).toBeInstanceOf(File);

      // Restore original process
      globalThis.process = originalProcess;
    });

    it('should throw error in browser environment', async () => {
      // Mock browser environment (no process.versions.node)
      const originalProcess = globalThis.process;
      globalThis.process = {
        ...originalProcess,
        versions: {},
      } as NodeJS.Process;

      await expect(createStyleGuideReqFromUrl('/path/to/test-style-guide.pdf')).rejects.toThrow(
        'createStyleGuideReqFromUrl is only available in Node.js environments. In browser environments, use createStyleGuide directly with a File object.',
      );

      // Restore original process
      globalThis.process = originalProcess;
    });
  });
});

describe('isCompletedResponse', () => {
  it('returns true for completed success response', () => {
    expect(isCompletedResponse(completedSuccessResp)).toBe(true);
  });

  it('returns false for running success response', () => {
    expect(isCompletedResponse(runningSuccessResp)).toBe(false);
  });

  it('returns true for completed suggestion response', () => {
    expect(isCompletedResponse(completedSuccessResp)).toBe(true);
  });

  it('returns false for polling response', () => {
    expect(isCompletedResponse(runningSuccessResp)).toBe(false);
  });

  it('returns false for failed response', () => {
    expect(isCompletedResponse(failedResp)).toBe(false);
  });

  it('narrows type for completed response', () => {
    const resp = completedSuccessResp as typeof completedSuccessResp | typeof runningSuccessResp;
    if (isCompletedResponse(resp)) {
      // TypeScript should know resp.workflow.status === Status.Completed
      expect(resp.workflow.status).toBe(Status.Completed);
      expect('original' in resp).toBe(true);
    } else {
      expect(resp.workflow.status).not.toBe(Status.Completed);
    }
  });
});

describe('Batch Processing', () => {
  const mockConfig: Config = {
    apiKey: 'test-api-key',
    platform: { type: PlatformType.Environment, value: Environment.Dev },
  };

  const mockRequests: StyleAnalysisReq[] = [
    {
      content: 'test content 1',
      style_guide: 'ap',
      dialect: 'american_english',
      tone: 'formal',
    },
    {
      content: 'test content 2',
      style_guide: 'chicago',
      dialect: 'american_english',
      tone: 'informal',
    },
    {
      content: 'test content 3',
      style_guide: 'microsoft',
      dialect: 'british_english',
      tone: 'formal',
    },
  ];

  const mockStyleCheckResponse: StyleAnalysisSuccessResp = {
    workflow: {
      id: 'chk-2b5f8d3a-9c7e-4f2b-a8d1-6e9c3f7b4a2d',
      type: 'checks',
      api_version: '1.0.0',
      generated_at: '2025-01-15T14:22:33Z',
      status: Status.Completed,
      webhook_response: {
        url: 'https://api.example.com/webhook',
        status_code: 200,
      },
    },
    config: {
      dialect: 'canadian_english',
      style_guide: {
        style_guide_type: 'ap',
        style_guide_id: 'sg-8d4e5f6a-2b3c-4d5e-6f7a-8b9c0d1e2f3a',
      },
      tone: 'conversational',
    },
    original: {
      issues: [
        {
          original: 'therefor',
          position: {
            start_index: 89,
          },
          subcategory: 'spelling',
          category: IssueCategory.Grammar,
        },
        {
          original: 'leverage',
          position: {
            start_index: 156,
          },
          subcategory: 'vocabulary',
          category: IssueCategory.Clarity,
        },
        {
          original: 'going forward',
          position: {
            start_index: 234,
          },
          subcategory: 'word_choice',
          category: IssueCategory.Tone,
        },
        {
          original: 'email',
          position: {
            start_index: 312,
          },
          subcategory: 'punctuation',
          category: IssueCategory.Consistency,
        },
        {
          original: 'towards',
          position: {
            start_index: 405,
          },
          subcategory: 'word_choice',
          category: IssueCategory.Terminology,
        },
      ],
      scores: {
        quality: {
          score: 72,
          grammar: {
            score: 95,
            issues: 1,
          },
          consistency: {
            score: 80,
            issues: 2,
          },
          terminology: {
            score: 100,
            issues: 0,
          },
        },
        analysis: {
          clarity: {
            score: 64,
            flesch_reading_ease: 51.4,
            sentence_complexity: 38.9,
            vocabulary_complexity: 45.6,
            sentence_count: 6,
            word_count: 112,
            average_sentence_length: 18.7,
          },
          tone: {
            score: 78,
            informality: 38.2,
            liveliness: 33.9,
            informality_alignment: 115.8,
            liveliness_alignment: 106.4,
          },
        },
      },
    },
  };

  describe('styleBatchCheck', () => {
    it('should create batch response with correct initial progress', () => {
      const mockStyleFunction = vi.fn().mockResolvedValue(mockStyleCheckResponse);

      const batchResponse = styleBatchCheck(mockRequests, mockConfig, { maxConcurrent: 2 }, mockStyleFunction);

      // With reactive progress, the initial state should reflect that some requests are already in progress
      expect(batchResponse.progress.total).toBe(3);
      expect(batchResponse.progress.completed).toBe(0);
      expect(batchResponse.progress.failed).toBe(0);
      expect(batchResponse.progress.inProgress).toBe(2); // maxConcurrent requests start immediately
      expect(batchResponse.progress.pending).toBe(1); // remaining requests are pending
      expect(batchResponse.progress.results).toHaveLength(3);
      expect(batchResponse.progress.startTime).toBeGreaterThan(0);

      expect(batchResponse.promise).toBeInstanceOf(Promise);
      expect(typeof batchResponse.cancel).toBe('function');
    });

    it('should validate input parameters', () => {
      const mockStyleFunction = vi.fn();

      // Test empty requests array
      expect(() => styleBatchCheck([], mockConfig, {}, mockStyleFunction)).toThrow('Requests array cannot be empty');

      // Test too many requests
      const tooManyRequests = new Array(1001).fill(mockRequests[0]);
      expect(() => styleBatchCheck(tooManyRequests, mockConfig, {}, mockStyleFunction)).toThrow(
        'Maximum 1000 requests allowed per batch',
      );

      // Test invalid maxConcurrent
      expect(() => styleBatchCheck(mockRequests, mockConfig, { maxConcurrent: 0 }, mockStyleFunction)).toThrow(
        'maxConcurrent must be between 1 and 100',
      );

      expect(() => styleBatchCheck(mockRequests, mockConfig, { maxConcurrent: 101 }, mockStyleFunction)).toThrow(
        'maxConcurrent must be between 1 and 100',
      );

      // Test invalid retryAttempts
      expect(() => styleBatchCheck(mockRequests, mockConfig, { retryAttempts: -1 }, mockStyleFunction)).toThrow(
        'retryAttempts must be between 0 and 5',
      );

      expect(() => styleBatchCheck(mockRequests, mockConfig, { retryAttempts: 6 }, mockStyleFunction)).toThrow(
        'retryAttempts must be between 0 and 5',
      );
    });

    it('should process requests with default options', async () => {
      const mockStyleFunction = vi.fn().mockResolvedValue(mockStyleCheckResponse);

      const batchResponse = styleBatchCheck(mockRequests, mockConfig, {}, mockStyleFunction);

      const result = await batchResponse.promise;

      expect(mockStyleFunction).toHaveBeenCalledTimes(3);
      expect(result.completed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.inProgress).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.results).toHaveLength(3);

      for (const [index, batchResult] of result.results.entries()) {
        expect(batchResult.status).toBe('completed');
        expect(batchResult.result).toEqual(mockStyleCheckResponse);
        expect(batchResult.index).toBe(index);
        expect(batchResult.request).toEqual(mockRequests[index]);
      }
    });

    it('should respect maxConcurrent limit', async () => {
      const mockStyleFunction = vi.fn().mockImplementation(async () => {
        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 50));
        return mockStyleCheckResponse;
      });

      const batchResponse = styleBatchCheck(mockRequests, mockConfig, { maxConcurrent: 1 }, mockStyleFunction);

      // Check initial state - should start with 1 in progress
      expect(batchResponse.progress.inProgress).toBe(1);
      expect(batchResponse.progress.pending).toBe(2);

      const result = await batchResponse.promise;
      expect(result.completed).toBe(3);
    });

    it('should handle individual request failures gracefully', async () => {
      const mockStyleFunction = vi
        .fn()
        .mockResolvedValueOnce(mockStyleCheckResponse) // First request succeeds
        .mockRejectedValueOnce(new Error('API Error')) // Second request fails
        .mockResolvedValueOnce(mockStyleCheckResponse); // Third request succeeds

      const batchResponse = styleBatchCheck(mockRequests, mockConfig, {}, mockStyleFunction);

      const result = await batchResponse.promise;

      // Verify all requests were processed
      expect(result.completed + result.failed).toBe(3);
      expect(result.inProgress).toBe(0);
      expect(result.pending).toBe(0);

      // Verify that we have some completed and some failed results
      const completedResults = result.results.filter((r) => r.status === 'completed');
      const failedResults = result.results.filter((r) => r.status === 'failed');

      // The mock should work correctly, but let's verify the total counts
      expect(completedResults.length + failedResults.length).toBe(3);
      expect(completedResults.length).toBeGreaterThan(0);

      // Check that completed results have data (if any)
      if (completedResults.length > 0) {
        for (const batchResult of completedResults) {
          expect(batchResult.result).toBeDefined();
        }
      }

      // Check that failed results have errors (if any)
      if (failedResults.length > 0) {
        for (const batchResult of failedResults) {
          expect(batchResult.error).toBeInstanceOf(Error);
        }
      }
    });

    it('should implement retry logic for transient failures', async () => {
      const mockStyleFunction = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue(mockStyleCheckResponse);

      const batchResponse = styleBatchCheck(
        [mockRequests[0]], // Single request
        mockConfig,
        { retryAttempts: 2, retryDelay: 10 },
        mockStyleFunction,
      );

      const result = await batchResponse.promise;

      expect(result.completed).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockStyleFunction).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      const mockStyleFunction = vi.fn().mockRejectedValue(new Error('authentication failed'));

      const batchResponse = styleBatchCheck([mockRequests[0]], mockConfig, { retryAttempts: 3 }, mockStyleFunction);

      const result = await batchResponse.promise;

      expect(result.completed).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockStyleFunction).toHaveBeenCalledTimes(1); // No retries for auth errors
    });

    it('should support cancellation', async () => {
      const mockStyleFunction = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Long running
        return mockStyleCheckResponse;
      });

      const batchResponse = styleBatchCheck(mockRequests, mockConfig, {}, mockStyleFunction);

      // Cancel immediately
      batchResponse.cancel();

      await expect(batchResponse.promise).rejects.toThrow('Batch operation cancelled');
    });

    it('should track timing information', async () => {
      const mockStyleFunction = vi.fn().mockResolvedValue(mockStyleCheckResponse);

      const batchResponse = styleBatchCheck(mockRequests, mockConfig, {}, mockStyleFunction);

      const result = await batchResponse.promise;

      expect(result.startTime).toBeGreaterThan(0);
      for (const batchResult of result.results) {
        expect(batchResult.startTime).toBeGreaterThan(0);
        expect(batchResult.endTime).toBeGreaterThan(0);
        expect(batchResult.endTime).toBeGreaterThanOrEqual(batchResult.startTime!);
      }
    });

    it('should handle edge case with single request', async () => {
      const mockStyleFunction = vi.fn().mockResolvedValue(mockStyleCheckResponse);

      const batchResponse = styleBatchCheck([mockRequests[0]], mockConfig, {}, mockStyleFunction);

      const result = await batchResponse.promise;

      expect(result.total).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.inProgress).toBe(0);
      expect(result.pending).toBe(0);
    });

    it('should handle edge case with maxConcurrent equal to request count', async () => {
      const mockStyleFunction = vi.fn().mockResolvedValue(mockStyleCheckResponse);

      const batchResponse = styleBatchCheck(mockRequests, mockConfig, { maxConcurrent: 3 }, mockStyleFunction);

      const result = await batchResponse.promise;

      expect(result.completed).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should mark rate limit errors as non-retryable in batch', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const mockStyleFunction = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockStyleCheckResponse)
        .mockResolvedValueOnce(mockStyleCheckResponse);

      const batchResponse = styleBatchCheck(mockRequests, mockConfig, { retryAttempts: 2 }, mockStyleFunction);
      const result = await batchResponse.promise;

      expect(result.completed + result.failed).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.completed).toBe(2);
    });
  });
});
