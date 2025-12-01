export interface Email {
    id: string;
    subject: string;
    body: string;
    from: string;
    to: string[];
    cc?: string[];
}
export interface ClassificationResult {
    emailId: string;
    category: EmailCategory;
    importance: ImportanceLevel;
    isPersonallyRelevant: boolean;
    tags: string[];
    confidence: number;
    reasoning?: string;
    company?: {
        name: string | null;
        domain: string | null;
    };
    isAnswerable?: boolean;
    suggestedReplies?: {
        quick: string;
        standard: string;
        detailed: string;
    };
}
export declare enum EmailCategory {
    WORK = "Work",
    PERSONAL = "Personal",
    ME_RELATED = "Me-related",
    FINANCE = "Finance",
    SOCIAL = "Social",
    PROMOTIONS = "Promotions",
    NEWSLETTERS = "Newsletters",
    OTHER = "Other"
}
export declare enum ImportanceLevel {
    CRITICAL = "Critical",
    HIGH = "High",
    NORMAL = "Normal",
    LOW = "Low"
}
/**
 * Service for classifying emails into categories using AI
 */
export declare class CategoryClassifier {
    private aiProvider;
    private anthropic?;
    private openai?;
    constructor();
    /**
     * Classify a single email
     */
    classifyEmail(email: Email, userContext?: any): Promise<ClassificationResult>;
    /**
     * Classify multiple emails in batch
     */
    classifyBatch(emails: Email[], userContext?: any): Promise<ClassificationResult[]>;
    /**
     * Build prompt for email classification
     */
    private buildPrompt;
    /**
     * Classify using Claude API
     */
    private classifyWithClaude;
    /**
     * Classify using OpenAI API
     */
    private classifyWithOpenAI;
    /**
     * Parse classification response from AI
     */
    private parseClassificationResponse;
    /**
     * Truncate email body for classification
     */
    private truncateBody;
}
//# sourceMappingURL=categoryClassifier.d.ts.map