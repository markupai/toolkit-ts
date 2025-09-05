import {
  type StyleAnalysisReq,
  type StyleAnalysisSubmitResp,
  type StyleAnalysisSuccessResp,
  type StyleAnalysisSuggestionResp,
  type StyleAnalysisRewriteResp,
  type BatchOptions,
  type BatchResponse,
  type StyleAnalysisResponseType,
  StyleOperationType,
} from './style.api.types';
import type { Config, StyleAnalysisPollResp } from '../../utils/api.types';

import { createContentObject } from './style.api.utils';
import { submitAndPollStyleAnalysis, styleBatchCheck } from './style.api.utils';
import type { Dialects, Tones } from '@markupai/api/api';
import { MarkupAIError } from '@markupai/api';
import { ApiError } from '../../utils/errors';
import { initEndpoint } from '../../utils/api';

// Export utility functions for Node.js environments
export { createStyleGuideReqFromUrl, createStyleGuideReqFromPath } from './style.api.utils';

// Style Check Operations
export async function submitStyleCheck(
  styleAnalysisRequest: StyleAnalysisReq,
  config: Config,
): Promise<StyleAnalysisSubmitResp> {
  const client = initEndpoint(config);
  const contentObject = await createContentObject(styleAnalysisRequest);
  let response: StyleAnalysisSubmitResp;
  try {
    response = (await client.styleChecks.createStyleCheck(contentObject, {
      dialect: styleAnalysisRequest.dialect as Dialects,
      tone: styleAnalysisRequest.tone as Tones,
      style_guide: styleAnalysisRequest.style_guide,
      webhook_url: styleAnalysisRequest.webhook_url,
    })) as StyleAnalysisSubmitResp;
  } catch (error) {
    if (error instanceof MarkupAIError) {
      throw ApiError.fromResponse(error.statusCode || 0, error.body as Record<string, unknown>);
    }
    throw new Error(`Failed to submit style check: ${error}`);
  }
  return response;
}

export async function submitStyleSuggestion(
  styleAnalysisRequest: StyleAnalysisReq,
  config: Config,
): Promise<StyleAnalysisSubmitResp> {
  const client = initEndpoint(config);
  const contentObject = await createContentObject(styleAnalysisRequest);
  let response: StyleAnalysisSubmitResp;
  try {
    response = (await client.styleSuggestions.createStyleSuggestion(contentObject, {
      dialect: styleAnalysisRequest.dialect as Dialects,
      tone: styleAnalysisRequest.tone as Tones,
      style_guide: styleAnalysisRequest.style_guide,
      webhook_url: styleAnalysisRequest.webhook_url,
    })) as StyleAnalysisSubmitResp;
  } catch (error) {
    if (error instanceof MarkupAIError) {
      throw ApiError.fromResponse(error.statusCode || 0, error.body as Record<string, unknown>);
    }
    throw new Error(`Failed to submit style suggestion: ${error}`);
  }
  return response;
}

export async function submitStyleRewrite(
  styleAnalysisRequest: StyleAnalysisReq,
  config: Config,
): Promise<StyleAnalysisSubmitResp> {
  const client = initEndpoint(config);
  const contentObject = await createContentObject(styleAnalysisRequest);
  let response: StyleAnalysisSubmitResp;
  try {
    response = (await client.styleRewrites.createStyleRewrite(contentObject, {
      dialect: styleAnalysisRequest.dialect as Dialects,
      tone: styleAnalysisRequest.tone as Tones,
      style_guide: styleAnalysisRequest.style_guide,
      webhook_url: styleAnalysisRequest.webhook_url,
    })) as StyleAnalysisSubmitResp;
  } catch (error) {
    if (error instanceof MarkupAIError) {
      throw ApiError.fromResponse(error.statusCode || 0, error.body as Record<string, unknown>);
    }
    throw new Error(`Failed to submit style rewrite: ${error}`);
  }
  return response;
}

// Convenience methods for style operations with polling
export async function styleCheck(
  styleAnalysisRequest: StyleAnalysisReq,
  config: Config,
): Promise<StyleAnalysisSuccessResp> {
  return submitAndPollStyleAnalysis<StyleAnalysisSuccessResp>(StyleOperationType.Check, styleAnalysisRequest, config);
}

export async function styleSuggestions(
  styleAnalysisRequest: StyleAnalysisReq,
  config: Config,
): Promise<StyleAnalysisSuggestionResp> {
  return submitAndPollStyleAnalysis<StyleAnalysisSuggestionResp>(
    StyleOperationType.Suggestions,
    styleAnalysisRequest,
    config,
  );
}

export async function styleRewrite(
  styleAnalysisRequest: StyleAnalysisReq,
  config: Config,
): Promise<StyleAnalysisRewriteResp> {
  return submitAndPollStyleAnalysis<StyleAnalysisRewriteResp>(StyleOperationType.Rewrite, styleAnalysisRequest, config);
}

// Get style check results by workflow ID
export async function getStyleCheck(
  workflowId: string,
  config: Config,
): Promise<StyleAnalysisSuccessResp | StyleAnalysisPollResp> {
  const client = initEndpoint(config);
  // TODO: Remove the unknown as cast once the SDK API is updated
  return (await client.styleChecks.getStyleCheck(workflowId)) as unknown as StyleAnalysisSuccessResp;
}

// Get style suggestion results by workflow ID
/**
 * Retrieve style suggestion results for a submitted workflow.
 * @param workflowId - The workflow ID returned from submitStyleSuggestion
 * @param config - API configuration (platformUrl, apiKey)
 * @returns StyleAnalysisSuggestionResp containing suggestions and scores
 */
export async function getStyleSuggestion(
  workflowId: string,
  config: Config,
): Promise<StyleAnalysisSuggestionResp | StyleAnalysisPollResp> {
  const client = initEndpoint(config);
  // TODO: Remove the unknown as cast once the SDK API is updated
  return (await client.styleSuggestions.getStyleSuggestion(workflowId)) as unknown as StyleAnalysisSuggestionResp;
}

/**
 * Retrieve style rewrite results for a submitted workflow.
 * @param workflowId - The workflow ID returned from submitStyleRewrite
 * @param config - API configuration (platformUrl, apiKey)
 * @returns StyleAnalysisRewriteResp containing rewritten content, suggestions, and scores
 */
export async function getStyleRewrite(
  workflowId: string,
  config: Config,
): Promise<StyleAnalysisRewriteResp | StyleAnalysisPollResp> {
  const client = initEndpoint(config);
  // TODO: Remove the unknown as cast once the SDK API is updated
  return (await client.styleRewrites.getStyleRewrite(workflowId)) as unknown as StyleAnalysisRewriteResp;
}

// Batch processing functions
/**
 * Batch style check operation for multiple requests.
 * Processes requests in parallel with configurable concurrency limits.
 *
 * @param requests - Array of style analysis requests
 * @param config - API configuration
 * @param options - Batch processing options (maxConcurrent, retryAttempts, etc.)
 * @returns BatchResponse with progress tracking and promise
 */
export function styleBatchCheckRequests(
  requests: StyleAnalysisReq[],
  config: Config,
  options: BatchOptions = {},
): BatchResponse<StyleAnalysisSuccessResp> {
  return styleBatchCheck<StyleAnalysisSuccessResp>(requests, config, options, styleCheck);
}

/**
 * Batch style suggestions operation for multiple requests.
 * Processes requests in parallel with configurable concurrency limits.
 *
 * @param requests - Array of style analysis requests
 * @param config - API configuration
 * @param options - Batch processing options (maxConcurrent, retryAttempts, etc.)
 * @returns BatchResponse with progress tracking and promise
 */
export function styleBatchSuggestions(
  requests: StyleAnalysisReq[],
  config: Config,
  options: BatchOptions = {},
): BatchResponse<StyleAnalysisSuggestionResp> {
  return styleBatchCheck<StyleAnalysisSuggestionResp>(requests, config, options, styleSuggestions);
}

/**
 * Batch style rewrite operation for multiple requests.
 * Processes requests in parallel with configurable concurrency limits.
 *
 * @param requests - Array of style analysis requests
 * @param config - API configuration
 * @param options - Batch processing options (maxConcurrent, retryAttempts, etc.)
 * @returns BatchResponse with progress tracking and promise
 */
export function styleBatchRewrites(
  requests: StyleAnalysisReq[],
  config: Config,
  options: BatchOptions = {},
): BatchResponse<StyleAnalysisRewriteResp> {
  return styleBatchCheck<StyleAnalysisRewriteResp>(requests, config, options, styleRewrite);
}

/**
 * Generic batch style operation that automatically determines the response type.
 * Use this when you want to let TypeScript infer the return type.
 *
 * @param requests - Array of style analysis requests
 * @param config - API configuration
 * @param options - Batch processing options
 * @param operationType - Type of operation ('check', 'suggestions', 'rewrite')
 * @returns BatchResponse with appropriate response type
 */
export function styleBatchOperation<T extends StyleAnalysisResponseType>(
  requests: StyleAnalysisReq[],
  config: Config,
  options: BatchOptions = {},
  operationType: 'check' | 'suggestions' | 'rewrite',
): BatchResponse<T> {
  switch (operationType) {
    case 'check':
      return styleBatchCheckRequests(requests, config, options) as BatchResponse<T>;
    case 'suggestions':
      return styleBatchSuggestions(requests, config, options) as BatchResponse<T>;
    case 'rewrite':
      return styleBatchRewrites(requests, config, options) as BatchResponse<T>;
    default:
      throw new Error(`Invalid operation type: ${operationType}`);
  }
}
