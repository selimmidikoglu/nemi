import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { logger } from '../../Backend/src/config/logger';

export interface AutocompleteRequest {
  currentText: string;
  emailContext: {
    subject: string;
    from: string;
    body: string;
    aiSummary?: string;
  };
}

export interface AutocompleteResult {
  suggestion: string;
  confidence: number;
}

/**
 * Service for providing real-time AI autocomplete suggestions while typing email replies
 */
export class ReplyAutocomplete {
  private aiProvider: string;
  private anthropic?: Anthropic;
  private openai?: OpenAI;

  constructor() {
    this.aiProvider = process.env.AI_PROVIDER || 'claude';

    if (this.aiProvider === 'claude') {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    } else if (this.aiProvider === 'openai') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else if (this.aiProvider === 'deepseek') {
      this.openai = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com'
      });
    }
  }

  /**
   * Generate autocomplete suggestion for current text
   */
  async getAutocompleteSuggestion(request: AutocompleteRequest): Promise<AutocompleteResult> {
    try {
      const prompt = this.buildAutocompletePrompt(request);

      if (this.aiProvider === 'claude' && this.anthropic) {
        return await this.autocompleteWithClaude(prompt);
      } else if ((this.aiProvider === 'openai' || this.aiProvider === 'deepseek') && this.openai) {
        return await this.autocompleteWithOpenAI(prompt);
      } else {
        throw new Error('No AI provider configured');
      }
    } catch (error) {
      logger.error('Failed to generate autocomplete suggestion:', error);
      return {
        suggestion: '',
        confidence: 0
      };
    }
  }

  /**
   * Build prompt for autocomplete
   */
  private buildAutocompletePrompt(request: AutocompleteRequest): string {
    return `You are Gmail Smart Compose. Suggest ONLY 2-4 words to complete the current sentence.

Email Context:
From: ${request.emailContext.from}
Subject: ${request.emailContext.subject}

Current text: "${request.currentText || ''}"

CRITICAL RULES:
- Maximum 2-4 words ONLY (like Gmail Smart Compose)
- ONLY suggest after complete words (when text ends with a space)
- If text ends mid-word (no trailing space), return empty string
- Just complete the current phrase, nothing more
- Be extremely brief and natural
- Return ONLY the next few words, no punctuation at end
- If text is complete, return empty string

Examples:
"Thank you " → "for your email"
"I'll review " → "this today"
"That sounds " → "great"
"Looking forward " → "to hearing from"
"I appreciate " → "your help"
"Let me know " → "if you need"

Completion (2-4 words max):`;
  }

  /**
   * Get autocomplete using Claude API
   */
  private async autocompleteWithClaude(prompt: string): Promise<AutocompleteResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022', // Use faster Haiku for autocomplete
      max_tokens: 15, // Very short suggestions (2-4 words like Gmail)
      temperature: 0.5, // Lower temperature for more predictable suggestions
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    const suggestion = textContent.text.trim();

    // Calculate confidence based on response quality
    const confidence = this.calculateConfidence(suggestion);

    return {
      suggestion,
      confidence
    };
  }

  /**
   * Get autocomplete using OpenAI API
   */
  private async autocompleteWithOpenAI(prompt: string): Promise<AutocompleteResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const model = this.aiProvider === 'deepseek'
      ? (process.env.DEEPSEEK_MODEL || 'deepseek-chat')
      : 'gpt-3.5-turbo'; // Use faster model for autocomplete

    const response = await this.openai.chat.completions.create({
      model: model,
      max_tokens: 15, // Very short suggestions (2-4 words like Gmail)
      temperature: 0.5, // Lower temperature for more predictable suggestions
      messages: [
        {
          role: 'system',
          content: 'You are Gmail Smart Compose. Suggest ONLY 2-4 words to complete the phrase. Be extremely brief.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const suggestion = (response.choices[0]?.message?.content || '').trim();
    const confidence = this.calculateConfidence(suggestion);

    return {
      suggestion,
      confidence
    };
  }

  /**
   * Calculate confidence score based on suggestion quality
   */
  private calculateConfidence(suggestion: string): number {
    if (!suggestion) return 0;

    // Gmail-style: optimal is 2-4 words
    const wordCount = suggestion.trim().split(/\s+/).length;
    let confidence = 0.7;

    // Optimal word count range (2-4 words like Gmail)
    if (wordCount >= 2 && wordCount <= 4) {
      confidence += 0.2;
    } else if (wordCount > 4) {
      // Heavy penalty for suggestions that are too long
      confidence -= 0.4;
    } else if (wordCount === 1) {
      // Single word is okay but less confident
      confidence -= 0.1;
    }

    // Natural language patterns
    if (suggestion.match(/\b(for|your|this|the|and|to|from)\b/i)) {
      confidence += 0.1;
    }

    // Avoid weird suggestions
    if (suggestion.length < 2 || suggestion.match(/^[^a-zA-Z]/)) {
      confidence -= 0.5;
    }

    return Math.min(Math.max(confidence, 0), 1.0);
  }
}
