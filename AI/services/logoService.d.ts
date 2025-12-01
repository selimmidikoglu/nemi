/**
 * Service for fetching company logos from logo.dev API
 */
export declare class LogoService {
    private apiKey;
    private baseUrl;
    constructor();
    /**
     * Get logo URL for a company domain
     * @param domain - Company domain (e.g., "github.com", "stripe.com")
     * @param size - Logo size in pixels (default: 100)
     * @returns Logo URL or null if not available
     */
    getLogoUrl(domain: string | null, size?: number): string | null;
    /**
     * Clean domain string to extract just the domain name
     */
    private cleanDomain;
    /**
     * Extract domain from email address
     */
    extractDomainFromEmail(email: string): string | null;
    /**
     * Check if a domain is a generic email provider (not company-specific)
     */
    isGenericProvider(domain: string): boolean;
    /**
     * Get logo URL from email address
     * Returns null for generic providers unless forceShow is true
     */
    getLogoFromEmail(email: string, forceShow?: boolean, size?: number): string | null;
}
export declare const logoService: LogoService;
//# sourceMappingURL=logoService.d.ts.map