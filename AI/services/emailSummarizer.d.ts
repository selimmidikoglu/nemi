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
export declare class EmailSummarizer {
    private aiProvider;
    private anthropic?;
    private openai?;
    constructor();
    /**
     * Summarize a single email
     */
    summarizeEmail(email: Email): Promise<SummarizationResult>;
    /**
     * Summarize multiple emails in batch
     */
    summarizeBatch(emails: Email[]): Promise<SummarizationResult[]>;
    /**
     * Build prompt for email summarization
     */
    private buildPrompt;
    /**
     * Summarize using Claude API
     */
    private summarizeWithClaude;
    /**
     * Summarize using OpenAI API
     */
    private summarizeWithOpenAI;
    /**
     * Truncate email body to reasonable length for AI processing
     */
    private truncateBody;
}
//# sourceMappingURL=emailSummarizer.d.ts.map