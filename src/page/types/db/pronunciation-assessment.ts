/**
 * Pronunciation Assessment Types
 *
 * TypeScript interfaces for Azure Speech SDK pronunciation assessment results.
 *
 * Note: While the Speech SDK exports the `PronunciationAssessmentResult` class,
 * it does not export TypeScript interfaces for the detailed JSON response structure.
 * These types are defined based on the official Microsoft documentation.
 *
 * The JSON response is obtained via:
 * `result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult)`
 *
 * References:
 * - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text-short#pronunciation-assessment-parameters
 * - https://github.com/azure-samples/cognitive-services-speech-sdk/blob/master/docs/pronunciationassessment/
 */

/**
 * Phoneme-level pronunciation assessment
 */
export interface PhonemeAssessment {
  Phoneme: string;
  Offset: number;
  Duration: number;
  PronunciationAssessment: {
    AccuracyScore: number;
    NBestPhonemes?: Array<{
      Phoneme: string;
      Score: number;
    }>;
  };
}

/**
 * Syllable-level pronunciation assessment
 */
export interface SyllableAssessment {
  Syllable: string;
  Offset: number;
  Duration: number;
  PronunciationAssessment: {
    AccuracyScore: number;
  };
  Phonemes?: PhonemeAssessment[];
}

/**
 * Word-level pronunciation assessment
 */
export interface WordAssessment {
  Word: string;
  Offset: number;
  Duration: number;
  PronunciationAssessment: {
    AccuracyScore: number;
    ErrorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation' | 'UnexpectedBreak' | 'MissingBreak' | 'Monotone';
  };
  Syllables?: SyllableAssessment[];
  Phonemes?: PhonemeAssessment[];
}

/**
 * Overall pronunciation assessment scores
 */
export interface PronunciationAssessmentScores {
  AccuracyScore: number;
  FluencyScore: number;
  CompletenessScore: number;
  PronScore: number;
  ProsodyScore?: number;
}

/**
 * NBest recognition result with pronunciation assessment
 */
export interface NBestResult {
  Confidence: number;
  Lexical: string;
  ITN: string;
  MaskedITN: string;
  Display: string;
  PronunciationAssessment: PronunciationAssessmentScores;
  Words: WordAssessment[];
}

/**
 * Pronunciation assessment result (Azure Speech SDK JSON response)
 *
 * This is the complete structure of the parsed JSON result from Azure Speech Service.
 */
export interface PronunciationAssessmentResult {
  RecognitionStatus: string;
  Offset: number;
  Duration: number;
  DisplayText: string;
  NBest: NBestResult[];
}
