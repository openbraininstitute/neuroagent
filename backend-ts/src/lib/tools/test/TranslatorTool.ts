/**
 * Translator Tool - Test tool for filtering
 *
 * Simple translation tool for testing tool filtering.
 */

import { z } from 'zod';
import { BaseTool, BaseContextVariables } from '../base-tool';

/**
 * Input schema for translator tool
 */
const TranslatorToolInputSchema = z.object({
  text: z.string().describe('The text to translate'),
  source_language: z.string().optional().describe('Source language (auto-detect if not specified)'),
  target_language: z.string().describe('Target language to translate to'),
});

/**
 * Translator Tool
 *
 * Translates text between different languages (mock implementation).
 */
export class TranslatorTool extends BaseTool<
  typeof TranslatorToolInputSchema,
  BaseContextVariables
> {
  static readonly toolName = 'translate_text';
  static readonly toolNameFrontend = 'Translator';
  static readonly toolDescription =
    'Translate text from one language to another. Supports major world languages including English, Spanish, French, German, Chinese, and Japanese.';
  static readonly toolDescriptionFrontend =
    'Translate text between languages';
  static readonly toolUtterances = [
    'Translate "hello" to Spanish',
    'How do you say "thank you" in French?',
    'Convert this text to German',
    'Translate "good morning" to Japanese',
    'What is "goodbye" in Chinese?',
  ];
  static readonly toolHil = false;

  override contextVariables: BaseContextVariables;
  override inputSchema = TranslatorToolInputSchema;

  constructor(contextVariables: BaseContextVariables) {
    super();
    this.contextVariables = contextVariables;
  }

  async execute(input: z.infer<typeof TranslatorToolInputSchema>): Promise<unknown> {
    const { text, source_language = 'auto', target_language } = input;

    // Mock translations for common phrases
    const mockTranslations: Record<string, Record<string, string>> = {
      hello: {
        spanish: 'hola',
        french: 'bonjour',
        german: 'hallo',
        japanese: 'こんにちは',
        chinese: '你好',
      },
      'thank you': {
        spanish: 'gracias',
        french: 'merci',
        german: 'danke',
        japanese: 'ありがとう',
        chinese: '谢谢',
      },
      goodbye: {
        spanish: 'adiós',
        french: 'au revoir',
        german: 'auf wiedersehen',
        japanese: 'さようなら',
        chinese: '再见',
      },
    };

    const lowerText = text.toLowerCase();
    const lowerTarget = target_language.toLowerCase();

    const translation = mockTranslations[lowerText]?.[lowerTarget] ||
      `[Translated: ${text}]`;

    return {
      original_text: text,
      translated_text: translation,
      source_language: source_language === 'auto' ? 'English (detected)' : source_language,
      target_language,
    };
  }
}
