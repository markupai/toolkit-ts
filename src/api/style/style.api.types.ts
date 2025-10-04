import type { ResponseBase, Status } from '../../utils/api.types';

// Enums
export interface StyleAnalysisSubmitResp {
  workflow_id: string;
  status: Status;
}

export enum StyleOperationType {
  Check = 'check',
  Suggestions = 'suggestions',
  Rewrite = 'rewrite',
}

export enum IssueCategory {
  Grammar = 'grammar',
  Clarity = 'clarity',
  Tone = 'tone',
  Consistency = 'consistency',
  Terminology = 'terminology',
}

/**
 * File descriptor interface for style analysis
 */
export interface FileDescriptor {
  file: File;
  mimeType?: string;
}

/**
 * Buffer descriptor interface for style analysis
 */
export interface BufferDescriptor {
  buffer: Buffer;
  mimeType?: string;
  /** Optional original filename hint for MIME and extension preservation */
  filename?: string;
}

/**
 * Base issue type for style analysis
 */
export interface Issue {
  original: string;
  position: {
    start_index: number;
  };
  subcategory: string;
  category: IssueCategory;
}

/**
 * Issue with suggestion for style analysis
 */
export interface IssueWithSuggestion extends Issue {
  suggestion: string;
}

export interface StyleScores {
  quality: {
    score: number;
    grammar: {
      score: number;
      issues: number;
    };
    consistency: {
      score: number;
      issues: number;
    };

    terminology: {
      score: number;
      issues: number;
    };
  };
  analysis: {
    clarity: {
      score: number;
      word_count: number;
      sentence_count: number;
      average_sentence_length: number;
      flesch_reading_ease: number;
      vocabulary_complexity: number;
      sentence_complexity: number;
    };
    tone: {
      score: number;
      informality: number;
      liveliness: number;
      informality_alignment: number;
      liveliness_alignment: number;
    } | null;
  };
}

export interface StyleAnalysisResponseBase {
  workflow: {
    id: string;
    type: string;
    api_version: string;
    status: Status;
  };
}

export interface StyleAnalysisSuccessResp extends StyleAnalysisResponseBase {
  workflow: {
    id: string;
    type: string; // e.g., 'checks', 'suggestions', 'rewrites'
    api_version: string;
    generated_at: string;
    status: Status;
    webhook_response?: {
      url: string;
      status_code: number;
    };
  };
  config: {
    dialect: string;
    style_guide: {
      style_guide_type: string; // TODO: confirmation on this
      style_guide_id: string; // TODO: confirmation on this
    };
    tone: string;
  };
  original: {
    issues: Issue[];
    scores: StyleScores;
  };
}

export interface StyleAnalysisSuggestionResp extends StyleAnalysisSuccessResp {
  original: {
    issues: IssueWithSuggestion[];
    scores: StyleScores;
  };
}

export interface StyleAnalysisRewriteResp extends StyleAnalysisSuggestionResp {
  rewrite: {
    text: string;
    scores: StyleScores;
  };
}

export interface StyleAnalysisErrorResp extends ResponseBase {
  error_message: string;
}

export interface StyleAnalysisReq {
  content: string | FileDescriptor | BufferDescriptor;
  style_guide: string; // Can be style guide ID or name (e.g. 'ap', 'chicago', 'microsoft')
  dialect: string;
  tone?: string;
  documentName?: string; // Optional document name for the file upload
  webhook_url?: string; // Optional webhook URL for async processing
  /** Optional alias for documentName; used by some callers */
  filename?: string;
}

export interface StyleGuide {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  status: string;
}

export type StyleGuides = StyleGuide[];

export interface CreateStyleGuideReq {
  file: File;
  name: string;
}

export interface StyleGuideUpdateReq {
  name: string;
}

// Batch processing types
export interface BatchOptions {
  maxConcurrent?: number;
  retryAttempts?: number;
  retryDelay?: number;
  /**
   * The timeout for the analysis of one content item in milliseconds.
   * @default 5 minutes, 300000 milliseconds
   */
  timeout?: number;
}

export interface BatchResult<T = StyleAnalysisResponseType> {
  index: number;
  request: StyleAnalysisReq;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  result?: T;
  error?: Error;
  workflowId?: string;
  startTime?: number;
  endTime?: number;
}

export interface BatchProgress<T = StyleAnalysisResponseType> {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
  results: Array<BatchResult<T>>;
  startTime: number;
  estimatedCompletionTime?: number;
}

export interface BatchResponse<T> {
  progress: BatchProgress<T>;
  promise: Promise<BatchProgress<T>>;
  cancel: () => void;
}

// Type guards for response types
export type StyleAnalysisResponseType =
  | StyleAnalysisSuccessResp
  | StyleAnalysisSuggestionResp
  | StyleAnalysisRewriteResp;

export type BatchResponseType<T> = T extends StyleAnalysisSuccessResp
  ? StyleAnalysisSuccessResp
  : T extends StyleAnalysisSuggestionResp
    ? StyleAnalysisSuggestionResp
    : T extends StyleAnalysisRewriteResp
      ? StyleAnalysisRewriteResp
      : StyleAnalysisResponseType;
