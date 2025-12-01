"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPrompt = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Load a prompt template by name
 */
const loadPrompt = (promptName) => {
    try {
        const promptPath = path.join(__dirname, `${promptName}.txt`);
        return fs.readFileSync(promptPath, 'utf-8');
    }
    catch (error) {
        // Return inline prompt if file doesn't exist
        return getInlinePrompt(promptName);
    }
};
exports.loadPrompt = loadPrompt;
/**
 * Inline prompts as fallback
 */
const getInlinePrompt = (promptName) => {
    const prompts = {
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
//# sourceMappingURL=index.js.map