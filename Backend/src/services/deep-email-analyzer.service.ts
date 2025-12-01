import { Pool } from 'pg';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../config/logger';
import fs from 'fs';
import path from 'path';
import { parseEmailSender, formatSenderInfoForAI, getServiceConfig } from '../utils/email-domain-parser';

/**
 * Badge structure returned by AI
 */
interface EmailBadge {
  name: string;
  color: string;
  icon: string;
  importance: number;
  category: string;
}

/**
 * Scores structure returned by AI
 */
interface EmailScores {
  promotional: number;
  personal: number;
  urgent: number;
  work_related: number;
  financial: number;
  social: number;
  requires_action: number;
}

/**
 * Metadata structure returned by AI
 */
interface EmailMetadata {
  has_meeting: boolean;
  meeting_url: string | null;
  meeting_time: string | null;
  meeting_platform: string | null;
  has_deadline: boolean;
  deadline: string | null;
  deadline_description: string | null;
  has_tracking_number: boolean;
  tracking_number: string | null;
  tracking_url: string | null;
  has_confirmation_code: boolean;
  confirmation_code: string | null;
  has_flight_info: boolean;
  flight_number: string | null;
  flight_time: string | null;
  sender_type: string;
  html_snippet: string | null;
  render_as_html: boolean;
}

/**
 * Complete AI analysis response
 */
interface AIAnalysisResponse {
  summary: string;
  is_about_me: boolean;
  mention_context: string | null;
  html_snippet: string | null;
  render_as_html: boolean;
  badges: EmailBadge[];
  scores: EmailScores;
  suggested_categories: string[];
  tags?: string[];
  metadata: EmailMetadata;
}

/**
 * Extended AI analysis response with computed fields for saving
 */
export interface ExtendedAIAnalysisResponse extends AIAnalysisResponse {
  masterImportanceScore: number;
  category: string;
  importance: string;
  isPersonallyRelevant: boolean;
}

/**
 * Email data for analysis
 */
interface EmailForAnalysis {
  id: string;
  from_email: string;
  from_name: string | null;
  to_emails: any;
  cc_emails?: any;
  subject: string;
  body: string;
  date: Date;
}

/**
 * Badge definition with full details
 */
interface BadgeDefinition {
  name: string;
  color: string;
  icon: string;
  category: string | null;
  usageCount: number;
}

/**
 * Category definition with statistics
 */
interface CategoryDefinition {
  name: string;
  emailCount: number;
  badgeCount: number;
}

/**
 * User context for personalization
 */
interface UserContext {
  userId: string;
  userName: string;
  userEmail: string;
  userBadges: BadgeDefinition[];
  userCategories: CategoryDefinition[];
}

/**
 * Deep Email Analyzer Service
 * Uses AI to comprehensively analyze emails: summary, badges, scores, categories, metadata
 */
export class DeepEmailAnalyzerService {
  private pool: Pool;
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private provider: string;
  private model: string;
  private promptTemplate: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.provider = process.env.AI_PROVIDER || 'openai';

    // Initialize AI clients
    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    } else if (this.provider === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1'
      });
      this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
      logger.info('Using DeepSeek AI provider');
    } else if (this.provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    } else {
      logger.error('No AI provider configured');
      throw new Error('AI provider not configured');
    }

    // Load prompt template
    this.promptTemplate = this.loadPromptTemplate();
  }

  /**
   * Load the master prompt template
   */
  private loadPromptTemplate(): string {
    const promptPath = path.join(__dirname, '../../../AI/prompts/deep_email_analysis.txt');

    try {
      if (fs.existsSync(promptPath)) {
        return fs.readFileSync(promptPath, 'utf-8');
      }
    } catch (error) {
      logger.warn('Could not load prompt template from file, using fallback');
    }

    // Fallback prompt if file doesn't exist
    return `You are an intelligent email analyzer. Analyze this email and return ONLY valid JSON.

Email Details:
From: {{FROM_NAME}} <{{FROM_EMAIL}}>
To: {{TO_EMAILS}}
Subject: {{SUBJECT}}
Body: {{BODY}}

User Context:
User Name: {{USER_NAME}}
User Email: {{USER_EMAIL}}
Previously used badges: {{USER_BADGES}}

Return JSON with this structure:
{
  "summary": "2-line summary max 200 chars",
  "badges": [{"name": "string", "color": "#RRGGBB", "icon": "string", "importance": 0.0-1.0}],
  "scores": {
    "promotional": 0.0-1.0,
    "personal": 0.0-1.0,
    "urgent": 0.0-1.0,
    "work_related": 0.0-1.0,
    "financial": 0.0-1.0,
    "social": 0.0-1.0,
    "requires_action": 0.0-1.0
  },
  "suggested_categories": ["string"],
  "metadata": {
    "has_meeting": boolean,
    "meeting_url": null,
    "meeting_time": null,
    "meeting_platform": null,
    "has_deadline": boolean,
    "deadline": null,
    "deadline_description": null,
    "has_tracking_number": boolean,
    "tracking_number": null,
    "tracking_url": null,
    "has_confirmation_code": boolean,
    "confirmation_code": null,
    "has_flight_info": boolean,
    "flight_number": null,
    "flight_time": null,
    "sender_type": "string",
    "html_snippet": null
  }
}`;
  }

  /**
   * Get user context for personalization
   */
  private async getUserContext(userId: string): Promise<UserContext> {
    // Get user info
    const userResult = await this.pool.query(
      'SELECT display_name, email FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0] || { display_name: 'User', email: '' };

    // Get user's badge definitions with full details from user_badge_definitions
    const badgesResult = await this.pool.query(
      `SELECT badge_name, badge_color, badge_icon, category, usage_count
       FROM user_badge_definitions
       WHERE user_id = $1
       ORDER BY usage_count DESC, last_used_at DESC
       LIMIT 50`,
      [userId]
    );

    const userBadges: BadgeDefinition[] = badgesResult.rows.map(row => ({
      name: row.badge_name,
      color: row.badge_color,
      icon: row.badge_icon,
      category: row.category,
      usageCount: parseInt(row.usage_count)
    }));

    // Get badge category statistics
    const categoriesResult = await this.pool.query(
      `SELECT
         ubd.category,
         COUNT(DISTINCT eb.email_id) as email_count,
         COUNT(DISTINCT ubd.badge_name) as badge_count
       FROM user_badge_definitions ubd
       LEFT JOIN email_badges eb ON eb.badge_name = ubd.badge_name
       LEFT JOIN emails e ON e.id = eb.email_id AND e.user_id = ubd.user_id
       WHERE ubd.user_id = $1 AND ubd.category IS NOT NULL
       GROUP BY ubd.category
       ORDER BY email_count DESC, badge_count DESC
       LIMIT 30`,
      [userId]
    );

    const userCategories: CategoryDefinition[] = categoriesResult.rows.map(row => ({
      name: row.category,
      emailCount: parseInt(row.email_count) || 0,
      badgeCount: parseInt(row.badge_count)
    }));

    return {
      userId,
      userName: user.display_name || user.email || 'User',
      userEmail: user.email,
      userBadges,
      userCategories
    };
  }

  /**
   * Build the prompt from template and email data
   */
  private buildPrompt(email: EmailForAnalysis, userContext: UserContext): string {
    const toEmails = Array.isArray(email.to_emails)
      ? email.to_emails.map((t: any) => t.email).join(', ')
      : JSON.stringify(email.to_emails);

    const ccEmails = email.cc_emails
      ? Array.isArray(email.cc_emails)
        ? email.cc_emails.map((c: any) => c.email).join(', ')
        : JSON.stringify(email.cc_emails)
      : 'None';

    // Parse sender information for domain intelligence
    const senderInfo = parseEmailSender(email.from_email);
    const senderMetadata = formatSenderInfoForAI(senderInfo);

    // Format badges as structured JSON for AI
    const badgesJson = userContext.userBadges.length > 0
      ? JSON.stringify(userContext.userBadges, null, 2)
      : 'None yet';

    // Format categories as structured JSON for AI
    const categoriesJson = userContext.userCategories.length > 0
      ? JSON.stringify(userContext.userCategories, null, 2)
      : 'None yet';

    let prompt = this.promptTemplate
      .replace(/\{\{FROM_NAME\}\}/g, email.from_name || 'Unknown')
      .replace(/\{\{FROM_EMAIL\}\}/g, email.from_email)
      .replace(/\{\{TO_EMAILS\}\}/g, toEmails)
      .replace(/\{\{CC_EMAILS\}\}/g, ccEmails)
      .replace(/\{\{SENDER_METADATA\}\}/g, senderMetadata)
      .replace(/\{\{SUBJECT\}\}/g, email.subject)
      .replace(/\{\{BODY\}\}/g, email.body.substring(0, 4000)) // Limit body length
      .replace(/\{\{DATE\}\}/g, email.date.toISOString())
      .replace(/\{\{USER_NAME\}\}/g, userContext.userName)
      .replace(/\{\{USER_EMAIL\}\}/g, userContext.userEmail)
      .replace(/\{\{USER_BADGES\}\}/g, badgesJson)
      .replace(/\{\{USER_CATEGORIES\}\}/g, categoriesJson);

    return prompt;
  }

  /**
   * Call AI to analyze email
   */
  private async callAI(prompt: string): Promise<string> {
    const startTime = Date.now();

    try {
      if ((this.provider === 'openai' || this.provider === 'deepseek') && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert email analyzer. Return ONLY valid JSON, no markdown, no code blocks, no explanations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 1500
        });

        const duration = Date.now() - startTime;
        logger.info(`${this.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} analysis completed in ${duration}ms`);

        return response.choices[0]?.message?.content || '{}';
      } else if (this.provider === 'claude' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 1500,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        const duration = Date.now() - startTime;
        logger.info(`Claude analysis completed in ${duration}ms`);

        const content = response.content[0];
        return content.type === 'text' ? content.text : '{}';
      }

      throw new Error('No AI provider available');
    } catch (error: any) {
      logger.error('AI call failed:', error);
      throw error;
    }
  }

  /**
   * Parse and validate AI response
   */
  private parseAIResponse(rawResponse: string): AIAnalysisResponse {
    try {
      // Remove markdown code blocks if present
      let cleaned = rawResponse.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);

      // Log the complete DeepSeek response
      console.log('\n╔════════════════════════════════════════════════════════════════╗');
      console.log('║           🤖 DEEPSEEK AI ANALYSIS RESPONSE                    ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('\n📝 SUMMARY:', parsed.summary);
      console.log('\n🏷️  BADGES:', parsed.badges.map((b: any) => `${b.name} (${b.importance})`).join(', '));
      console.log('\n📊 SCORES:');
      console.log('   - Promotional:', parsed.scores.promotional);
      console.log('   - Personal:', parsed.scores.personal);
      console.log('   - Urgency:', parsed.scores.urgency);
      console.log('   - Work:', parsed.scores.work);
      console.log('   - Financial:', parsed.scores.financial);
      console.log('\n📂 CATEGORIES:', parsed.suggested_categories.join(', '));
      console.log('\n🔍 FULL JSON RESPONSE:');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('\n' + '='.repeat(65) + '\n');

      // Validate required fields
      if (!parsed.summary || !parsed.badges || !parsed.scores || !parsed.suggested_categories || !parsed.metadata) {
        throw new Error('Missing required fields in AI response');
      }

      // Validate scores are within range
      const scores = parsed.scores;
      Object.keys(scores).forEach(key => {
        if (scores[key] < 0 || scores[key] > 1) {
          logger.warn(`Score ${key} out of range: ${scores[key]}, clamping to 0-1`);
          scores[key] = Math.max(0, Math.min(1, scores[key]));
        }
      });

      // Validate badge importance scores
      parsed.badges = parsed.badges.map((badge: EmailBadge) => ({
        ...badge,
        importance: Math.max(0, Math.min(1, badge.importance || 0.5))
      }));

      return parsed;
    } catch (error: any) {
      logger.error('Failed to parse AI response:', error);
      logger.error('Raw response:', rawResponse);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * Calculate master importance score from all sub-scores and badges
   */
  private calculateMasterScore(scores: EmailScores, badges: EmailBadge[]): number {
    // Base score from email scores (weighted)
    const scoreWeights = {
      urgent: 1.0,
      requires_action: 0.9,
      personal: 0.6,
      work_related: 0.5,
      financial: 0.4,
      social: 0.3,
      promotional: 0.1
    };

    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(scoreWeights).forEach(([key, weight]) => {
      const scoreKey = key === 'requires_action' ? 'requires_action' : `${key}${key === 'urgent' ? '_score' : key === 'work_related' ? '_score' : '_score'}`;
      const actualKey = key + (key.includes('_') ? '' : '_score');
      const score = (scores as any)[actualKey.replace('_score_score', '_score')] || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    });

    let masterScore = weightedSum / totalWeight;

    // Boost from important badges
    const badgeBoost = badges.reduce((sum, badge) => sum + (badge.importance * 0.1), 0);
    masterScore = Math.min(1.0, masterScore + badgeBoost);

    return parseFloat(masterScore.toFixed(2));
  }

  /**
   * Save badges to database
   */
  private async saveBadges(emailId: string, badges: EmailBadge[]): Promise<void> {
    for (const badge of badges) {
      try {
        await this.pool.query(
          `INSERT INTO email_badges (email_id, badge_name, badge_color, badge_icon, importance_score, created_by_ai, user_approved, category)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (email_id, badge_name) DO UPDATE
           SET badge_color = $3, badge_icon = $4, importance_score = $5, category = $8`,
          [emailId, badge.name, badge.color, badge.icon, badge.importance, true, false, badge.category || 'Other']
        );
      } catch (error) {
        logger.error(`Failed to save badge ${badge.name} for email ${emailId}:`, error);
      }
    }
  }

  /**
   * Save scores to database
   */
  private async saveScores(emailId: string, scores: EmailScores): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO email_scores (
          email_id, promotional_score, personal_score, urgent_score,
          work_score, financial_score, social_score, requires_action_score
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email_id) DO UPDATE
        SET promotional_score = $2, personal_score = $3, urgent_score = $4,
            work_score = $5, financial_score = $6, social_score = $7,
            requires_action_score = $8`,
        [
          emailId,
          scores.promotional,
          scores.personal,
          scores.urgent,
          scores.work_related,
          scores.financial,
          scores.social,
          scores.requires_action
        ]
      );
    } catch (error) {
      logger.error(`Failed to save scores for email ${emailId}:`, error);
    }
  }

  /**
   * Save analysis history
   */
  private async saveHistory(
    emailId: string,
    prompt: string,
    rawResponse: string,
    parsedResponse: AIAnalysisResponse,
    durationMs: number,
    success: boolean,
    errorMessage: string | null = null
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO ai_analysis_history (
          email_id, model_used, prompt_version, raw_request, raw_response,
          parsed_response, analysis_duration_ms, success, error_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          emailId,
          this.model,
          '1.0',
          prompt.substring(0, 10000), // Limit size
          rawResponse.substring(0, 10000),
          JSON.stringify(parsedResponse),
          durationMs,
          success,
          errorMessage
        ]
      );
    } catch (error) {
      logger.error(`Failed to save analysis history for email ${emailId}:`, error);
    }
  }

  /**
   * Main method: Analyze a single email
   */
  async analyzeEmail(email: EmailForAnalysis, userId: string): Promise<AIAnalysisResponse | null> {
    const startTime = Date.now();

    try {
      logger.info(`Analyzing email ${email.id}: "${email.subject}"`);

      // Get user context
      const userContext = await this.getUserContext(userId);

      // Build prompt
      const prompt = this.buildPrompt(email, userContext);

      // Call AI
      const rawResponse = await this.callAI(prompt);

      // Parse response
      const analysis = this.parseAIResponse(rawResponse);

      // DEBUG: Log raw response and parsed analysis
      console.log('============ RAW RESPONSE DEBUG ============');
      console.log('Raw AI Response (first 500 chars):', rawResponse.substring(0, 500));
      console.log('Parsed analysis object:', JSON.stringify(analysis, null, 2));
      console.log('==========================================');

      // Calculate master score
      const masterScore = this.calculateMasterScore(analysis.scores, analysis.badges);

      // DEBUG: Log HTML fields before saving
      console.log('============ HTML FIELDS DEBUG ============');
      console.log('Email ID:', email.id);
      console.log('analysis.html_snippet:', analysis.html_snippet);
      console.log('analysis.render_as_html:', analysis.render_as_html);
      console.log('html_snippet type:', typeof analysis.html_snippet);
      console.log('render_as_html type:', typeof analysis.render_as_html);
      console.log('html_snippet length:', analysis.html_snippet?.length);
      console.log('Values being sent to DB:');
      console.log('  $10 (html_snippet):', analysis.html_snippet || null);
      console.log('  $11 (render_as_html):', analysis.render_as_html || false);
      console.log('==========================================');

      logger.info('HTML fields before saving:', {
        html_snippet: analysis.html_snippet,
        render_as_html: analysis.render_as_html
      });

      logger.info('Values being sent to DB:', {
        '$10 (html_snippet)': analysis.html_snippet || null,
        '$11 (render_as_html)': analysis.render_as_html || false
      });

      // Save everything to database
      await Promise.all([
        this.saveBadges(email.id, analysis.badges),
        this.saveScores(email.id, analysis.scores),
        this.pool.query(
          `UPDATE emails
           SET ai_summary = $1,
               ai_raw_response = $2,
               ai_analyzed_at = NOW(),
               ai_model_version = $3,
               master_importance_score = $4,
               category = $5,
               is_personally_relevant = $6,
               tags = $7,
               is_about_me = $8,
               mention_context = $9,
               html_snippet = $10,
               render_as_html = $11
           WHERE id = $12`,
          [
            analysis.summary,
            JSON.stringify(analysis),
            this.model,
            masterScore,
            analysis.suggested_categories[0] || 'Other',
            analysis.scores.personal > 0.5,
            analysis.tags || [],
            analysis.is_about_me || false,
            analysis.mention_context || null,
            analysis.html_snippet || null,
            analysis.render_as_html || false,
            email.id
          ]
        )
      ]);

      // Save history
      const duration = Date.now() - startTime;
      await this.saveHistory(email.id, prompt, rawResponse, analysis, duration, true);

      logger.info(`Email ${email.id} analyzed successfully in ${duration}ms. Master score: ${masterScore}`);

      return analysis;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to analyze email ${email.id}:`, error);

      // Save failed attempt to history
      await this.saveHistory(email.id, '', '', {} as any, duration, false, error.message);

      return null;
    }
  }

  /**
   * Analyze email BEFORE saving to database (for AI-first flow)
   * Does not require email to exist in database
   */
  async analyzeEmailBeforeSave(email: EmailForAnalysis, userId: string): Promise<ExtendedAIAnalysisResponse | null> {
    const startTime = Date.now();

    try {
      logger.info(`Analyzing new email (before save): "${email.subject.substring(0, 50)}..."`);

      // Get user context
      const userContext = await this.getUserContext(userId);

      // Build prompt
      const prompt = this.buildPrompt(email, userContext);

      // Call AI
      const rawResponse = await this.callAI(prompt);

      // Parse response
      const analysis = this.parseAIResponse(rawResponse);

      // Parse sender information to extract company/service info
      const senderInfo = parseEmailSender(email.from_email);
      const serviceConfig = getServiceConfig(senderInfo.domain);

      // Update or create company badge if we have a known service or company name
      if (senderInfo.knownService || senderInfo.companyName) {
        const companyName = senderInfo.knownService || senderInfo.companyName!;

        // Check if AI already created a badge with this name
        const existingBadge = analysis.badges.find(b => b.name === companyName);

        if (existingBadge) {
          // Update the existing badge with company category and proper color
          existingBadge.category = 'Company';
          if (serviceConfig?.color) {
            existingBadge.color = serviceConfig.color;
          }
          logger.info(`Updated existing badge "${companyName}" to Company category`);
        } else {
          // Create new company badge
          const companyBadge: EmailBadge = {
            name: companyName,
            color: serviceConfig?.color || '#6366F1', // Default to indigo if no color available
            icon: serviceConfig?.icon || 'building', // Default icon
            importance: 0.5, // Medium importance for company badges
            category: 'Company'
          };
          analysis.badges.push(companyBadge);
          logger.info(`Added company badge: ${companyName} (${companyBadge.color})`);
        }
      }

      // Calculate master score
      const masterScore = this.calculateMasterScore(analysis.scores, analysis.badges);

      // Calculate importance level based on master score
      let importance = 'normal';
      if (masterScore >= 0.7) importance = 'high';
      else if (masterScore <= 0.3) importance = 'low';

      const duration = Date.now() - startTime;
      logger.info(`OpenAI analysis completed in ${duration}ms`);

      // Return extended analysis with computed fields
      return {
        ...analysis,
        masterImportanceScore: masterScore,
        category: analysis.suggested_categories[0] || 'inbox',
        importance,
        isPersonallyRelevant: analysis.scores.personal > 0.5
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to analyze email before save:`, error);
      return null;
    }
  }

  /**
   * Analyze multiple emails in batch
   */
  async analyzeBatch(emails: EmailForAnalysis[], userId: string): Promise<number> {
    let successCount = 0;

    for (const email of emails) {
      const result = await this.analyzeEmail(email, userId);
      if (result) {
        successCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.info(`Batch analysis complete: ${successCount}/${emails.length} successful`);
    return successCount;
  }
}
