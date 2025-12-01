/**
 * Test script for Google People API
 * Run with: npx ts-node scripts/test-people-api.ts <email>
 * Example: npx ts-node scripts/test-people-api.ts frommars768@gmail.com
 */

import { google } from 'googleapis';
import { pool } from '../src/config/database';

async function testPeopleApi(emailToSearch: string) {
  console.log('='.repeat(60));
  console.log('Google People API Test Script');
  console.log('='.repeat(60));
  console.log(`Searching for: ${emailToSearch}\n`);

  // Get Gmail account credentials from database
  const accountResult = await pool.query(
    `SELECT id, access_token, refresh_token, email_address
     FROM email_accounts
     WHERE provider = 'gmail' AND is_active = true
     LIMIT 1`
  );

  if (accountResult.rows.length === 0) {
    console.error('❌ No active Gmail account found in database');
    process.exit(1);
  }

  const account = accountResult.rows[0];
  console.log(`Using Gmail account: ${account.email_address}\n`);

  if (!account.access_token || !account.refresh_token) {
    console.error('❌ Gmail account missing OAuth tokens');
    process.exit(1);
  }

  // Set up OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token
  });

  const people = google.people({ version: 'v1', auth: oauth2Client });

  // Test 1: Search in "other contacts"
  console.log('📋 Test 1: Searching otherContacts...');
  console.log('-'.repeat(40));
  try {
    const otherContactsResponse = await people.otherContacts.search({
      query: emailToSearch,
      readMask: 'names,emailAddresses,photos',
      pageSize: 10
    });

    const results = otherContactsResponse.data.results || [];
    console.log(`Found ${results.length} result(s) in otherContacts\n`);

    if (results.length > 0) {
      results.forEach((result: any, index: number) => {
        console.log(`Result ${index + 1}:`);
        console.log(`  Resource Name: ${result.person?.resourceName}`);
        console.log(`  Names: ${JSON.stringify(result.person?.names || [])}`);
        console.log(`  Emails: ${JSON.stringify(result.person?.emailAddresses || [])}`);
        console.log(`  Photos: ${JSON.stringify(result.person?.photos || [])}`);
        console.log('');
      });
    }
  } catch (error: any) {
    console.log(`❌ otherContacts.search failed: ${error.message}`);
    if (error.code === 403) {
      console.log('   → Permission denied. Check if contacts.other.readonly scope is granted.');
    }
    console.log('');
  }

  // Test 2: Search in personal contacts
  console.log('📋 Test 2: Searching personal contacts (people.searchContacts)...');
  console.log('-'.repeat(40));
  try {
    const contactsResponse = await people.people.searchContacts({
      query: emailToSearch,
      readMask: 'names,emailAddresses,photos',
      pageSize: 10
    });

    const contactResults = contactsResponse.data.results || [];
    console.log(`Found ${contactResults.length} result(s) in personal contacts\n`);

    if (contactResults.length > 0) {
      contactResults.forEach((result: any, index: number) => {
        console.log(`Result ${index + 1}:`);
        console.log(`  Resource Name: ${result.person?.resourceName}`);
        console.log(`  Names: ${JSON.stringify(result.person?.names || [])}`);
        console.log(`  Emails: ${JSON.stringify(result.person?.emailAddresses || [])}`);
        console.log(`  Photos: ${JSON.stringify(result.person?.photos || [])}`);
        console.log('');
      });
    }
  } catch (error: any) {
    console.log(`❌ people.searchContacts failed: ${error.message}`);
    if (error.code === 403) {
      console.log('   → Permission denied. May need contacts.readonly scope.');
    }
    console.log('');
  }

  // Test 3: List all other contacts to see what's available
  console.log('📋 Test 3: Listing first 20 otherContacts...');
  console.log('-'.repeat(40));
  try {
    const listResponse = await people.otherContacts.list({
      readMask: 'names,emailAddresses,photos',
      pageSize: 20
    });

    const contacts = listResponse.data.otherContacts || [];
    console.log(`Total otherContacts returned: ${contacts.length}\n`);

    contacts.forEach((contact: any, index: number) => {
      const email = contact.emailAddresses?.[0]?.value || 'No email';
      const name = contact.names?.[0]?.displayName || 'No name';
      const hasPhoto = contact.photos?.some((p: any) => !p.default) ? '✅' : '❌';
      console.log(`  ${index + 1}. ${email} (${name}) - Photo: ${hasPhoto}`);
    });
    console.log('');
  } catch (error: any) {
    console.log(`❌ otherContacts.list failed: ${error.message}`);
    console.log('');
  }

  // Test 4: Check current OAuth scopes
  console.log('📋 Test 4: Checking OAuth token info...');
  console.log('-'.repeat(40));
  try {
    const tokenInfo = await oauth2Client.getTokenInfo(account.access_token);
    console.log(`Scopes granted: ${tokenInfo.scopes?.join(', ') || 'Unknown'}`);
    console.log(`Email: ${tokenInfo.email}`);
    console.log(`Expiry: ${tokenInfo.expiry_date ? new Date(tokenInfo.expiry_date).toISOString() : 'Unknown'}`);
  } catch (error: any) {
    console.log(`❌ Could not get token info: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete');
  console.log('='.repeat(60));

  await pool.end();
  process.exit(0);
}

// Get email from command line args
const emailArg = process.argv[2] || 'frommars768@gmail.com';
testPeopleApi(emailArg);
