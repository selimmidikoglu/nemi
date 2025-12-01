import * as fs from 'fs';
import * as path from 'path';

/**
 * Load a prompt template by name
 */
export const loadPrompt = (promptName: string): string => {
  try {
    const promptPath = path.join(__dirname, `${promptName}.txt`);
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error) {
    // Return inline prompt if file doesn't exist
    return getInlinePrompt(promptName);
  }
};

/**
 * Inline prompts as fallback
 */
const getInlinePrompt = (promptName: string): string => {
  const prompts: Record<string, string> = {
    summarize_email: `You are an expert email summarizer. Please provide a concise 1-2 sentence summary of the following email.

From: {{FROM}}
Subject: {{SUBJECT}}
Date: {{DATE}}

Body:
{{BODY}}

Provide only the summary, no additional commentary.`,

    classify_email: `You are an expert email classifier. Analyze the following email and classify it into one of these categories: Work, Personal, Me-related, Finance, Social, Promotions, Newsletters, or Other.

Also determine:
1. Importance level (Critical, High, Normal, Low)
2. Whether it's "Me-related" (directly about the user, requires personal action, or has personal significance)

{{CONTEXT}}

From: {{FROM}}
To: {{TO}}
CC: {{CC}}
Subject: {{SUBJECT}}

Body:
{{BODY}}

Respond with a JSON object in this format:
{
  "category": "category_name",
  "importance": "importance_level",
  "isPersonallyRelevant": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`
  };

  return prompts[promptName] || '';
};
