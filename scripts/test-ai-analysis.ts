#!/usr/bin/env ts-node

import { EmailSummarizer } from '../AI/services/emailSummarizer';
import { CategoryClassifier } from '../AI/services/categoryClassifier';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../Backend/.env') });

/**
 * Test script to analyze a sample email and see AI output
 * Usage: ts-node scripts/test-ai-analysis.ts
 */

// Sample email for testing
const sampleEmail = {
  id: 'test-001',
  from: 'john.doe@company.com',
  to: ['team@company.com', 'me@company.com'],
  subject: 'Q4 Budget Review Meeting - Action Required',
  date: new Date().toISOString(),
  body: `Hi Team,

I hope this email finds you well. I wanted to reach out regarding our upcoming Q4 budget review meeting scheduled for next Monday, November 11th at 2 PM EST.

We need to discuss the following items:

1. Review of Q3 spending vs budget
2. Proposed budget allocations for Q4
3. Cost-cutting initiatives for the sales department
4. Capital expenditure requests for new equipment

Please come prepared with:
- Your department's spending reports
- Any budget increase requests with justifications
- Ideas for cost optimization

This is a critical meeting as we need to finalize the budget by end of week. Your attendance is mandatory.

If you have any conflicts with this time, please let me know ASAP so we can reschedule.

Looking forward to seeing everyone there.

Best regards,
John Doe
VP of Finance
Company Inc.
john.doe@company.com
(555) 123-4567`
};

// Another test email - promotional
const promoEmail = {
  id: 'test-002',
  from: 'deals@amazon.com',
  to: ['customer@example.com'],
  subject: '🎉 Black Friday Early Access - Save up to 70%!',
  date: new Date().toISOString(),
  body: `BLACK FRIDAY STARTS NOW!

Get early access to our biggest deals of the year!

✨ Featured Deals:
- Electronics: Up to 50% off
- Home & Kitchen: 40% off
- Fashion: Buy 2 Get 1 Free
- Books: 30% off

⏰ Limited Time Only - 24 Hours!

Shop Now: https://amazon.com/black-friday

Free shipping on orders over $35.

Terms and conditions apply.

You're receiving this email because you signed up for Amazon deals.
Unsubscribe | Manage preferences`
};

// Personal email
const personalEmail = {
  id: 'test-003',
  from: 'mom@gmail.com',
  to: ['me@example.com'],
  subject: 'Re: Sunday dinner plans',
  date: new Date().toISOString(),
  body: `Hi sweetie,

Thanks for checking in! Yes, we're still on for Sunday dinner at 6 PM.

I'm making your favorite - lasagna! Dad is excited to see you too.

Can you pick up some garlic bread on your way? The bakery on Main Street makes the best ones.

Also, bring that photo album you mentioned last time. Grandma would love to see it.

See you Sunday!

Love,
Mom

P.S. - Don't forget to bring a sweater, it might be chilly.`
};

async function testEmailAnalysis() {
  console.log('🧪 NEMI AI Analysis Test\n');
  console.log('='.repeat(80));
  console.log(`AI Provider: ${process.env.AI_PROVIDER || 'not set'}`);
  console.log(`Model: ${process.env.AI_PROVIDER === 'deepseek' ? process.env.DEEPSEEK_MODEL :
    process.env.AI_PROVIDER === 'claude' ? process.env.CLAUDE_MODEL : process.env.OPENAI_MODEL}`);
  console.log('='.repeat(80));
  console.log();

  // Initialize services
  const summarizer = new EmailSummarizer();
  const classifier = new CategoryClassifier();

  // Test emails
  const testEmails = [
    { email: sampleEmail, type: 'Work Email' },
    { email: promoEmail, type: 'Promotional Email' },
    { email: personalEmail, type: 'Personal Email' }
  ];

  for (const { email, type } of testEmails) {
    console.log(`\n📧 Testing: ${type}`);
    console.log('-'.repeat(80));
    console.log(`From: ${email.from}`);
    console.log(`Subject: ${email.subject}`);
    console.log(`Body Length: ${email.body.length} characters`);
    console.log();

    try {
      // Test summarization
      console.log('⏳ Generating summary...');
      const summaryResult = await summarizer.summarizeEmail(email);
      console.log(`\n✅ Summary (${summaryResult.summary.length} chars):`);
      console.log(`   "${summaryResult.summary}"`);
      console.log(`   Confidence: ${(summaryResult.confidence * 100).toFixed(1)}%`);

      // Test classification
      console.log('\n⏳ Classifying email...');
      const classificationResult = await classifier.classifyEmail(email);
      console.log('\n✅ Classification:');
      console.log(`   Category: ${classificationResult.category}`);
      console.log(`   Importance: ${classificationResult.importance}`);
      console.log(`   Is Personally Relevant: ${classificationResult.isPersonallyRelevant ? 'Yes' : 'No'}`);
      console.log(`   Tags: ${classificationResult.tags.length > 0 ? classificationResult.tags.join(', ') : 'None'}`);
      console.log(`   Confidence: ${(classificationResult.confidence * 100).toFixed(1)}%`);

      if (classificationResult.reasoning) {
        console.log(`   Reasoning: ${classificationResult.reasoning}`);
      }

    } catch (error: any) {
      console.error(`\n❌ Error analyzing ${type}:`, error.message);
      if (error.response) {
        console.error('API Response:', error.response.data);
      }
    }

    console.log('\n' + '='.repeat(80));
  }

  console.log('\n\n💡 Analysis Tips:');
  console.log('   • Summary should be 1-2 sentences, under 150 chars');
  console.log('   • Category should be: Work, Personal, Finance, Social, Promotions, or Newsletters');
  console.log('   • Importance: critical, high, normal, or low');
  console.log('   • Me-related should be true if email specifically mentions or requires action from you');
  console.log('\n📝 If results are poor, consider:');
  console.log('   1. Adjusting prompts in AI/prompts/');
  console.log('   2. Changing AI provider (claude, openai, deepseek)');
  console.log('   3. Tweaking temperature/max_tokens in AI services');
  console.log('\n✨ Done!\n');
}

// Run the test
testEmailAnalysis().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
