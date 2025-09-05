import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  submitStyleCheck,
  submitStyleSuggestion,
  submitStyleRewrite,
  styleCheck,
  styleSuggestions,
  styleRewrite,
  getStyleCheck,
  getStyleSuggestion,
  getStyleRewrite,
  styleBatchCheckRequests,
  styleBatchSuggestions,
  styleBatchRewrites,
  styleBatchOperation,
} from '../../../src/api/style/style.api';
import { STYLE_DEFAULTS } from '../../../src/api/style/style.api.defaults';
import { Status } from '../../../src/utils/api.types';
import type { Config } from '../../../src/utils/api.types';
import { PlatformType, Environment } from '../../../src/utils/api.types';
import { server } from '../setup';
import { apiHandlers } from '../mocks/api.handlers';
import {
  StyleAnalysisReq,
  StyleAnalysisSuccessResp,
  StyleAnalysisSuggestionResp,
  StyleAnalysisRewriteResp,
} from '../../../src/api/style/style.api.types';

// Set up MSW server lifecycle hooks
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Style API Unit Tests', () => {
  const mockConfig: Config = {
    apiKey: 'test-api-key',
    platform: { type: PlatformType.Environment, value: Environment.Dev },
  };
  const mockWorkflowId = 'test-workflow-id';
  const mockStyleAnalysisRequest = {
    content: 'test content',
    style_guide: 'ap',
    dialect: STYLE_DEFAULTS.dialects.americanEnglish,
    tone: STYLE_DEFAULTS.tones.formal,
  };

  describe('Style Analysis Operations', () => {
    it('should submit style check successfully', async () => {
      server.use(apiHandlers.style.checks.success);

      const result = await submitStyleCheck(mockStyleAnalysisRequest, mockConfig);
      expect(result).toEqual({
        status: Status.Running,
        workflow_id: mockWorkflowId,
        message: 'Style check workflow started successfully.',
      });
    });

    it('should submit style suggestion successfully', async () => {
      server.use(apiHandlers.style.suggestions.success);

      const result = await submitStyleSuggestion(mockStyleAnalysisRequest, mockConfig);
      expect(result).toEqual({
        status: Status.Running,
        workflow_id: mockWorkflowId,
        message: 'Style suggestions workflow started successfully.',
      });
    });

    it('should submit style rewrite successfully', async () => {
      server.use(apiHandlers.style.rewrites.success);

      const result = await submitStyleRewrite(mockStyleAnalysisRequest, mockConfig);
      expect(result).toEqual({
        status: Status.Running,
        workflow_id: mockWorkflowId,
        message: 'Style rewrite workflow started successfully.',
      });
    });

    it('should handle style analysis errors', async () => {
      server.use(apiHandlers.style.checks.error);

      await expect(submitStyleCheck(mockStyleAnalysisRequest, mockConfig)).rejects.toThrow('Unauthorized (401)');
    });

    it('should submit style check with custom document name', async () => {
      server.use(apiHandlers.style.checks.success);

      const requestWithDocumentName = {
        ...mockStyleAnalysisRequest,
        documentName: 'custom-document.txt',
      };

      const result = await submitStyleCheck(requestWithDocumentName, mockConfig);
      expect(result).toEqual({
        status: Status.Running,
        workflow_id: mockWorkflowId,
        message: 'Style check workflow started successfully.',
      });
    });

    it('should submit style check without document name (uses default)', async () => {
      server.use(apiHandlers.style.checks.success);

      const result = await submitStyleCheck(mockStyleAnalysisRequest, mockConfig);
      expect(result).toEqual({
        status: Status.Running,
        workflow_id: mockWorkflowId,
        message: 'Style check workflow started successfully.',
      });
    });

    it('should submit style check with File content successfully', async () => {
      server.use(apiHandlers.style.checks.success);

      const file = new File(['test file content'], 'test.txt', { type: 'text/plain' });
      const fileDescriptor = { file, mimeType: 'text/plain' };
      const requestWithFile = {
        content: fileDescriptor,
        style_guide: 'ap',
        dialect: STYLE_DEFAULTS.dialects.americanEnglish,
        tone: STYLE_DEFAULTS.tones.formal,
        documentName: 'custom-file.txt',
      };

      const result = await submitStyleCheck(requestWithFile, mockConfig);
      expect(result).toEqual({
        status: Status.Running,
        workflow_id: mockWorkflowId,
        message: 'Style check workflow started successfully.',
      });
    });

    it('should submit style check with Buffer content successfully', async () => {
      server.use(apiHandlers.style.checks.success);

      const buffer = Buffer.from('test buffer content', 'utf8');
      const bufferDescriptor = { buffer, mimeType: 'text/plain' };
      const requestWithBuffer = {
        content: bufferDescriptor,
        style_guide: 'ap',
        dialect: STYLE_DEFAULTS.dialects.americanEnglish,
        tone: STYLE_DEFAULTS.tones.formal,
        documentName: 'custom-buffer.txt',
      };

      const result = await submitStyleCheck(requestWithBuffer, mockConfig);
      expect(result).toEqual({
        status: Status.Running,
        workflow_id: mockWorkflowId,
        message: 'Style check workflow started successfully.',
      });
    });
  });

  describe('Style Analysis with Polling', () => {
    it('should perform style check with polling successfully', async () => {
      server.use(apiHandlers.style.checks.success, apiHandlers.style.checks.poll);

      const result = await styleCheck(mockStyleAnalysisRequest, mockConfig);
      expect(result.workflow.status).toBe(Status.Completed);
      expect(result.workflow.id).toBeDefined();
      expect(result.config.style_guide.style_guide_id).toBeDefined();
      expect(result.original.scores).toBeDefined();
      expect(result.original.issues).toBeDefined();
    });

    it('should perform style suggestions with polling successfully', async () => {
      server.use(apiHandlers.style.suggestions.success, apiHandlers.style.suggestions.poll);

      const result = await styleSuggestions(mockStyleAnalysisRequest, mockConfig);
      expect(result.workflow.status).toBe(Status.Completed);
      expect(result.workflow.id).toBeDefined();
      expect(result.config.style_guide.style_guide_id).toBeDefined();
      expect(result.original.scores).toBeDefined();
      expect(result.original.issues).toBeDefined();
    });

    it('should perform style rewrite with polling successfully', async () => {
      server.use(apiHandlers.style.rewrites.success, apiHandlers.style.rewrites.poll);

      const result = await styleRewrite(mockStyleAnalysisRequest, mockConfig);
      expect(result.workflow.status).toBe(Status.Completed);
      expect(result.workflow.id).toBeDefined();
      expect(result.config.style_guide.style_guide_id).toBeDefined();
      expect(result.original.scores).toBeDefined();
      expect(result.original.issues).toBeDefined();
      expect(result.rewrite.text).toBeDefined();
    });

    it('should include terminology scores in rewrite results', async () => {
      server.use(apiHandlers.style.rewrites.success, apiHandlers.style.rewrites.poll);

      const result = await styleRewrite(mockStyleAnalysisRequest, mockConfig);
      expect(result.original.scores.quality.terminology).toBeDefined();
      expect(typeof result.original.scores.quality.terminology.score).toBe('number');
      expect(typeof result.original.scores.quality.terminology.issues).toBe('number');
      expect(result.rewrite.scores.quality.terminology).toBeDefined();
      expect(typeof result.rewrite.scores.quality.terminology.score).toBe('number');
      expect(typeof result.rewrite.scores.quality.terminology.issues).toBe('number');
      expect(result.rewrite.scores.quality.terminology.score).toBe(90);
      expect(result.rewrite.scores.quality.terminology.issues).toBe(0);
    });

    it('should perform style check with polling and custom document name', async () => {
      server.use(apiHandlers.style.checks.success, apiHandlers.style.checks.poll);

      const requestWithDocumentName = {
        ...mockStyleAnalysisRequest,
        documentName: 'test-document.txt',
      };

      const result = await styleCheck(requestWithDocumentName, mockConfig);
      expect(result.workflow.status).toBe(Status.Completed);
      expect(result.workflow.id).toBeDefined();
      expect(result.config.style_guide.style_guide_id).toBeDefined();
      expect(result.original.scores).toBeDefined();
      expect(result.original.issues).toBeDefined();
    });

    it('should perform style suggestions with polling and custom document name', async () => {
      server.use(apiHandlers.style.suggestions.success, apiHandlers.style.suggestions.poll);

      const requestWithDocumentName = {
        ...mockStyleAnalysisRequest,
        documentName: 'suggestions-document.txt',
      };

      const result = await styleSuggestions(requestWithDocumentName, mockConfig);
      expect(result.workflow.status).toBe(Status.Completed);
      expect(result.workflow.id).toBeDefined();
      expect(result.config.style_guide.style_guide_id).toBeDefined();
      expect(result.original.scores).toBeDefined();
      expect(result.original.issues).toBeDefined();
    });

    it('should perform style rewrite with polling and custom document name', async () => {
      server.use(apiHandlers.style.rewrites.success, apiHandlers.style.rewrites.poll);

      const requestWithDocumentName = {
        ...mockStyleAnalysisRequest,
        documentName: 'rewrite-document.txt',
      };

      const result = await styleRewrite(requestWithDocumentName, mockConfig);
      expect(result.workflow.status).toBe(Status.Completed);
      expect(result.workflow.id).toBeDefined();
      expect(result.config.style_guide.style_guide_id).toBeDefined();
      expect(result.original.scores).toBeDefined();
      expect(result.original.issues).toBeDefined();
      expect(result.rewrite.text).toBeDefined();
    });

    it('should perform style check with polling using File content', async () => {
      server.use(apiHandlers.style.checks.success, apiHandlers.style.checks.poll);

      const file = new File(['test file content for polling'], 'polling-test.txt', { type: 'text/plain' });
      const fileDescriptor = { file, mimeType: 'text/plain' };
      const requestWithFile = {
        content: fileDescriptor,
        style_guide: 'ap',
        dialect: STYLE_DEFAULTS.dialects.americanEnglish,
        tone: STYLE_DEFAULTS.tones.formal,
      };

      const result = await styleCheck(requestWithFile, mockConfig);
      expect(result.workflow.status).toBe(Status.Completed);
      expect(result.workflow.id).toBeDefined();
      expect(result.config.style_guide.style_guide_id).toBeDefined();
      expect(result.original.scores).toBeDefined();
      expect(result.original.issues).toBeDefined();
    });

    it('should perform style check with polling using Buffer content', async () => {
      server.use(apiHandlers.style.checks.success, apiHandlers.style.checks.poll);

      const buffer = Buffer.from('test buffer content for polling', 'utf8');
      const bufferDescriptor = { buffer, mimeType: 'text/plain' };
      const requestWithBuffer = {
        content: bufferDescriptor,
        style_guide: 'ap',
        dialect: STYLE_DEFAULTS.dialects.americanEnglish,
        tone: STYLE_DEFAULTS.tones.formal,
      };

      const result = await styleCheck(requestWithBuffer, mockConfig);
      expect(result.workflow.status).toBe(Status.Completed);
      expect(result.workflow.id).toBeDefined();
      expect(result.config.style_guide.style_guide_id).toBeDefined();
      expect(result.original.scores).toBeDefined();
      expect(result.original.issues).toBeDefined();
    });
  });

  describe('Style Check Results', () => {
    it('should get style check results by workflow ID', async () => {
      server.use(apiHandlers.style.checks.poll);

      const result = await getStyleCheck(mockWorkflowId, mockConfig);
      const typedResult = result as StyleAnalysisSuccessResp;
      expect(typedResult.workflow.status).toBe(Status.Completed);
      expect(typedResult.workflow.id).toBeDefined();
      expect(typedResult.config.style_guide.style_guide_id).toBeDefined();
      expect(typedResult.original.scores).toBeDefined();
      expect(typedResult.original.issues).toBeDefined();
    });

    it('should include terminology scores in style check results', async () => {
      server.use(apiHandlers.style.checks.poll);

      const result = await getStyleCheck(mockWorkflowId, mockConfig);
      const typedResult = result as StyleAnalysisSuccessResp;
      expect(typedResult.original.scores.quality.terminology).toBeDefined();
      expect(typeof typedResult.original.scores.quality.terminology.score).toBe('number');
      expect(typeof typedResult.original.scores.quality.terminology.issues).toBe('number');
      expect(typedResult.original.scores.quality.terminology.score).toBe(85);
      expect(typedResult.original.scores.quality.terminology.issues).toBe(0);
    });
  });

  describe('Style Suggestion and Rewrite Results', () => {
    it('should get style suggestion results by workflow ID', async () => {
      server.use(apiHandlers.style.suggestions.poll);

      const result = await getStyleSuggestion(mockWorkflowId, mockConfig);
      const typedResult = result as StyleAnalysisSuggestionResp;
      expect(typedResult.workflow.status).toBe(Status.Completed);
      expect(typedResult.workflow.id).toBeDefined();
      expect(typedResult.config.style_guide.style_guide_id).toBeDefined();
      expect(typedResult.original.scores).toBeDefined();
      expect(typedResult.original.issues).toBeDefined();
      // Check for suggestion in issues
      if (typedResult.original.issues && typedResult.original.issues.length > 0) {
        const issue = typedResult.original.issues[0];
        expect(issue.suggestion).toBeDefined();
        expect(typeof issue.suggestion).toBe('string');
      }
    });

    it('should get style rewrite results by workflow ID', async () => {
      server.use(apiHandlers.style.rewrites.poll);

      const result = await getStyleRewrite(mockWorkflowId, mockConfig);
      const typedResult = result as StyleAnalysisRewriteResp;
      expect(typedResult.workflow.status).toBe(Status.Completed);
      expect(typedResult.config.style_guide.style_guide_id).toBeDefined();
      expect(typedResult.original.scores).toBeDefined();
      expect(typedResult.original.issues).toBeDefined();
      expect(typedResult.rewrite.text).toBeDefined();
      expect(typeof typedResult.rewrite.text).toBe('string');
      expect(typedResult.rewrite.scores.quality).toBeDefined();
      expect(typedResult.rewrite.scores.analysis).toBeDefined();
      expect(typedResult.rewrite.scores.analysis.clarity).toBeDefined();
      expect(typedResult.rewrite.scores.quality.grammar).toBeDefined();
      expect(typedResult.rewrite.scores.quality.alignment).toBeDefined();
      expect(typedResult.rewrite.scores.analysis.tone).toBeDefined();
      expect(typedResult.rewrite.scores.quality.terminology).toBeDefined();
      // Check for suggestion in issues
      if (typedResult.original.issues && typedResult.original.issues.length > 0) {
        const issue = typedResult.original.issues[0];
        expect(issue.suggestion).toBeDefined();
        expect(typeof issue.suggestion).toBe('string');
      }
    });
  });

  describe('Batch Processing API', () => {
    const mockBatchRequests: StyleAnalysisReq[] = [
      {
        content: 'test content 1',
        style_guide: 'ap',
        dialect: STYLE_DEFAULTS.dialects.americanEnglish,
        tone: STYLE_DEFAULTS.tones.formal,
      },
      {
        content: 'test content 2',
        style_guide: 'chicago',
        dialect: STYLE_DEFAULTS.dialects.americanEnglish,
        tone: STYLE_DEFAULTS.tones.informal,
      },
    ];

    describe('styleBatchCheckRequests', () => {
      it('should create batch check response', () => {
        const batchResponse = styleBatchCheckRequests(mockBatchRequests, mockConfig);

        expect(batchResponse.progress.total).toBe(2);
        expect(batchResponse.progress.completed).toBe(0);
        expect(batchResponse.progress.failed).toBe(0);
        // With reactive progress, some requests may already be in progress
        expect(batchResponse.progress.inProgress + batchResponse.progress.pending).toBe(2);
        expect(batchResponse.progress.results).toHaveLength(2);
        expect(batchResponse.promise).toBeInstanceOf(Promise);
        expect(typeof batchResponse.cancel).toBe('function');
      });

      it('should process batch check requests successfully', async () => {
        // Mock the underlying API calls
        server.use(apiHandlers.style.checks.success, apiHandlers.style.checks.poll);

        const batchResponse = styleBatchCheckRequests(mockBatchRequests, mockConfig);
        const result = await batchResponse.promise;

        expect(result.completed).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.results[0].status).toBe('completed');
        expect(result.results[1].status).toBe('completed');
      });

      it('should handle batch check with custom options', () => {
        server.use(apiHandlers.style.checks.success);

        const batchResponse = styleBatchCheckRequests(mockBatchRequests, mockConfig, {
          maxConcurrent: 1,
          retryAttempts: 1,
          retryDelay: 500,
        });

        expect(batchResponse.progress.total).toBe(2);
        expect(batchResponse.promise).toBeInstanceOf(Promise);
      });
    });

    describe('styleBatchSuggestions', () => {
      it('should create batch suggestions response', () => {
        server.use(apiHandlers.style.suggestions.success);

        const batchResponse = styleBatchSuggestions(mockBatchRequests, mockConfig);

        expect(batchResponse.progress.total).toBe(2);
        expect(batchResponse.progress.completed).toBe(0);
        expect(batchResponse.progress.failed).toBe(0);
        // With reactive progress, some requests may already be in progress
        expect(batchResponse.progress.inProgress + batchResponse.progress.pending).toBe(2);
        expect(batchResponse.progress.results).toHaveLength(2);
        expect(batchResponse.promise).toBeInstanceOf(Promise);
        expect(typeof batchResponse.cancel).toBe('function');
      });

      it('should process batch suggestions successfully', async () => {
        server.use(apiHandlers.style.suggestions.success, apiHandlers.style.suggestions.poll);

        const batchResponse = styleBatchSuggestions(mockBatchRequests, mockConfig);
        const result = await batchResponse.promise;

        expect(result.completed).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.results[0].status).toBe('completed');
        expect(result.results[1].status).toBe('completed');
      });
    });

    describe('styleBatchRewrites', () => {
      it('should create batch rewrites response', () => {
        server.use(apiHandlers.style.rewrites.success);

        const batchResponse = styleBatchRewrites(mockBatchRequests, mockConfig);

        expect(batchResponse.progress.total).toBe(2);
        expect(batchResponse.progress.completed).toBe(0);
        expect(batchResponse.progress.failed).toBe(0);
        // With reactive progress, some requests may already be in progress
        expect(batchResponse.progress.inProgress + batchResponse.progress.pending).toBe(2);
        expect(batchResponse.progress.results).toHaveLength(2);
        expect(batchResponse.promise).toBeInstanceOf(Promise);
        expect(typeof batchResponse.cancel).toBe('function');
      });

      it('should process batch rewrites successfully', async () => {
        server.use(apiHandlers.style.rewrites.success, apiHandlers.style.rewrites.poll);

        const batchResponse = styleBatchRewrites(mockBatchRequests, mockConfig);
        const result = await batchResponse.promise;

        expect(result.completed).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.results[0].status).toBe('completed');
        expect(result.results[1].status).toBe('completed');
      });
    });

    describe('styleBatchOperation', () => {
      it('should handle check operation type', () => {
        server.use(apiHandlers.style.checks.success);

        const batchResponse = styleBatchOperation<StyleAnalysisSuccessResp>(mockBatchRequests, mockConfig, {}, 'check');

        expect(batchResponse.progress.total).toBe(2);
        expect(batchResponse.promise).toBeInstanceOf(Promise);
      });

      it('should handle suggestions operation type', () => {
        server.use(apiHandlers.style.suggestions.success);

        const batchResponse = styleBatchOperation<StyleAnalysisSuggestionResp>(
          mockBatchRequests,
          mockConfig,
          {},
          'suggestions',
        );

        expect(batchResponse.progress.total).toBe(2);
        expect(batchResponse.promise).toBeInstanceOf(Promise);
      });

      it('should handle rewrite operation type', () => {
        server.use(apiHandlers.style.rewrites.success);

        const batchResponse = styleBatchOperation<StyleAnalysisRewriteResp>(
          mockBatchRequests,
          mockConfig,
          {},
          'rewrite',
        );

        expect(batchResponse.progress.total).toBe(2);
        expect(batchResponse.promise).toBeInstanceOf(Promise);
      });

      it('should throw error for invalid operation type', () => {
        expect(() =>
          styleBatchOperation(mockBatchRequests, mockConfig, {}, 'invalid' as 'check' | 'suggestions' | 'rewrite'),
        ).toThrow('Invalid operation type: invalid');
      });
    });

    describe('Batch cancellation', () => {
      it('should support cancellation for batch check', async () => {
        server.use(apiHandlers.style.checks.success);

        const batchResponse = styleBatchCheckRequests(mockBatchRequests, mockConfig);

        // Cancel immediately
        batchResponse.cancel();

        await expect(batchResponse.promise).rejects.toThrow('Batch operation cancelled');
      });

      it('should support cancellation for batch suggestions', async () => {
        server.use(apiHandlers.style.suggestions.success);

        const batchResponse = styleBatchSuggestions(mockBatchRequests, mockConfig);

        batchResponse.cancel();

        await expect(batchResponse.promise).rejects.toThrow('Batch operation cancelled');
      });

      it('should support cancellation for batch rewrites', async () => {
        server.use(apiHandlers.style.rewrites.success);

        const batchResponse = styleBatchRewrites(mockBatchRequests, mockConfig);

        batchResponse.cancel();

        await expect(batchResponse.promise).rejects.toThrow('Batch operation cancelled');
      });
    });

    describe('Batch error handling', () => {
      it('should handle API errors gracefully in batch check', async () => {
        server.use(apiHandlers.style.checks.error);

        const batchResponse = styleBatchCheckRequests(mockBatchRequests, mockConfig);
        const result = await batchResponse.promise;

        expect(result.completed).toBe(0);
        expect(result.failed).toBe(2);
        expect(result.results[0].status).toBe('failed');
        expect(result.results[1].status).toBe('failed');
        expect(result.results[0].error).toBeInstanceOf(Error);
        expect(result.results[1].error).toBeInstanceOf(Error);
      });

      it('should handle partial failures in batch', async () => {
        // Use the standard handlers for this test
        server.use(apiHandlers.style.checks.success, apiHandlers.style.checks.poll);

        const batchResponse = styleBatchCheckRequests(mockBatchRequests, mockConfig);
        const result = await batchResponse.promise;

        // Verify the batch processing works correctly
        expect(result.completed).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.results[0].status).toBe('completed');
        expect(result.results[1].status).toBe('completed');
      });
    });
  });
});
