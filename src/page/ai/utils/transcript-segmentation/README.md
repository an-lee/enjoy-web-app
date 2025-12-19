# Transcript Segmentation Module

Intelligently segments text-to-speech transcripts for language learning, optimized for follow-along reading practice.

## Overview

This module converts raw word-level timing data from TTS providers into intelligently segmented transcripts. It considers multiple factors to create optimal break points:

- **Audio pauses** (breathing points)
- **Punctuation marks** (sentence endings, clauses)
- **Word count** (optimal segment length for readability)
- **Abbreviations and numbers** (avoid false breaks)
- **Meaning groups (意群)** for semantic coherence (English only, using Compromise.js)
- **Sentence boundaries** (multilingual support via Intl.Segmenter)

## Module Structure

The module is organized into focused, single-responsibility files:

### Core Files

- **`index.ts`** - Main entry point with `convertToTranscriptFormat()` function and comprehensive documentation
- **`types.ts`** - Type definitions (`RawWordTiming`, `WordWithMetadata`, `WordSegment`)
- **`constants.ts`** - Configuration constants, abbreviation lists, and punctuation weights

### Processing Modules

- **`word-metadata.ts`** - Enriches raw word timings with metadata:
  - Converts timings from seconds to milliseconds
  - Detects punctuation, abbreviations, numbers
  - Identifies sentence boundaries
  - Detects entities and meaning groups (English only)

- **`text-utils.ts`** - Text processing utilities:
  - Word position finding
  - Punctuation extraction
  - Regex escaping
  - Abbreviation detection

- **`segmentation.ts`** - Main segmentation logic:
  - Iterates through words
  - Uses break detection to determine segment boundaries
  - Handles force-break scenarios when segments get too long

- **`break-detection.ts`** - Break point decision logic:
  - Calculates break scores based on multiple factors
  - Implements priority-based break decisions
  - Finds best break points within long segments

- **`merge-segments.ts`** - Post-processing:
  - Merges very short segments with adjacent ones
  - Respects audio pauses and punctuation boundaries
  - Prevents over-segmentation

## Usage

```typescript
import { convertToTranscriptFormat } from '@/page/ai/utils/transcript-segmentation'

const transcript = convertToTranscriptFormat(
  "Hello world. How are you?",
  [
    { text: "Hello", startTime: 0.0, endTime: 0.5 },
    { text: "world", startTime: 0.6, endTime: 1.0 },
    { text: "How", startTime: 1.2, endTime: 1.4 },
    { text: "are", startTime: 1.5, endTime: 1.7 },
    { text: "you", startTime: 1.8, endTime: 2.0 },
  ],
  "en" // Optional language code
)

// Result: Segmented into two segments: ["Hello world.", "How are you?"]
```

## Configuration

Segmentation behavior can be tuned via constants in `constants.ts`:

- `minWordsPerSegment`: Minimum words in a segment (default: 1)
- `maxWordsPerSegment`: Maximum words in a segment (default: 12)
- `preferredWordsPerSegment`: Preferred word count (default: 6)
- `pauseThreshold`: Minimum gap to consider a pause in ms (default: 250)
- `longPauseThreshold`: Longer pause threshold in ms (default: 500)
- `punctuationWeights`: Weights for different punctuation marks

## Processing Flow

1. **Metadata Enrichment** (`word-metadata.ts`):
   - Converts raw timings to milliseconds
   - Detects punctuation, abbreviations, numbers
   - Identifies sentence boundaries
   - Detects entities and meaning groups (English only)

2. **Segmentation** (`segmentation.ts`):
   - Iterates through words
   - Uses `shouldBreakAtPosition()` to determine break points
   - Handles force-break scenarios when segments exceed `maxWordsPerSegment`

3. **Break Detection** (`break-detection.ts`):
   - Calculates break scores based on:
     - Punctuation weight
     - Sentence end detection
     - Pause detection
     - Word count
     - Meaning group boundaries
   - Implements priority-based decisions

4. **Segment Merging** (`merge-segments.ts`):
   - Post-processes segments to merge very short ones
   - Respects audio pauses and punctuation boundaries
   - Prevents over-segmentation

## Key Features

### Meaning Groups (意群) Support

For English text, the module uses Compromise.js to detect meaning groups (semantic units) and avoids breaking segments in the middle of them. This ensures better semantic coherence in the segmented output.

### Multilingual Support

The module supports multiple languages through:

- Multilingual punctuation detection (supports English, Chinese, Japanese, etc.)
- Intl.Segmenter API for accurate sentence boundary detection (when available)

### Smart Abbreviation Handling

The module maintains a comprehensive list of common abbreviations and uses Compromise.js for enhanced detection in English text, preventing false breaks after abbreviations like "Mr.", "Dr.", "Inc.", etc.

## Testing

The module includes comprehensive tests in `transcript-segmentation.test.ts` that verify:

- Basic segmentation
- Abbreviation handling
- Meaning group detection
- Pause handling
- Edge cases

Run tests with:

```bash
bun run test:changed
```

## Maintenance

When modifying the segmentation algorithm:

1. Update the relevant module file (e.g., `break-detection.ts` for break logic changes)
2. Update tests in `transcript-segmentation.test.ts`
3. Update this README if the processing flow changes
4. Update the main documentation in `index.ts` if the API changes

## Import Path

The module should be imported using the directory path, which will automatically resolve to `index.ts`:

```typescript
import { convertToTranscriptFormat } from '@/page/ai/utils/transcript-segmentation'
// or explicitly:
import { convertToTranscriptFormat } from '@/page/ai/utils/transcript-segmentation'
```

Both import styles work, as TypeScript automatically resolves directory imports to `index.ts`.
