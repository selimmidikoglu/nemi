import { EmailSummarizer } from '../../../AI/services/emailSummarizer';
import { CategoryClassifier } from '../../../AI/services/categoryClassifier';
import { logoService } from '../../../AI/services/logoService';
import { logger } from '../config/logger';

export class AIService {
  private summarizer: EmailSummarizer;
  private classifier: CategoryClassifier;

  constructor() {
    this.summarizer = new EmailSummarizer();
    this.classifier = new CategoryClassifier();
  }

  /**
   * Process new emails with AI (summarize and classify)
   */
  async processNewEmails(emails: any[]): Promise<any[]> {
    if (!process.env.ENABLE_AI_SUMMARIES && !process.env.ENABLE_AUTO_CATEGORIZATION) {
      return emails;
    }

    const processedEmails: any[] = [];

    try {
      // Summarize emails
      if (process.env.ENABLE_AI_SUMMARIES === 'true') {
        logger.info(`Summarizing ${emails.length} emails`);
        const summaries = await this.summarizer.summarizeBatch(emails);

        // Map summaries to emails
        for (const email of emails) {
          const summary = summaries.find(s => s.emailId === email.id);
          email.aiSummary = summary?.summary || null;
        }
      }

      // Classify emails
      if (process.env.ENABLE_AUTO_CATEGORIZATION === 'true') {
        logger.info(`Classifying ${emails.length} emails`);
        const classifications = await this.classifier.classifyBatch(emails);

        // Map classifications to emails
        for (const email of emails) {
          const classification = classifications.find(c => c.emailId === email.id);
          if (classification) {
            email.category = classification.category;
            email.importance = classification.importance;
            email.isPersonallyRelevant = classification.isPersonallyRelevant;

            // Add company information
            if (classification.company) {
              email.companyName = classification.company.name;
              email.companyDomain = classification.company.domain;

              // Get logo URL if we have a domain
              if (classification.company.domain) {
                email.companyLogoUrl = logoService.getLogoUrl(classification.company.domain, 100);
              }
            }

            // Add AI reply assistance fields
            email.isAnswerable = classification.isAnswerable || false;
            if (classification.suggestedReplies) {
              email.suggestedReplies = classification.suggestedReplies;
            }
          }
        }
      }

      processedEmails.push(...emails);
    } catch (error) {
      logger.error('Failed to process emails with AI:', error);
      // Return original emails if AI processing fails
      return emails;
    }

    return processedEmails;
  }

  /**
   * Classify existing emails
   */
  async classifyEmails(emails: any[]): Promise<any[]> {
    try {
      return await this.classifier.classifyBatch(emails);
    } catch (error) {
      logger.error('Failed to classify emails:', error);
      throw error;
    }
  }

  /**
   * Summarize a single email
   */
  async summarizeEmail(email: any): Promise<string> {
    try {
      const result = await this.summarizer.summarizeEmail(email);
      return result.summary;
    } catch (error) {
      logger.error('Failed to summarize email:', error);
      throw error;
    }
  }
}
