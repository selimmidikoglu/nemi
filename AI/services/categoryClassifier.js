"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryClassifier = exports.ImportanceLevel = exports.EmailCategory = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../../Backend/src/config/logger");
const prompts_1 = require("../prompts");
var EmailCategory;
(function (EmailCategory) {
    EmailCategory["WORK"] = "Work";
    EmailCategory["PERSONAL"] = "Personal";
    EmailCategory["ME_RELATED"] = "Me-related";
    EmailCategory["FINANCE"] = "Finance";
    EmailCategory["SOCIAL"] = "Social";
    EmailCategory["PROMOTIONS"] = "Promotions";
    EmailCategory["NEWSLETTERS"] = "Newsletters";
    EmailCategory["OTHER"] = "Other";
})(EmailCategory || (exports.EmailCategory = EmailCategory = {}));
var ImportanceLevel;
(function (ImportanceLevel) {
    ImportanceLevel["CRITICAL"] = "Critical";
    ImportanceLevel["HIGH"] = "High";
    ImportanceLevel["NORMAL"] = "Normal";
    ImportanceLevel["LOW"] = "Low";
})(ImportanceLevel || (exports.ImportanceLevel = ImportanceLevel = {}));
/**
 * Service for classifying emails into categories using AI
 */
class CategoryClassifier {
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
     * Classify a single email
     */
    async classifyEmail(email, userContext) {
        try {
            const prompt = this.buildPrompt(email, userContext);
            let classification;
            if (this.aiProvider === 'claude' && this.anthropic) {
                classification = await this.classifyWithClaude(prompt);
            }
            else if ((this.aiProvider === 'openai' || this.aiProvider === 'deepseek') && this.openai) {
                classification = await this.classifyWithOpenAI(prompt);
            }
            else {
                throw new Error('No AI provider configured');
            }
            return {
                emailId: email.id,
                category: classification.category,
                importance: classification.importance,
                isPersonallyRelevant: classification.isPersonallyRelevant,
                tags: classification.tags || [],
                confidence: classification.confidence || 0.8,
                reasoning: classification.reasoning,
                company: classification.company || null
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to classify email ${email.id}:`, error);
            // Return default classification on error
            return {
                emailId: email.id,
                category: EmailCategory.OTHER,
                importance: ImportanceLevel.NORMAL,
                isPersonallyRelevant: false,
                tags: [],
                confidence: 0.5
            };
        }
    }
    /**
     * Classify multiple emails in batch
     */
    async classifyBatch(emails, userContext) {
        const batchSize = parseInt(process.env.AI_BATCH_SIZE || '10');
        const results = [];
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const batchPromises = batch.map(email => this.classifyEmail(email, userContext));
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            }
            catch (error) {
                logger_1.logger.error(`Failed to process classification batch ${i / batchSize + 1}:`, error);
            }
        }
        return results;
    }
    /**
     * Build prompt for email classification
     */
    buildPrompt(email, userContext) {
        const template = (0, prompts_1.loadPrompt)('classify_email');
        let contextInfo = '';
        if (userContext) {
            contextInfo = `\nUser Context:\n- Name: ${userContext.name}\n- Email: ${userContext.email}\n`;
        }
        return template
            .replace('{{CONTEXT}}', contextInfo)
            .replace('{{FROM}}', email.from)
            .replace('{{TO}}', email.to.join(', '))
            .replace('{{CC}}', email.cc?.join(', ') || 'none')
            .replace('{{SUBJECT}}', email.subject)
            .replace('{{BODY}}', this.truncateBody(email.body));
    }
    /**
     * Classify using Claude API
     */
    async classifyWithClaude(prompt) {
        if (!this.anthropic) {
            throw new Error('Anthropic client not initialized');
        }
        const response = await this.anthropic.messages.create({
            model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
            max_tokens: 300,
            temperature: 0.2,
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
        return this.parseClassificationResponse(textContent.text);
    }
    /**
     * Classify using OpenAI API
     */
    async classifyWithOpenAI(prompt) {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }
        const model = this.aiProvider === 'deepseek'
            ? (process.env.DEEPSEEK_MODEL || 'deepseek-chat')
            : (process.env.OPENAI_MODEL || 'gpt-4-turbo-preview');
        const response = await this.openai.chat.completions.create({
            model: model,
            max_tokens: 300,
            temperature: 0.2,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert email classifier. Provide structured classification results in JSON format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            response_format: { type: 'json_object' }
        });
        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
    }
    /**
     * Parse classification response from AI
     */
    parseClassificationResponse(response) {
        try {
            // Try to parse as JSON first
            return JSON.parse(response);
        }
        catch {
            // Fallback: extract from text
            const categoryMatch = response.match(/category[:\s]+"?(\w+)"?/i);
            const importanceMatch = response.match(/importance[:\s]+"?(\w+)"?/i);
            const meRelatedMatch = response.match(/me-related[:\s]+(true|false)/i);
            return {
                category: categoryMatch ? categoryMatch[1] : EmailCategory.OTHER,
                importance: importanceMatch ? importanceMatch[1] : ImportanceLevel.NORMAL,
                isPersonallyRelevant: meRelatedMatch ? meRelatedMatch[1] === 'true' : false,
                tags: [],
                confidence: 0.7
            };
        }
    }
    /**
     * Truncate email body for classification
     */
    truncateBody(body, maxLength = 2000) {
        if (body.length <= maxLength) {
            return body;
        }
        return body.substring(0, maxLength) + '\n\n[Truncated]';
    }
}
exports.CategoryClassifier = CategoryClassifier;
//# sourceMappingURL=categoryClassifier.js.map