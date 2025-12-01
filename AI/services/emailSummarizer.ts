import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { logger } from '../../Backend/src/config/logger';
import { loadPrompt } from '../prompts';

export interface Email {
  id: string;
  subject: string;
  body: string;
  from: string;
  date: string;
}

export interface SummarizationResult {
  emailId: string;
  summary: string;
  confidence: number;
}

/**
 * Service for generating AI summaries of emails
 */
export class EmailSummarizer {
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
   * Summarize a single email
   */
  async summarizeEmail(email: Email): Promise<SummarizationResult> {
    try {
      const prompt = this.buildPrompt(email);
      let summary: string;

      if (this.aiProvider === 'claude' && this.anthropic) {
        summary = await this.summarizeWithClaude(prompt);
      } else if ((this.aiProvider === 'openai' || this.aiProvider === 'deepseek') && this.openai) {
        summary = await this.summarizeWithOpenAI(prompt);
      } else {
        throw new Error('No AI provider configured');
      }

      return {
        emailId: email.id,
        summary: summary.trim(),
        confidence: 0.85 // TODO: Calculate actual confidence score
      };
    } catch (error) {
      logger.error(`Failed to summarize email ${email.id}:`, error);
      throw error;
    }
  }

  /**
   * Summarize multiple emails in batch
   */
  async summarizeBatch(emails: Email[]): Promise<SummarizationResult[]> {
    const batchSize = parseInt(process.env.AI_BATCH_SIZE || '10');
    const results: SummarizationResult[] = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email => this.summarizeEmail(email));

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        logger.error(`Failed to process batch ${i / batchSize + 1}:`, error);
        // Continue with next batch even if this one fails
      }
    }

    return results;
  }

  /**
   * Build prompt for email summarization
   */
  private buildPrompt(email: Email): string {
    const template = loadPrompt('summarize_email');

    return template
      .replace('{{FROM}}', email.from)
      .replace('{{SUBJECT}}', email.subject)
      .replace('{{BODY}}', this.truncateBody(email.body))
      .replace('{{DATE}}', email.date);
  }

  /**
   * Summarize using Claude API
   */
  private async summarizeWithClaude(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      temperature: 0.3,
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

    return textContent.text;
  }

  /**
   * Summarize using OpenAI API
   */
  private async summarizeWithOpenAI(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const model = this.aiProvider === 'deepseek'
      ? (process.env.DEEPSEEK_MODEL || 'deepseek-chat')
      : (process.env.OPENAI_MODEL || 'gpt-4-turbo-preview');

    const response = await this.openai.chat.completions.create({
      model: model,
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: 'You are an expert email summarizer. Provide concise, accurate summaries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Truncate email body to reasonable length for AI processing
   */
  private truncateBody(body: string, maxLength: number = 3000): string {
    if (body.length <= maxLength) {
      return body;
    }

    return body.substring(0, maxLength) + '\n\n[Email truncated for length]';
  }
}
