import { StyleOperationType, type CreateStyleGuideReq } from './style.api.types';
import { initEndpoint } from '../../utils/api';
import { Status } from '../../utils/api.types';
import type { Config } from '../../utils/api.types';
import type {
  StyleAnalysisResponseBase,
  StyleAnalysisRewriteResp,
  StyleAnalysisSubmitResp,
  StyleAnalysisSuccessResp,
  StyleAnalysisSuggestionResp,
} from './style.api.types';
import type { StyleAnalysisReq, FileDescriptor, BufferDescriptor } from './style.api.types';
import type { Dialects, Tones } from '@markupai/api/api';
// Batch processing utilities
import type {
  BatchOptions,
  BatchResult,
  BatchProgress,
  BatchResponse,
  StyleAnalysisResponseType,
} from './style.api.types';
import { MarkupAIError } from '@markupai/api';
import { ApiError, ErrorType } from '../../utils/errors';
import { Blob } from 'buffer';

/**
 * Detects if the current environment is Node.js
 */
function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

/**
 * Creates a CreateStyleGuideReq from a file URL in Node.js environments.
 * This utility is only available in Node.js environments.
 *
 * @param fileUrl - The URL or path to the PDF file
 * @param name - Optional name for the style guide. If not provided, uses the filename
 * @returns Promise<CreateStyleGuideReq> - The request object ready for createStyleGuide
 * @throws Error if not in Node.js environment or if file cannot be read
 */
export async function createStyleGuideReqFromUrl(fileUrl: string | URL, name?: string): Promise<CreateStyleGuideReq> {
  // Check if we're in a Node.js environment
  if (!isNodeEnvironment()) {
    throw new Error(
      'createStyleGuideReqFromUrl is only available in Node.js environments. In browser environments, use createStyleGuide directly with a File object.',
    );
  }

  try {
    // Dynamic imports to avoid browser bundling issues
    const { readFileSync } = await import('fs');
    const { basename } = await import('path');
    const { fileURLToPath } = await import('url');

    // Convert URL to path if it's a file:// URL
    let filePath: string;
    if (typeof fileUrl === 'string') {
      if (fileUrl.startsWith('file://')) {
        filePath = fileURLToPath(fileUrl);
      } else {
        filePath = fileUrl;
      }
    } else {
      // URL object
      if (fileUrl.protocol === 'file:') {
        filePath = fileURLToPath(fileUrl);
      } else {
        throw new Error('Only file:// URLs are supported. Please provide a local file path or file:// URL.');
      }
    }

    // Read the file
    const fileBuffer = readFileSync(filePath);

    // Get the filename from the path
    const filename = basename(filePath);

    // Validate file extension
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    if (!fileExtension || fileExtension !== 'pdf') {
      throw new Error(`Unsupported file type: ${fileExtension}. Only .pdf files are supported.`);
    }

    // Create File object from buffer
    const file = new File([fileBuffer], filename, {
      type: 'application/pdf',
    });

    // Use provided name or fall back to filename (without extension)
    const styleGuideName = name || filename.replace(/\.pdf$/i, '');

    return {
      file,
      name: styleGuideName,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create style guide request from URL: ${error.message}`);
    }
    throw new Error('Failed to create style guide request from URL: Unknown error');
  }
}

/**
 * Creates a CreateStyleGuideReq from a file path in Node.js environments.
 * This is a convenience wrapper around createStyleGuideReqFromUrl.
 *
 * @param filePath - The path to the PDF file
 * @param name - Optional name for the style guide. If not provided, uses the filename
 * @returns Promise<CreateStyleGuideReq> - The request object ready for createStyleGuide
 * @throws Error if not in Node.js environment or if file cannot be read
 */
export async function createStyleGuideReqFromPath(filePath: string, name?: string): Promise<CreateStyleGuideReq> {
  return createStyleGuideReqFromUrl(filePath, name);
}

// Helper function to get MIME type from filename
export function getMimeTypeFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    default:
      return 'application/octet-stream';
  }
}

// Helper function to check if an object is a Buffer
export function isBuffer(obj: unknown): obj is Buffer {
  if (typeof Buffer !== 'undefined') {
    return Buffer.isBuffer(obj);
  }
  return false;
}

export async function createBlob(request: StyleAnalysisReq): Promise<Blob> {
  const filename = request.documentName || 'unknown.txt';
  if (typeof request.content === 'string') {
    return new Blob([request.content], { type: 'text/plain' });
  } else if (typeof File !== 'undefined' && 'file' in request.content && request.content.file instanceof File) {
    const fileDescriptor = request.content as FileDescriptor;
    // Convert File to Node.js Blob by reading it as ArrayBuffer first
    const arrayBuffer = await fileDescriptor.file.arrayBuffer();
    return new Blob([arrayBuffer], { type: fileDescriptor.mimeType || 'application/octet-stream' });
  } else if ('buffer' in request.content && isBuffer(request.content.buffer)) {
    const bufferDescriptor = request.content as BufferDescriptor;
    const mimeType = bufferDescriptor.mimeType || getMimeTypeFromFilename(filename);
    // Convert Buffer to ArrayBuffer to satisfy TypeScript 5.9.2 strict typing
    const arrayBuffer = bufferDescriptor.buffer.buffer.slice(
      bufferDescriptor.buffer.byteOffset,
      bufferDescriptor.buffer.byteOffset + bufferDescriptor.buffer.byteLength,
    ) as ArrayBuffer;
    return new Blob([arrayBuffer], { type: mimeType });
  } else {
    throw new Error('Invalid content type. Expected string, FileDescriptor, or BufferDescriptor.');
  }
}

export async function createFile(request: StyleAnalysisReq): Promise<File> {
  const filename = request.documentName || 'unknown.txt';

  if (typeof request.content === 'string') {
    return new File([request.content], filename, { type: 'text/plain' });
  } else if (typeof File !== 'undefined' && 'file' in request.content && request.content.file instanceof File) {
    const fileDescriptor = request.content as FileDescriptor;
    return fileDescriptor.file;
  } else if ('buffer' in request.content && isBuffer(request.content.buffer)) {
    const bufferDescriptor = request.content as BufferDescriptor;
    const mimeType = bufferDescriptor.mimeType || getMimeTypeFromFilename(filename);
    // Convert Buffer to ArrayBuffer to satisfy TypeScript 5.9.2 strict typing
    const arrayBuffer = bufferDescriptor.buffer.buffer.slice(
      bufferDescriptor.buffer.byteOffset,
      bufferDescriptor.buffer.byteOffset + bufferDescriptor.buffer.byteLength,
    ) as ArrayBuffer;
    return new File([arrayBuffer], filename, { type: mimeType });
  } else {
    throw new Error('Invalid content type. Expected string, FileDescriptor, or BufferDescriptor.');
  }
}

export async function createContentObject(request: StyleAnalysisReq): Promise<File | Blob> {
  // Check if we're in a Node.js environment
  if (isNodeEnvironment()) {
    return createBlob(request);
  } else {
    // Browser environment
    return createFile(request);
  }
}

// Helper function to handle style analysis submission and polling
export async function submitAndPollStyleAnalysis<
  T extends StyleAnalysisSuccessResp | StyleAnalysisSuggestionResp | StyleAnalysisRewriteResp,
>(operationType: StyleOperationType, request: StyleAnalysisReq, config: Config): Promise<T> {
  const client = initEndpoint(config);
  const contentObject = await createContentObject(request);

  let initialResponse: StyleAnalysisSubmitResp;
  try {
    switch (operationType) {
      case StyleOperationType.Check:
        initialResponse = (await client.styleChecks.createStyleCheck(contentObject, {
          dialect: request.dialect as Dialects,
          tone: request.tone as Tones,
          style_guide: request.style_guide,
          webhook_url: request.webhook_url,
        })) as StyleAnalysisSubmitResp;
        break;
      case StyleOperationType.Suggestions:
        initialResponse = (await client.styleSuggestions.createStyleSuggestion(contentObject, {
          dialect: request.dialect as Dialects,
          tone: request.tone as Tones,
          style_guide: request.style_guide,
          webhook_url: request.webhook_url,
        })) as StyleAnalysisSubmitResp;
        break;
      case StyleOperationType.Rewrite:
        initialResponse = (await client.styleRewrites.createStyleRewrite(contentObject, {
          dialect: request.dialect as Dialects,
          tone: request.tone as Tones,
          style_guide: request.style_guide,
          webhook_url: request.webhook_url,
        })) as StyleAnalysisSubmitResp;
        break;
      default:
        throw new Error(`Invalid operation type: ${operationType}`);
    }
  } catch (error) {
    if (error instanceof MarkupAIError) {
      throw ApiError.fromResponse(error.statusCode || 0, error.body as Record<string, unknown>);
    }
    throw new Error(`Failed to submit style analysis: ${error}`);
  }

  if (!initialResponse.workflow_id) {
    throw new Error(`No workflow_id received from initial ${operationType} request`);
  }

  const polledResponse = await pollWorkflowForResult<T>(initialResponse.workflow_id, config, operationType);

  if (polledResponse.workflow.status === Status.Completed) {
    return polledResponse;
  }
  throw new Error(`${operationType} failed with status: ${polledResponse.workflow.status}`);
}

// Generic type guard for completed responses
export function isCompletedResponse<T extends StyleAnalysisResponseBase>(
  resp: T,
): resp is T & { workflow: { status: Status.Completed } } & StyleAnalysisResponseBase {
  return resp.workflow.status === Status.Completed;
}

// Type dispatcher for style functions
type StyleFunction<T> = (request: StyleAnalysisReq, config: Config) => Promise<T>;

// Queue management for batch processing
class BatchQueue<T extends StyleAnalysisResponseType> {
  private inProgress = new Set<number>();
  public results: Array<BatchResult<T>> = [];
  private cancelled = false;
  private resolvePromise?: (value: BatchProgress<T>) => void;
  private rejectPromise?: (reason: Error) => void;
  public startTime: number;
  public estimatedCompletionTime?: number;

  constructor(
    private requests: StyleAnalysisReq[],
    private config: Config,
    private styleFunction: StyleFunction<T>,
    private options: Required<BatchOptions>,
    private onProgressUpdate?: (progress: BatchProgress<T>) => void,
  ) {
    this.startTime = Date.now();
    this.initializeResults();
  }

  private initializeResults(): void {
    this.results = this.requests.map((request, index) => ({
      index,
      request,
      status: 'pending' as const,
    }));
  }

  private getProgress(): BatchProgress<T> {
    const completed = this.results.filter((r) => r.status === 'completed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const inProgress = this.results.filter((r) => r.status === 'in-progress').length;
    const pending = this.results.filter((r) => r.status === 'pending').length;

    return {
      total: this.requests.length,
      completed,
      failed,
      inProgress,
      pending,
      results: [...this.results],
      startTime: Date.now(),
    };
  }

  private updateProgress(): void {
    if (this.onProgressUpdate) {
      this.onProgressUpdate(this.getProgress());
    }
  }

  private async processRequest(index: number, request: StyleAnalysisReq): Promise<void> {
    if (this.cancelled) return;

    try {
      // Update status to in-progress
      this.results[index] = {
        ...this.results[index],
        status: 'in-progress',
        startTime: Date.now(),
      };
      this.updateProgress();

      // Execute the style function with retry logic
      const result = await this.executeWithRetry(request);

      // If result is undefined, treat as failure
      if (typeof result === 'undefined') {
        this.results[index] = {
          ...this.results[index],
          status: 'failed',
          error: new Error('Batch operation returned undefined result'),
          endTime: Date.now(),
        };
      } else {
        // Update with success
        this.results[index] = {
          ...this.results[index],
          status: 'completed',
          result,
          endTime: Date.now(),
        };
      }
    } catch (error) {
      // Update with failure
      this.results[index] = {
        ...this.results[index],
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
        endTime: Date.now(),
      };
    } finally {
      this.inProgress.delete(index);
      this.updateProgress();
      this.processNext();
    }
  }

  private async executeWithRetry(request: StyleAnalysisReq): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await this.styleFunction(request, this.config);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain error types
        if (this.shouldNotRetry(lastError)) {
          throw lastError;
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.options.retryAttempts) {
          await this.delay(this.options.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  private shouldNotRetry(error: Error): boolean {
    // Don't retry on authentication, authorization, or validation errors
    const nonRetryableErrors = [
      'authentication',
      'authorization',
      'validation',
      'invalid',
      'unauthorized',
      'forbidden',
    ];

    return nonRetryableErrors.some((keyword) => error.message.toLowerCase().includes(keyword));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private processNext(): void {
    if (this.cancelled) return;

    // Find next pending request
    const nextRequest = this.results.find((r) => r.status === 'pending');
    if (!nextRequest) {
      // No more pending requests, check if we're done
      if (this.inProgress.size === 0) {
        this.resolvePromise?.(this.getProgress());
      }
      return;
    }

    // Check if we can start more requests
    if (this.inProgress.size >= this.options.maxConcurrent) {
      return;
    }

    // Start processing the next request
    this.inProgress.add(nextRequest.index);
    this.processRequest(nextRequest.index, nextRequest.request);
  }

  public start(): Promise<BatchProgress<T>> {
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      // Start initial batch of requests
      const initialBatch = Math.min(this.options.maxConcurrent, this.requests.length);

      for (let i = 0; i < initialBatch; i++) {
        this.inProgress.add(i);
        this.processRequest(i, this.requests[i]);
      }
    });
  }

  public cancel(): void {
    this.cancelled = true;
    this.rejectPromise?.(new Error('Batch operation cancelled'));
  }
}

// Main batch processing function
export function styleBatchCheck<T extends StyleAnalysisResponseType>(
  requests: StyleAnalysisReq[],
  config: Config,
  options: BatchOptions = {},
  styleFunction: StyleFunction<T>,
): BatchResponse<T> {
  // Validate inputs
  if (!requests || requests.length === 0) {
    throw new Error('Requests array cannot be empty');
  }

  if (requests.length > 1000) {
    throw new Error('Maximum 1000 requests allowed per batch');
  }

  // Set default options
  const defaultOptions: Required<BatchOptions> = {
    maxConcurrent: 100,
    retryAttempts: 2,
    retryDelay: 1000,
    timeout: 300000, // 5 minutes
  };

  const finalOptions: Required<BatchOptions> = {
    ...defaultOptions,
    ...options,
  };

  // Validate options
  if (finalOptions.maxConcurrent < 1 || finalOptions.maxConcurrent > 100) {
    throw new Error('maxConcurrent must be between 1 and 100');
  }

  if (finalOptions.retryAttempts < 0 || finalOptions.retryAttempts > 5) {
    throw new Error('retryAttempts must be between 0 and 5');
  }

  // Create queue and start processing
  const queue = new BatchQueue<T>(requests, config, styleFunction, finalOptions);

  const promise = queue.start();

  // Create a reactive progress object that always reflects current state
  const progressObject = {
    get total() {
      return requests.length;
    },
    get completed() {
      return queue.results.filter((r) => r.status === 'completed').length;
    },
    get failed() {
      return queue.results.filter((r) => r.status === 'failed').length;
    },
    get inProgress() {
      return queue.results.filter((r) => r.status === 'in-progress').length;
    },
    get pending() {
      return queue.results.filter((r) => r.status === 'pending').length;
    },
    get results() {
      return [...queue.results];
    },
    get startTime() {
      return queue.startTime;
    },
    get estimatedCompletionTime() {
      return queue.estimatedCompletionTime;
    },
  } as BatchProgress<T>;

  return {
    progress: progressObject,
    promise,
    cancel: () => queue.cancel(),
  };
}

export async function pollWorkflowForResult<T>(
  workflowId: string,
  config: Config,
  styleOperation: StyleOperationType,
): Promise<T> {
  let attempts = 0;
  const maxAttempts = 30;
  const pollInterval = 2000;

  const poll = async (): Promise<T> => {
    if (attempts >= maxAttempts) {
      throw new ApiError(`Workflow timed out after ${maxAttempts} attempts`, ErrorType.TIMEOUT_ERROR);
    }

    try {
      const client = initEndpoint(config);
      let response: StyleAnalysisResponseBase;

      // TODO: Remove the unknown as cast once the SDK API is updated
      switch (styleOperation) {
        case StyleOperationType.Check:
          response = (await client.styleChecks.getStyleCheck(workflowId)) as unknown as StyleAnalysisResponseBase;
          break;
        case StyleOperationType.Suggestions:
          response = (await client.styleSuggestions.getStyleSuggestion(
            workflowId,
          )) as unknown as StyleAnalysisResponseBase;
          break;
        case StyleOperationType.Rewrite:
          response = (await client.styleRewrites.getStyleRewrite(workflowId)) as unknown as StyleAnalysisResponseBase;
          break;
      }

      const currentStatus = response.workflow.status;

      if (currentStatus === Status.Failed) {
        throw new ApiError(`Workflow failed with status: ${Status.Failed}`, ErrorType.WORKFLOW_FAILED);
      }

      if (currentStatus === Status.Completed) {
        return response as T;
      }

      if (currentStatus === Status.Running || currentStatus === Status.Queued) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        return poll();
      }

      throw new ApiError(`Unexpected workflow status: ${currentStatus}`, ErrorType.UNEXPECTED_STATUS);
    } catch (error) {
      if (error instanceof MarkupAIError) {
        throw ApiError.fromResponse(error.statusCode || 0, error.body as Record<string, unknown>);
      }
      console.error(`Unknown polling error (attempt ${attempts + 1}/${maxAttempts}):`, error);
      throw ApiError.fromError(
        error instanceof Error ? error : new Error('Unknown error occurred'),
        ErrorType.POLLING_ERROR,
      );
    }
  };

  return poll();
}
