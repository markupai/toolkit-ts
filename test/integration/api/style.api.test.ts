import { describe, it, expect, beforeAll } from 'vitest';
import {
  submitStyleCheck,
  submitStyleSuggestion,
  submitStyleRewrite,
  styleCheck,
  styleSuggestions,
  styleRewrite,
  getStyleSuggestion,
  getStyleRewrite,
  styleBatchCheckRequests,
  styleBatchSuggestions,
  styleBatchRewrites,
} from '../../../src/api/style/style.api';
import type { StyleAnalysisReq, StyleAnalysisSuccessResp, BatchProgress } from '../../../src/api/style/style.api.types';
import { STYLE_DEFAULTS } from '../../../src/api/style/style.api.defaults';
import { PlatformType } from '../../../src/utils/api.types';
import type { Config } from '../../../src/utils/api.types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ApiError } from '../../../src/utils/errors';
import { BufferDescriptor } from '../../../src/api/style/style.api.types';

// Helper function to create a BufferDescriptor from the batteries.pdf
async function createTestPdfBuffer(): Promise<BufferDescriptor> {
  const pdfPath = join(__dirname, '../test-data/batteries.pdf');
  const buffer = readFileSync(pdfPath);
  return { buffer, mimeType: 'application/pdf' };
}

describe('Style API Integration Tests', () => {
  let config: Config;
  beforeAll(() => {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      throw new Error('API_KEY environment variable is required for integration tests');
    }
    config = {
      apiKey,
      platform: { type: PlatformType.Url, value: process.env.TEST_PLATFORM_URL! },
    };
  });

  describe('Style Operations', () => {
    const testContent = 'This is a test content for style operations.';
    const styleGuideId = STYLE_DEFAULTS.styleGuides.microsoft;
    it('should submit a style check', async () => {
      const response = await submitStyleCheck(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style check with custom document name', async () => {
      const response = await submitStyleCheck(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'integration-test-document.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style check with incorrect options', async () => {
      expect(
        async () =>
          await submitStyleCheck(
            {
              content: 'This is a test content for style operations.',
              style_guide: 'invalid-style-guide-id',
              dialect: 'invalid-dialect',
              tone: 'invalid-tone',
            },
            config,
          ),
      ).rejects.toThrow(ApiError);
    });

    it('should submit a style check with invalid api key', async () => {
      expect(
        async () =>
          await submitStyleCheck(
            {
              content: testContent,
              style_guide: styleGuideId,
              dialect: STYLE_DEFAULTS.dialects.americanEnglish,
              tone: STYLE_DEFAULTS.tones.formal,
              documentName: 'integration-test-document.txt',
            },
            {
              apiKey: 'invalid-api-key',
            },
          ),
      ).rejects.toThrow(ApiError);
    });

    it('should submit a style suggestion', async () => {
      const response = await submitStyleSuggestion(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style suggestion with custom document name', async () => {
      const response = await submitStyleSuggestion(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'suggestions-test-document.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style rewrite', async () => {
      const response = await submitStyleRewrite(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style rewrite with custom document name', async () => {
      const response = await submitStyleRewrite(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'rewrite-test-document.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style check and get result', async () => {
      const response = await styleCheck(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
        },
        config,
      );

      expect(response).toBeDefined();
      // New response structure assertions
      expect(response.workflow).toBeDefined();
      expect(response.workflow.id).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.workflow.status).toBeDefined();
      expect(response.config).toBeDefined();
      expect(response.config.style_guide.style_guide_type).toBeDefined();
      expect(response.config.style_guide.style_guide_id).toBeDefined();
      expect(typeof response.config.style_guide.style_guide_type).toBe('string');
      expect(typeof response.config.style_guide.style_guide_id).toBe('string');
      expect(response.config.style_guide.style_guide_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(response.config.dialect).toBe(STYLE_DEFAULTS.dialects.americanEnglish);
      expect(response.config.tone).toBe(STYLE_DEFAULTS.tones.formal);

      // Test scores structure (original)
      expect(response.original).toBeDefined();
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(typeof response.original.scores.quality.score).toBe('number');

      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(typeof response.original.scores.analysis.clarity.score).toBe('number');
      expect(typeof response.original.scores.analysis.clarity.word_count).toBe('number');
      expect(typeof response.original.scores.analysis.clarity.sentence_count).toBe('number');
      expect(typeof response.original.scores.analysis.clarity.average_sentence_length).toBe('number');
      expect(typeof response.original.scores.analysis.clarity.flesch_reading_ease).toBe('number');
      expect(typeof response.original.scores.analysis.clarity.vocabulary_complexity).toBe('number');
      expect(typeof response.original.scores.analysis.clarity.sentence_complexity).toBe('number');

      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(typeof response.original.scores.quality.grammar.score).toBe('number');
      expect(typeof response.original.scores.quality.grammar.issues).toBe('number');

      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(typeof response.original.scores.quality.alignment.score).toBe('number');
      expect(typeof response.original.scores.quality.alignment.issues).toBe('number');

      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(typeof response.original.scores.analysis.tone.score).toBe('number');
      expect(typeof response.original.scores.analysis.tone.informality).toBe('number');
      expect(typeof response.original.scores.analysis.tone.liveliness).toBe('number');

      expect(response.original.scores.quality.terminology).toBeDefined();
      expect(typeof response.original.scores.quality.terminology.score).toBe('number');
      expect(typeof response.original.scores.quality.terminology.issues).toBe('number');
    });

    it('should submit a style check with custom document name and get result', async () => {
      const response = await styleCheck(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'custom-check-document.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(response.workflow.id).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.config).toBeDefined();
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();
    });

    // The style suggestions endpoint is currently throwing errors
    it('should submit a style suggestion and get result', async () => {
      const response = await styleSuggestions(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(response.workflow.id).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();

      if (response.original.issues && response.original.issues.length > 0) {
        const issue = response.original.issues[0];
        expect(issue.suggestion).toBeDefined();
        expect(typeof issue.suggestion).toBe('string');
      }
    });

    it('should submit a style suggestion with custom document name and get result', async () => {
      const response = await styleSuggestions(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'custom-suggestions-document.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(response.workflow.id).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();

      if (response.original.issues && response.original.issues.length > 0) {
        const issue = response.original.issues[0];
        expect(issue.suggestion).toBeDefined();
        expect(typeof issue.suggestion).toBe('string');
      }
    });

    it('should submit a style rewrite and get result', async () => {
      const response = await styleRewrite(
        {
          content: testContent,
          style_guide: '01971e03-dd27-75ee-9044-b48e654848cf',
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(response.workflow.id).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();

      // Test rewrite
      expect(response.rewrite).toBeDefined();
      expect(typeof response.rewrite).toBe('string');

      if (response.original.issues && response.original.issues.length > 0) {
        const issue = response.original.issues[0];
        expect(issue.suggestion).toBeDefined();
        expect(typeof issue.suggestion).toBe('string');
      }
    });

    it('should submit a style rewrite with custom document name and get result', async () => {
      const response = await styleRewrite(
        {
          content: testContent,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'custom-rewrite-document.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();

      // Test rewrite
      expect(response.rewrite).toBeDefined();
      expect(typeof response.rewrite).toBe('string');
    });
  });

  describe('Style Operations with File Content', () => {
    const styleGuideId = STYLE_DEFAULTS.styleGuides.microsoft;

    // Helper function to create a File object from the batteries.pdf
    async function createTestFile(): Promise<File> {
      const pdfPath = join(__dirname, '../test-data/batteries.pdf');
      const pdfBuffer = readFileSync(pdfPath);
      return new File([pdfBuffer], 'batteries.pdf', { type: 'application/pdf' });
    }

    it('should submit a style check with File content', async () => {
      const testFile = await createTestFile();
      const fileDescriptor = { file: testFile, mimeType: 'application/pdf' };

      const response = await submitStyleCheck(
        {
          content: fileDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'batteries-integration-test.pdf',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style suggestion with File content', async () => {
      const testFile = await createTestFile();
      const fileDescriptor = { file: testFile, mimeType: 'application/pdf' };

      const response = await submitStyleSuggestion(
        {
          content: fileDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'batteries-suggestions-test.pdf',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style rewrite with File content', async () => {
      const testFile = await createTestFile();
      const fileDescriptor = { file: testFile, mimeType: 'application/pdf' };

      const response = await submitStyleRewrite(
        {
          content: fileDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'batteries-rewrite-test.pdf',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style check with File content and get result', async () => {
      const testFile = await createTestFile();
      const fileDescriptor = { file: testFile, mimeType: 'application/pdf' };

      const response = await styleCheck(
        {
          content: fileDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'batteries-check-result-test.pdf',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.config.style_guide.style_guide_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(response.config.dialect).toBe(STYLE_DEFAULTS.dialects.americanEnglish);
      expect(response.config.tone).toBe(STYLE_DEFAULTS.tones.formal);

      // Test scores structure
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(typeof response.original.scores.quality.score).toBe('number');
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();
    });

    it('should submit a style suggestion with File content and get result', async () => {
      const testFile = await createTestFile();
      const fileDescriptor = { file: testFile, mimeType: 'application/pdf' };

      const response = await styleSuggestions(
        {
          content: fileDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'batteries-suggestions-result-test.pdf',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();

      if (response.original.issues && response.original.issues.length > 0) {
        const issue = response.original.issues[0];
        expect(issue.suggestion).toBeDefined();
        expect(typeof issue.suggestion).toBe('string');
      }
    });

    it('should submit a style rewrite with File content and get result', async () => {
      const testFile = await createTestFile();
      const fileDescriptor = { file: testFile, mimeType: 'application/pdf' };

      const response = await styleRewrite(
        {
          content: fileDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'batteries-rewrite-result-test.pdf',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();

      // Test rewrite
      expect(response.rewrite).toBeDefined();
      expect(typeof response.rewrite).toBe('string');

      if (response.original.issues && response.original.issues.length > 0) {
        const issue = response.original.issues[0];
        expect(issue.suggestion).toBeDefined();
        expect(typeof issue.suggestion).toBe('string');
      }
    });

    it('should handle File content without custom document name', async () => {
      const testFile = await createTestFile();
      const fileDescriptor = { file: testFile, mimeType: 'application/pdf' };

      const response = await styleCheck(
        {
          content: fileDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          // No documentName - should use default
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();
    });
  });

  describe('Style Operations with Buffer Content', () => {
    const styleGuideId = STYLE_DEFAULTS.styleGuides.microsoft;

    // Helper function to create a Buffer object from text content
    function createTestBuffer(content: string): Buffer {
      return Buffer.from(content, 'utf8');
    }

    it('should submit a style check with Buffer content', async () => {
      const testBuffer = createTestBuffer('This is a test content for Buffer style operations.');
      const bufferDescriptor = { buffer: testBuffer, mimeType: 'text/plain' };

      const response = await submitStyleCheck(
        {
          content: bufferDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'buffer-integration-test.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style suggestion with Buffer content', async () => {
      const testBuffer = createTestBuffer('This is a test content for Buffer style suggestions.');
      const bufferDescriptor = { buffer: testBuffer, mimeType: 'text/plain' };

      const response = await submitStyleSuggestion(
        {
          content: bufferDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'buffer-suggestions-test.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style rewrite with Buffer content', async () => {
      const testBuffer = createTestBuffer('This is a test content for Buffer style rewrites.');
      const bufferDescriptor = { buffer: testBuffer, mimeType: 'text/plain' };

      const response = await submitStyleRewrite(
        {
          content: bufferDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'buffer-rewrite-test.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it('should submit a style check with Buffer content and get result', async () => {
      const testBuffer = createTestBuffer('This is a test content for Buffer style check with results.');
      const bufferDescriptor = { buffer: testBuffer, mimeType: 'text/plain' };

      const response = await styleCheck(
        {
          content: bufferDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'buffer-check-result-test.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.config.style_guide.style_guide_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(response.config.dialect).toBe(STYLE_DEFAULTS.dialects.americanEnglish);
      expect(response.config.tone).toBe(STYLE_DEFAULTS.tones.formal);

      // Test scores structure
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(typeof response.original.scores.quality.score).toBe('number');
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();
    });

    it('should submit a style suggestion with Buffer content and get result', async () => {
      const testBuffer = createTestBuffer('This is a test content for Buffer style suggestions with results.');
      const bufferDescriptor = { buffer: testBuffer, mimeType: 'text/plain' };

      const response = await styleSuggestions(
        {
          content: bufferDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'buffer-suggestions-result-test.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();

      if (response.original.issues && response.original.issues.length > 0) {
        const issue = response.original.issues[0];
        expect(issue.suggestion).toBeDefined();
        expect(typeof issue.suggestion).toBe('string');
      }
    });

    it('should submit a style rewrite with Buffer content and get result', async () => {
      const testBuffer = createTestBuffer('This is a test content for Buffer style rewrites with results.');
      const bufferDescriptor = { buffer: testBuffer, mimeType: 'text/plain' };

      const response = await styleRewrite(
        {
          content: bufferDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'buffer-rewrite-result-test.txt',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();

      // Test rewrite and rewrite_scores
      expect(response.rewrite).toBeDefined();
      expect(typeof response.rewrite).toBe('string');

      expect(response.rewrite.scores).toBeDefined();
      expect(response.rewrite.scores.quality).toBeDefined();
      expect(response.rewrite.scores.analysis).toBeDefined();
      expect(response.rewrite.scores.analysis.clarity).toBeDefined();
      expect(response.rewrite.scores.quality.grammar).toBeDefined();
      expect(response.rewrite.scores.quality.alignment).toBeDefined();
      expect(response.rewrite.scores.analysis.tone).toBeDefined();
      expect(response.rewrite.scores.quality.terminology).toBeDefined();

      if (response.original.issues && response.original.issues.length > 0) {
        const issue = response.original.issues[0];
        expect(issue.suggestion).toBeDefined();
        expect(typeof issue.suggestion).toBe('string');
      }
    });

    it('should handle Buffer content without custom document name', async () => {
      const testBuffer = createTestBuffer('This is a test content for Buffer without custom document name.');
      const bufferDescriptor = { buffer: testBuffer, mimeType: 'text/plain' };

      const response = await styleCheck(
        {
          content: bufferDescriptor,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          // No documentName - should use default
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow.id).toBeDefined();
      expect(typeof response.workflow.id).toBe('string');
      expect(response.original.scores).toBeDefined();
      expect(response.original.scores.quality).toBeDefined();
      expect(response.original.scores.analysis).toBeDefined();
      expect(response.original.scores.analysis.clarity).toBeDefined();
      expect(response.original.scores.quality.grammar).toBeDefined();
      expect(response.original.scores.quality.alignment).toBeDefined();
      expect(response.original.scores.analysis.tone).toBeDefined();
      expect(response.original.scores.quality.terminology).toBeDefined();
    });

    it('should handle PDF Buffer content', async () => {
      const testPdfBuffer = await createTestPdfBuffer();

      const response = await submitStyleCheck(
        {
          content: testPdfBuffer,
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'buffer-pdf-test.pdf',
        },
        config,
      );

      expect(response).toBeDefined();
      expect(response.workflow_id).toBeDefined();
    });

    it.skip('should download text file from URL and perform style check with Buffer', async () => {
      // URL for the text file
      const textFileUrl =
        'https://zapier-dev-files.s3.amazonaws.com/cli-platform/20280/2P4LX4UFUwS9SwPN3kdCsLI0HZIS6fjgkF-dej4QtK5RQ_o8brwHHGhdNR_EB7dBSUke2Z30XLu42BJmS4MVAq2tN8d6R3xx_4dBhfNDhfWf8paGIJguziMkWu-cBsf-_PWgFvjS95FXgxtlqAO67cROPp8oTIV46TOfgJbWlfo';

      // Download the file
      const response = await fetch(textFileUrl);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      // Get the file as an ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      expect(arrayBuffer).toBeDefined();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);

      // Create a Buffer from the downloaded file content
      const fileBuffer = Buffer.from(arrayBuffer);
      expect(fileBuffer).toBeInstanceOf(Buffer);
      expect(fileBuffer.length).toBeGreaterThan(0);

      // Perform style check with the downloaded content
      const styleCheckResponse = await styleRewrite(
        {
          content: { buffer: fileBuffer, mimeType: 'text/plain' },
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
          documentName: 'downloaded-file.txt',
        },
        config,
      );

      // Validate the style check response
      expect(styleCheckResponse).toBeDefined();
      expect(styleCheckResponse.workflow.id).toBeDefined();
      expect(typeof styleCheckResponse.workflow.id).toBe('string');
      expect(styleCheckResponse.config).toBeDefined();
      expect(styleCheckResponse.config.style_guide).toBeDefined();
      expect(styleCheckResponse.config.style_guide.style_guide_type).toBeDefined();
      expect(styleCheckResponse.config.style_guide.style_guide_id).toBeDefined();
      expect(typeof styleCheckResponse.config.style_guide.style_guide_type).toBe('string');
      expect(typeof styleCheckResponse.config.style_guide.style_guide_id).toBe('string');
      expect(styleCheckResponse.config.style_guide.style_guide_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(styleCheckResponse.config.dialect).toBe(STYLE_DEFAULTS.dialects.americanEnglish);
      expect(styleCheckResponse.config.tone).toBe(STYLE_DEFAULTS.tones.formal);

      // Test scores structure
      expect(styleCheckResponse.original.scores).toBeDefined();
      expect(styleCheckResponse.original.scores.quality).toBeDefined();
      expect(typeof styleCheckResponse.original.scores.quality.score).toBe('number');
      expect(styleCheckResponse.original.scores.analysis).toBeDefined();
      expect(styleCheckResponse.original.scores.analysis.clarity).toBeDefined();
      expect(styleCheckResponse.original.scores.quality.grammar).toBeDefined();
      expect(styleCheckResponse.original.scores.quality.alignment).toBeDefined();
      expect(styleCheckResponse.original.scores.analysis.tone).toBeDefined();
      expect(styleCheckResponse.original.scores.quality.terminology).toBeDefined();

      // Log some information about the downloaded content for debugging
      console.log(`Downloaded file size: ${arrayBuffer.byteLength} bytes`);
      console.log(`Buffer size: ${fileBuffer.length} bytes`);
      console.log(`Style check workflow ID: ${styleCheckResponse.workflow.id}`);
      console.log(`Quality score: ${styleCheckResponse.original.scores.quality.score}`);
    });
  });

  describe('Style Operations Get Results', () => {
    const styleGuideId = STYLE_DEFAULTS.styleGuides.microsoft;

    it('should get style suggestion results by workflow ID', async () => {
      // Submit a style suggestion to get a workflow ID
      const suggestionResp = await submitStyleSuggestion(
        {
          content: 'Integration test for getStyleSuggestion',
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
        },
        config,
      );
      expect(suggestionResp.workflow_id).toBeDefined();
      const workflowId = suggestionResp.workflow_id;

      // Fetch the suggestion results
      const result = await getStyleSuggestion(workflowId, config);
      expect(result).toBeDefined();
    });

    it('should get style rewrite results by workflow ID', async () => {
      // Submit a style rewrite to get a workflow ID
      const rewriteResp = await submitStyleRewrite(
        {
          content: 'Integration test for getStyleRewrite',
          style_guide: styleGuideId,
          dialect: STYLE_DEFAULTS.dialects.americanEnglish,
          tone: STYLE_DEFAULTS.tones.formal,
        },
        config,
      );
      expect(rewriteResp.workflow_id).toBeDefined();
      const workflowId = rewriteResp.workflow_id;

      // Fetch the rewrite results
      const result = await getStyleRewrite(workflowId, config);
      expect(result).toBeDefined();
    });
  });

  describe('Batch Processing Integration', () => {
    const mockBatchRequests: StyleAnalysisReq[] = [
      {
        content: 'This is a test document for style checking. It contains multiple sentences to analyze.',
        style_guide: 'ap',
        dialect: STYLE_DEFAULTS.dialects.americanEnglish,
        tone: STYLE_DEFAULTS.tones.formal,
        documentName: 'test-document-1.txt',
      },
      {
        content: 'Another test document with different content. This should be processed separately.',
        style_guide: 'chicago',
        dialect: STYLE_DEFAULTS.dialects.americanEnglish,
        tone: STYLE_DEFAULTS.tones.informal,
        documentName: 'test-document-2.txt',
      },
      {
        content: 'A third document for comprehensive testing of the batch processing system.',
        style_guide: 'microsoft',
        dialect: STYLE_DEFAULTS.dialects.americanEnglish,
        tone: STYLE_DEFAULTS.tones.formal,
        documentName: 'test-document-3.txt',
      },
    ];

    describe('styleBatchCheckRequests Integration', () => {
      it('should process multiple style check requests in parallel', async () => {
        const batchResponse = styleBatchCheckRequests(mockBatchRequests, config);

        // Verify initial state
        expect(batchResponse.progress.total).toBe(3);
        expect(batchResponse.progress.pending).toBe(0);
        expect(batchResponse.progress.completed).toBe(0);
        expect(batchResponse.progress.failed).toBe(0);

        // Wait for completion
        const result = await batchResponse.promise;

        // Verify final state
        expect(result.completed).toBe(3);
        expect(result.failed).toBe(0);
        expect(result.inProgress).toBe(0);
        expect(result.pending).toBe(0);

        // Verify individual results
        result.results.forEach((batchResult, index) => {
          expect(batchResult.status).toBe('completed');
          expect(batchResult.result).toBeDefined();
          expect(batchResult.result!.workflow).toBeDefined();
          expect(batchResult.result!.workflow.status).toBe('completed');
          expect(batchResult.result!.original.scores).toBeDefined();
          expect(batchResult.index).toBe(index);
          expect(batchResult.request).toEqual(mockBatchRequests[index]);
        });
      }, 30000);

      it('should respect maxConcurrent limit', async () => {
        const batchResponse = styleBatchCheckRequests(mockBatchRequests, config, {
          maxConcurrent: 1,
        });

        // Check initial state - only one should be in progress
        expect(batchResponse.progress.inProgress).toBe(1);
        expect(batchResponse.progress.pending).toBe(2);

        const result = await batchResponse.promise;

        expect(result.completed).toBe(3);
        expect(result.failed).toBe(0);
      }, 30000);

      it('should handle mixed success and failure scenarios', async () => {
        const mixedRequests = [
          mockBatchRequests[0], // Should succeed
          {
            content: '', // Empty content should fail
            style_guide: 'ap',
            dialect: STYLE_DEFAULTS.dialects.americanEnglish,
            tone: STYLE_DEFAULTS.tones.formal,
          },
          mockBatchRequests[2], // Should succeed
        ];

        const batchResponse = styleBatchCheckRequests(mixedRequests, config);
        const result = await batchResponse.promise;

        expect(result.completed).toBe(2);
        expect(result.failed).toBe(1);
        expect(result.results[0].status).toBe('completed');
        expect(result.results[1].status).toBe('failed');
        expect(result.results[2].status).toBe('completed');
      }, 30000);
    });

    describe('styleBatchSuggestions Integration', () => {
      it('should process multiple style suggestion requests', async () => {
        const batchResponse = styleBatchSuggestions(mockBatchRequests, config);

        const result = await batchResponse.promise;

        expect(result.completed).toBe(3);
        expect(result.failed).toBe(0);

        result.results.forEach((batchResult) => {
          expect(batchResult.status).toBe('completed');
          expect(batchResult.result).toBeDefined();
          expect(batchResult.result!.workflow.id).toBeDefined();
          expect(batchResult.result!.workflow.status).toBe('completed');
          expect(batchResult.result!.original.scores).toBeDefined();
          // Suggestions should have issues with suggestions
          expect(Array.isArray(batchResult.result!.original.issues)).toBe(true);
        });
      }, 30000);
    });

    describe('styleBatchRewrites Integration', () => {
      it('should process multiple style rewrite requests', async () => {
        const batchResponse = styleBatchRewrites(mockBatchRequests, config);

        const result = await batchResponse.promise;

        expect(result.completed).toBe(3);
        expect(result.failed).toBe(0);

        result.results.forEach((batchResult) => {
          expect(batchResult.status).toBe('completed');
          expect(batchResult.result).toBeDefined();
          expect(batchResult.result!.workflow.id).toBeDefined();
          expect(batchResult.result!.workflow.status).toBe('completed');
          expect(batchResult.result!.original.scores).toBeDefined();
          expect(batchResult.result!.rewrite).toBeDefined();
          expect(batchResult.result!.rewrite.scores).toBeDefined();
        });
      }, 30000);
    });

    describe('Batch Progress Tracking', () => {
      it('should provide accurate progress updates', async () => {
        const progressUpdates: BatchProgress<StyleAnalysisSuccessResp>[] = [];

        const batchResponse = styleBatchCheckRequests(mockBatchRequests, config, {
          maxConcurrent: 1, // Force sequential processing for easier testing
        });

        // Monitor progress updates during processing
        const progressInterval = setInterval(() => {
          const currentProgress = batchResponse.progress;
          progressUpdates.push({ ...currentProgress });
        }, 100);

        // Wait for completion
        const result = await batchResponse.promise;

        // Clear the interval
        clearInterval(progressInterval);

        // Verify we captured progress updates
        expect(progressUpdates.length).toBeGreaterThan(0);

        // Verify progress progression
        let lastCompleted = 0;

        for (const progress of progressUpdates) {
          // Progress should be monotonic (completed should only increase)
          expect(progress.completed).toBeGreaterThanOrEqual(lastCompleted);
          expect(progress.total).toBe(3);
          expect(progress.completed + progress.failed + progress.inProgress + progress.pending).toBe(3);

          // Update our tracking
          lastCompleted = progress.completed;
        }

        // Verify final state
        expect(result.total).toBe(3);
        expect(result.completed).toBe(3);
        expect(result.failed).toBe(0);
        expect(result.inProgress).toBe(0);
        expect(result.pending).toBe(0);
        expect(result.startTime).toBeGreaterThan(0);
        expect(result.results).toHaveLength(3);
      }, 30000);
    });

    describe('Batch Cancellation Integration', () => {
      it('should support cancellation during processing', async () => {
        const batchResponse = styleBatchCheckRequests(mockBatchRequests, config);

        // Cancel immediately
        batchResponse.cancel();

        await expect(batchResponse.promise).rejects.toThrow('Batch operation cancelled');
      });

      it('should allow cancellation after some progress', async () => {
        const batchResponse = styleBatchCheckRequests(mockBatchRequests, config, {
          maxConcurrent: 1, // Force sequential processing
        });

        // Wait a bit for some progress
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Cancel
        batchResponse.cancel();

        await expect(batchResponse.promise).rejects.toThrow('Batch operation cancelled');
      });
    });

    describe('Batch Error Recovery', () => {
      it('should continue processing after individual failures', async () => {
        const requestsWithErrors = [
          mockBatchRequests[0], // Should succeed
          {
            content: 'Invalid content that might cause issues',
            style_guide: 'invalid_style_guide', // Invalid style guide
            dialect: STYLE_DEFAULTS.dialects.americanEnglish,
            tone: STYLE_DEFAULTS.tones.formal,
          },
          mockBatchRequests[2], // Should succeed
        ];

        const batchResponse = styleBatchCheckRequests(requestsWithErrors, config);
        const result = await batchResponse.promise;

        // Should have some successes and some failures
        expect(result.completed + result.failed).toBe(3);
        expect(result.results.some((r) => r.status === 'completed')).toBe(true);
        expect(result.results.some((r) => r.status === 'failed')).toBe(true);
      }, 30000);
    });

    describe('Large Batch Processing', () => {
      it('should handle larger batches efficiently', async () => {
        // Create a larger batch (but not too large for testing)
        const largeBatch = Array(10)
          .fill(null)
          .map((_, index) => ({
            content: `Test document ${index + 1} for large batch processing.`,
            style_guide: 'ap',
            dialect: STYLE_DEFAULTS.dialects.americanEnglish,
            tone: STYLE_DEFAULTS.tones.formal,
            documentName: `test-document-${index + 1}.txt`,
          }));

        const batchResponse = styleBatchCheckRequests(largeBatch, config, {
          maxConcurrent: 5, // Limit concurrency for testing
        });

        const result = await batchResponse.promise;

        expect(result.total).toBe(10);
        expect(result.completed + result.failed).toBe(10);
        expect(result.results).toHaveLength(10);
      }, 60000); // Longer timeout for larger batch
    });

    describe('Reactive Progress Updates', () => {
      it('should provide real-time progress updates with 25 requests', async () => {
        // Create 25 test requests
        const largeBatch = Array(25)
          .fill(null)
          .map((_, index) => ({
            content: `Test document ${index + 1} for reactive progress testing. This document contains multiple sentences to ensure proper processing time. Document ${index + 1} has unique content for comprehensive testing.`,
            style_guide: 'ap',
            dialect: STYLE_DEFAULTS.dialects.americanEnglish,
            tone: STYLE_DEFAULTS.tones.formal,
            documentName: `test-document-${index + 1}.txt`,
          }));

        const batchResponse = styleBatchCheckRequests(largeBatch, config, {
          maxConcurrent: 10, // Allow some concurrency to see progress
        });

        // Verify initial state
        expect(batchResponse.progress.total).toBe(25);
        expect(batchResponse.progress.completed).toBe(0);
        expect(batchResponse.progress.pending).toBe(15);
        expect(batchResponse.progress.inProgress).toBe(10); // maxConcurrent

        // Monitor progress updates during processing
        const progressSnapshots: BatchProgress<StyleAnalysisSuccessResp>[] = [];
        let maxCompleted = 0;
        let progressUpdatesCount = 0;

        const progressInterval = setInterval(() => {
          const currentProgress = batchResponse.progress;
          progressSnapshots.push({ ...currentProgress });

          // Track the maximum completed count we've seen
          if (currentProgress.completed > maxCompleted) {
            maxCompleted = currentProgress.completed;
            progressUpdatesCount++;
          }
        }, 500); // Check every 500ms

        // Wait for completion
        const result = await batchResponse.promise;

        // Clear the interval
        clearInterval(progressInterval);

        // Verify we captured progress updates
        expect(progressSnapshots.length).toBeGreaterThan(0);
        expect(progressUpdatesCount).toBeGreaterThan(0);

        // Verify that we saw more than 1 request complete during processing
        expect(maxCompleted).toBeGreaterThan(1);
        expect(maxCompleted).toBeLessThanOrEqual(25);

        // Verify progress progression is monotonic
        let lastCompleted = 0;
        let lastFailed = 0;

        for (const progress of progressSnapshots) {
          // Progress should be monotonic (completed and failed should only increase)
          expect(progress.completed).toBeGreaterThanOrEqual(lastCompleted);
          expect(progress.failed).toBeGreaterThanOrEqual(lastFailed);
          expect(progress.total).toBe(25);

          // Sum of all statuses should equal total
          expect(progress.completed + progress.failed + progress.inProgress + progress.pending).toBe(25);

          // Update our tracking
          lastCompleted = progress.completed;
          lastFailed = progress.failed;
        }

        // Verify final state
        expect(result.total).toBe(25);
        expect(result.completed + result.failed).toBe(25);
        expect(result.inProgress).toBe(0);
        expect(result.pending).toBe(0);
        expect(result.startTime).toBeGreaterThan(0);
        expect(result.results).toHaveLength(25);

        // Verify that at least some requests succeeded
        expect(result.completed).toBeGreaterThan(0);

        // Verify individual results for completed requests
        result.results.forEach((batchResult, index) => {
          if (batchResult.status === 'completed') {
            expect(batchResult.result).toBeDefined();
            expect(batchResult.result!.workflow).toBeDefined();
            expect(batchResult.result!.workflow.status).toBe('completed');
            expect(batchResult.result!.original.scores).toBeDefined();
            expect(batchResult.index).toBe(index);
            expect(batchResult.request).toEqual(largeBatch[index]);
          }
        });

        console.log(
          `Progress test completed: ${result.completed} successful, ${result.failed} failed, max completed during processing: ${maxCompleted}`,
        );
      }, 120000); // 2 minutes timeout for 25 requests
    });
  });
});
