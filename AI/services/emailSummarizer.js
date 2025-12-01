"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSummarizer = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../../Backend/src/config/logger");
const prompts_1 = require("../prompts");
/**
 * Service for generating AI summaries of emails
 */
class EmailSummarizer {
    constructor() {
        this.aiProvider = process.env.AI_PROVIDER || 'claude';
        if (this.aiProvider === 'claude') {
            this.anthropic = new sdk_1.default({
                apiKey: process.env.ANTHROPIC_API_KEY
            });
        }
        else if (this.aiProvider === 'openai') {
            this.openai = new openai_1.default({
                apiKey: process.env.OPENAI_API_KEY
            });
        }
        else if (this.aiProvider === 'deepseek') {
            this.openai = new openai_1.default({
                apiKey: process.env.DEEPSEEK_API_KEY,
                baseURL: 'https://api.deepseek.com'
            });
        }
    }
    /**
     * Summarize a single email
     */
    async summarizeEmail(email) {
        try {
            const prompt = this.buildPrompt(email);
            let summary;
            if (this.aiProvider === 'claude' && this.anthropic) {
                summary = await this.summarizeWithClaude(prompt);
            }
            else if ((this.aiProvider === 'openai' || this.aiProvider === 'deepseek') && this.openai) {
                summary = await this.summarizeWithOpenAI(prompt);
            }
            else {
                throw new Error('No AI provider configured');
            }
            return {
                emailId: email.id,
                summary: summary.trim(),
                confidence: 0.85 // TODO: Calculate actual confidence score
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to summarize email ${email.id}:`, error);
            throw error;
        }
    }
    /**
     * Summarize multiple emails in batch
     */
    async summarizeBatch(emails) {
        const batchSize = parseInt(process.env.AI_BATCH_SIZE || '10');
        const results = [];
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const batchPromises = batch.map(email => this.summarizeEmail(email));
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            }
            catch (error) {
                logger_1.logger.error(`Failed to process batch ${i / batchSize + 1}:`, error);
                // Continue with next batch even if this one fails
            }
        }
        return results;
    }
    /**
     * Build prompt for email summarization
     */
    buildPrompt(email) {
        const template = (0, prompts_1.loadPrompt)('summarize_email');
        return template
            .replace('{{FROM}}', email.from)
            .replace('{{SUBJECT}}', email.subject)
            .replace('{{BODY}}', this.truncateBody(email.body))
            .replace('{{DATE}}', email.date);
    }
    /**
     * Summarize using Claude API
     */
    async summarizeWithClaude(prompt) {
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
    async summarizeWithOpenAI(prompt) {
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
    truncateBody(body, maxLength = 3000) {
        if (body.length <= maxLength) {
            return body;
        }
        return body.substring(0, maxLength) + '\n\n[Email truncated for length]';
    }
}
exports.EmailSummarizer = EmailSummarizer;
//# sourceMappingURL=emailSummarizer.js.map