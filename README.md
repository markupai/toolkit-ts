# Markup AI API Toolkit

This toolkit provides a type-safe way to interact with Markup AI services including style analysis, style guide management, and batch operations.

## Installation

```bash
npm install @markupai/toolkit
```

## Usage

### Style Analysis

The toolkit supports string content, File objects, and Buffer objects for style analysis with automatic MIME type detection for binary files:

```typescript
import {
  // Auto-polling convenience methods
  styleCheck,
  styleSuggestions,
  styleRewrite,
  // Async workflow helpers
  submitStyleCheck,
  submitStyleSuggestion,
  submitStyleRewrite,
  getStyleCheck,
  getStyleSuggestion,
  getStyleRewrite,
} from '@markupai/toolkit';

// Using string content
const stringRequest = {
  content: 'This is a sample text for style analysis.',
  style_guide: 'ap',
  dialect: 'american_english',
  tone: 'formal',
};

// Using File object (browser environments)
const file = new File(['This is content from a file.'], 'document.txt', { type: 'text/plain' });
const fileRequest = {
  content: { file }, // FileDescriptor (optionally add mimeType)
  style_guide: 'chicago',
  dialect: 'american_english',
  tone: 'academic',
  documentName: 'my-document.txt', // Optional custom filename
};

// Using BufferDescriptor (Node.js environments) - BINARY FILES SUPPORTED
const fs = require('fs');
const pdfBuffer = fs.readFileSync('technical-report.pdf');
const bufferRequest = {
  content: {
    buffer: pdfBuffer,
    mimeType: 'application/pdf',
  },
  style_guide: 'ap',
  dialect: 'american_english',
  tone: 'academic',
  documentName: 'technical-report.pdf', // Optional custom filename
};

// Perform style analysis with polling (convenience)
const result = await styleCheck(stringRequest, config);
const fileResult = await styleCheck(fileRequest, config);
const pdfResult = await styleCheck(bufferRequest, config); // Works with PDFs!

// Get style suggestions
const suggestionResult = await styleSuggestions(stringRequest, config);

// Get style rewrites
const rewriteResult = await styleRewrite(stringRequest, config);
```

### Batch Operations

For processing multiple documents efficiently, the toolkit provides batch operations:

```typescript
import { styleBatchCheckRequests, styleBatchSuggestions, styleBatchRewrites } from '@markupai/toolkit';

const requests = [
  { content: 'First document content', style_guide: 'ap', dialect: 'american_english', tone: 'formal' },
  { content: 'Second document content', style_guide: 'chicago', dialect: 'american_english', tone: 'academic' },
  // ... more requests
];

// Batch style checks
const batchCheck = styleBatchCheckRequests(requests, config, {
  maxConcurrent: 5,
  retryAttempts: 3,
  retryDelay: 1000,
  timeoutMillis: 30000,
});

// Monitor progress (live snapshot)
console.log(`Started: total ${batchCheck.progress.total}`);
const interval = setInterval(() => {
  const p = batchCheck.progress;
  console.log(`Progress: ${p.completed}/${p.total} completed, ${p.inProgress} in-progress, ${p.failed} failed`);
  if (p.completed + p.failed === p.total) clearInterval(interval);
}, 1000);

// Await final results
batchCheck.promise.then((finalProgress) => {
  console.log(`Completed: ${finalProgress.completed}/${finalProgress.total}`);
  console.log(`Failed: ${finalProgress.failed}`);

  for (const [index, result] of finalProgress.results.entries()) {
    if (result.status === 'completed') {
      console.log(`Request ${index}: ${result.result?.original.scores.quality.score}`);
    } else if (result.status === 'failed') {
      console.log(`Request ${index} failed: ${result.error?.message}`);
    }
  }
});

// Batch suggestions
const batchSuggestions = styleBatchSuggestions(requests, config);

// Batch rewrites
const batchRewrites = styleBatchRewrites(requests, config);

// Cancel batch operations if needed
batchCheck.cancel();
```

### Response Types

The toolkit provides comprehensive response types for different operations:

```typescript
import type {
  StyleAnalysisSuccessResp,
  StyleAnalysisSuggestionResp,
  StyleAnalysisRewriteResp,
  StyleScores,
  Issue,
  IssueWithSuggestion,
} from '@markupai/toolkit';

// Style check response
const checkResult: StyleAnalysisSuccessResp = await styleCheck(request, config);
console.log(`Quality score: ${checkResult.original.scores.quality.score}`);
console.log(`Issues found: ${checkResult.original.issues.length}`);

// Style suggestion response
const suggestionResult: StyleAnalysisSuggestionResp = await styleSuggestions(request, config);
for (const issue of suggestionResult.original.issues) {
  console.log(`Issue: "${issue.original}" → Suggestion: "${issue.suggestion}"`);
}

// Style rewrite response
const rewriteResult: StyleAnalysisRewriteResp = await styleRewrite(request, config);
console.log(`Rewritten content: ${rewriteResult.rewrite.text}`);
console.log(`Rewrite quality score: ${rewriteResult.rewrite.scores.quality.score}`);
```

## Configuration

The toolkit requires a configuration object with your API key and platform settings:

```typescript
import { Config, Environment, PlatformType } from '@markupai/toolkit';

// Using environment-based configuration
const config: Config = {
  apiKey: 'your-api-key-here',
  platform: {
    type: PlatformType.Environment,
    value: Environment.Prod, // or Environment.Stage, Environment.Dev
  },
};

// Using custom URL configuration
const configWithUrl: Config = {
  apiKey: 'your-api-key-here',
  platform: {
    type: PlatformType.Url,
    value: 'https://api.dev.markup.ai',
  },
};
```

## Development

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm

### Setup

1. Clone the repository:

```bash
git clone https://github.com/markupai/toolkit-ts
cd toolkit-ts
```

2. Install dependencies:

```bash
npm install
```

### Building

To build the project:

```bash
npm run build
```

This will:

1. Compile TypeScript files
2. Generate type definitions
3. Create both ESM and UMD bundles

### Testing

The project uses Vitest for testing. There are two types of tests:

1. Unit Tests: Located in `test/unit/`
2. Integration Tests: Located in `test/integration/`

To run all tests:

```bash
npm test
```

To run unit tests only:

```bash
npm run test:unit
```

To run integration tests only:

```bash
npm run test:integration
```

### Code Quality

The project includes linting and formatting tools:

```bash
# Lint the code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## License

This project is licensed under the Apache-2.0 License - see the LICENSE file for details.
