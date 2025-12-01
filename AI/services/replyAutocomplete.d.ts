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
export declare class ReplyAutocomplete {
    private aiProvider;
    private anthropic?;
    private openai?;
    constructor();
    /**
     * Generate autocomplete suggestion for current text
     */
    getAutocompleteSuggestion(request: AutocompleteRequest): Promise<AutocompleteResult>;
    /**
     * Build prompt for autocomplete
     */
    private buildAutocompletePrompt;
    /**
     * Get autocomplete using Claude API
     */
    private autocompleteWithClaude;
    /**
     * Get autocomplete using OpenAI API
     */
    private autocompleteWithOpenAI;
    /**
     * Calculate confidence score based on suggestion quality
     */
    private calculateConfidence;
}
//# sourceMappingURL=replyAutocomplete.d.ts.map