import { Client } from '@elastic/elasticsearch';
import pool from '../config/database';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const INDEX_NAME = 'nemi_emails';

// Create Elasticsearch client
const client = new Client({
  node: ELASTICSEARCH_URL,
});

// Helper to check if ES is available
let esAvailable: boolean | null = null;

// Email document interface for Elasticsearch
interface EmailDocument {
  id: string;
  user_id: string;
  email_account_id: string;
  message_id: string;
  thread_id?: string;
  subject: string;
  from_email: string;
  from_name?: string;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  body_text?: string;
  body_html?: string;
  snippet?: string;
  date: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  has_attachments: boolean;
  attachment_names: string[];
  labels: string[];
  category?: string;
  importance?: string;
  badges: string[];
  company_name?: string;
  summary?: string;
  unsubscribe_url?: string;
}

// Advanced search filters interface
export interface AdvancedSearchFilters {
  query?: string;           // General search query
  from?: string;            // From email/name
  to?: string;              // To email/name
  subject?: string;         // Subject contains
  hasWords?: string;        // Body contains these words
  doesntHave?: string;      // Body doesn't contain these words
  hasAttachment?: boolean;  // Has attachment
  dateWithin?: number;      // Within X days
  dateFrom?: string;        // From date
  dateTo?: string;          // To date
  size?: 'greater' | 'less';
  sizeValue?: number;       // Size in MB
  isRead?: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
  category?: string;
  badge?: string;
  folder?: 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'all';
}

// Initialize the Elasticsearch index with mappings
export async function initializeIndex(): Promise<void> {
  try {
    const indexExists = await client.indices.exists({ index: INDEX_NAME });

    if (!indexExists) {
      await client.indices.create({
        index: INDEX_NAME,
        settings: {
          analysis: {
            analyzer: {
              email_analyzer: {
                type: 'custom',
                tokenizer: 'uax_url_email',
                filter: ['lowercase', 'stop']
              }
            }
          }
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            user_id: { type: 'keyword' },
            email_account_id: { type: 'keyword' },
            message_id: { type: 'keyword' },
            thread_id: { type: 'keyword' },
            subject: {
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            from_email: {
              type: 'text',
              analyzer: 'email_analyzer',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            from_name: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            to_addresses: {
              type: 'text',
              analyzer: 'email_analyzer'
            },
            cc_addresses: {
              type: 'text',
              analyzer: 'email_analyzer'
            },
            bcc_addresses: {
              type: 'text',
              analyzer: 'email_analyzer'
            },
            body_text: { type: 'text' },
            body_html: { type: 'text' },
            snippet: { type: 'text' },
            date: { type: 'date' },
            is_read: { type: 'boolean' },
            is_starred: { type: 'boolean' },
            is_archived: { type: 'boolean' },
            is_deleted: { type: 'boolean' },
            has_attachments: { type: 'boolean' },
            attachment_names: { type: 'text' },
            labels: { type: 'keyword' },
            category: { type: 'keyword' },
            importance: { type: 'keyword' },
            badges: { type: 'keyword' },
            company_name: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            summary: { type: 'text' },
            unsubscribe_url: { type: 'keyword' }
          }
        }
      });
      console.log('Elasticsearch index created successfully');
    }
  } catch (error) {
    console.error('Failed to initialize Elasticsearch index:', error);
    throw error;
  }
}

// Index a single email
export async function indexEmail(email: EmailDocument): Promise<void> {
  try {
    await client.index({
      index: INDEX_NAME,
      id: email.id.toString(),
      document: email,
      refresh: true
    });
  } catch (error) {
    console.error('Failed to index email:', error);
    throw error;
  }
}

// Index multiple emails in bulk
export async function bulkIndexEmails(emails: EmailDocument[]): Promise<void> {
  if (emails.length === 0) return;

  try {
    const operations = emails.flatMap(email => [
      { index: { _index: INDEX_NAME, _id: email.id.toString() } },
      email
    ]);

    const result = await client.bulk({ operations, refresh: true });

    if (result.errors) {
      const erroredItems = result.items.filter((item: any) => item.index?.error);
      console.error('Bulk indexing errors:', erroredItems);
    }
  } catch (error) {
    console.error('Failed to bulk index emails:', error);
    throw error;
  }
}

// Delete email from index
export async function deleteEmailFromIndex(emailId: string | number): Promise<void> {
  try {
    await client.delete({
      index: INDEX_NAME,
      id: emailId.toString(),
      refresh: true
    });
  } catch (error: any) {
    if (error.meta?.statusCode !== 404) {
      console.error('Failed to delete email from index:', error);
      throw error;
    }
  }
}

// Advanced search with Gmail-like filters
export async function advancedSearch(
  userId: string | number,
  filters: AdvancedSearchFilters,
  page: number = 1,
  limit: number = 50
): Promise<{ emailIds: string[]; total: number }> {
  try {
    const must: any[] = [
      { term: { user_id: String(userId) } }
    ];
    const mustNot: any[] = [];
    const should: any[] = [];
    const filter: any[] = [];

    // General query - search across multiple fields
    if (filters.query) {
      must.push({
        multi_match: {
          query: filters.query,
          fields: ['subject^3', 'from_name^2', 'from_email^2', 'body_text', 'snippet', 'company_name'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // From filter - use keyword for exact email match, or text search for partial/name match
    if (filters.from) {
      // Check if it looks like a full email address
      const isFullEmail = filters.from.includes('@') && filters.from.includes('.');

      if (isFullEmail) {
        // Use term query on keyword field for exact match
        must.push({
          bool: {
            should: [
              { term: { 'from_email.keyword': filters.from } },
              { match_phrase: { from_email: filters.from } }
            ],
            minimum_should_match: 1
          }
        });
      } else {
        // Use match for partial searches (name or partial email)
        must.push({
          bool: {
            should: [
              { match: { from_email: filters.from } },
              { match: { from_name: filters.from } }
            ],
            minimum_should_match: 1
          }
        });
      }
    }

    // To filter
    if (filters.to) {
      must.push({
        multi_match: {
          query: filters.to,
          fields: ['to_addresses', 'cc_addresses', 'bcc_addresses']
        }
      });
    }

    // Subject filter
    if (filters.subject) {
      must.push({
        match: {
          subject: {
            query: filters.subject,
            operator: 'and'
          }
        }
      });
    }

    // Has words (body contains)
    if (filters.hasWords) {
      must.push({
        multi_match: {
          query: filters.hasWords,
          fields: ['body_text', 'body_html'],
          operator: 'and'
        }
      });
    }

    // Doesn't have (body excludes)
    if (filters.doesntHave) {
      mustNot.push({
        multi_match: {
          query: filters.doesntHave,
          fields: ['body_text', 'body_html', 'subject']
        }
      });
    }

    // Has attachment
    if (filters.hasAttachment !== undefined) {
      filter.push({ term: { has_attachments: filters.hasAttachment } });
    }

    // Date range
    const dateRange: any = {};
    if (filters.dateWithin) {
      dateRange.gte = `now-${filters.dateWithin}d/d`;
    }
    if (filters.dateFrom) {
      dateRange.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      dateRange.lte = filters.dateTo;
    }
    if (Object.keys(dateRange).length > 0) {
      filter.push({ range: { date: dateRange } });
    }

    // Read status
    if (filters.isRead !== undefined) {
      filter.push({ term: { is_read: filters.isRead } });
    }

    // Starred status
    if (filters.isStarred !== undefined) {
      filter.push({ term: { is_starred: filters.isStarred } });
    }

    // Archived status (default to not archived unless specifically requested)
    if (filters.isArchived !== undefined) {
      filter.push({ term: { is_archived: filters.isArchived } });
    } else if (filters.folder !== 'all') {
      filter.push({ term: { is_archived: false } });
    }

    // Not deleted (unless viewing trash)
    if (filters.folder !== 'trash') {
      filter.push({ term: { is_deleted: false } });
    } else {
      filter.push({ term: { is_deleted: true } });
    }

    // Category filter
    if (filters.category) {
      filter.push({ term: { category: filters.category } });
    }

    // Badge filter
    if (filters.badge) {
      filter.push({ term: { badges: filters.badge } });
    }

    const query: any = {
      bool: {
        must,
        must_not: mustNot,
        filter
      }
    };

    if (should.length > 0) {
      query.bool.should = should;
      query.bool.minimum_should_match = 1;
    }

    const fromOffset = (page - 1) * limit;

    const result = await client.search({
      index: INDEX_NAME,
      query,
      from: fromOffset,
      size: limit,
      sort: [{ date: { order: 'desc' as const } }],
      _source: ['id']
    });

    const hits = result.hits.hits;
    const emailIds = hits.map((hit: any) => hit._source.id as string);
    const total = typeof result.hits.total === 'number'
      ? result.hits.total
      : result.hits.total?.value || 0;

    return { emailIds, total };
  } catch (error) {
    console.error('Advanced search failed:', error);
    throw error;
  }
}

// Sync all emails from PostgreSQL to Elasticsearch
export async function syncAllEmailsToElasticsearch(userId?: string | number): Promise<{ indexed: number }> {
  try {
    let query = `
      SELECT
        e.id, e.user_id, e.email_account_id, e.message_id, e.thread_id,
        e.subject, e.from_email, e.from_name,
        e.to_addresses, e.cc_addresses, e.bcc_addresses,
        e.body_text, e.body_html, e.snippet, e.date,
        e.is_read, e.is_starred, e.is_archived, e.is_deleted,
        e.has_attachments, e.category, e.importance,
        e.company_name, e.summary, e.unsubscribe_url,
        COALESCE(
          (SELECT array_agg(name) FROM email_attachments WHERE email_id = e.id),
          ARRAY[]::text[]
        ) as attachment_names,
        COALESCE(
          (SELECT array_agg(label_name) FROM email_labels WHERE email_id = e.id),
          ARRAY[]::text[]
        ) as labels,
        COALESCE(
          (SELECT array_agg(badge_name) FROM email_badges WHERE email_id = e.id),
          ARRAY[]::text[]
        ) as badges
      FROM emails e
    `;

    const params: any[] = [];
    if (userId) {
      query += ` WHERE e.user_id = $1`;
      params.push(userId);
    }

    query += ` ORDER BY e.id`;

    const result = await pool.query(query, params);

    const emails: EmailDocument[] = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      email_account_id: row.email_account_id,
      message_id: row.message_id,
      thread_id: row.thread_id,
      subject: row.subject || '',
      from_email: row.from_email || '',
      from_name: row.from_name,
      to_addresses: Array.isArray(row.to_addresses)
        ? row.to_addresses.map((addr: any) => typeof addr === 'object' ? addr.email : addr)
        : [],
      cc_addresses: Array.isArray(row.cc_addresses)
        ? row.cc_addresses.map((addr: any) => typeof addr === 'object' ? addr.email : addr)
        : [],
      bcc_addresses: Array.isArray(row.bcc_addresses)
        ? row.bcc_addresses.map((addr: any) => typeof addr === 'object' ? addr.email : addr)
        : [],
      body_text: row.body_text,
      body_html: row.body_html,
      snippet: row.snippet,
      date: row.date,
      is_read: row.is_read,
      is_starred: row.is_starred,
      is_archived: row.is_archived || false,
      is_deleted: row.is_deleted || false,
      has_attachments: row.has_attachments || false,
      attachment_names: row.attachment_names || [],
      labels: row.labels || [],
      category: row.category,
      importance: row.importance,
      badges: row.badges || [],
      company_name: row.company_name,
      summary: row.summary,
      unsubscribe_url: row.unsubscribe_url
    }));

    // Bulk index in batches of 500
    const batchSize = 500;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      await bulkIndexEmails(batch);
      console.log(`Indexed ${Math.min(i + batchSize, emails.length)} / ${emails.length} emails`);
    }

    return { indexed: emails.length };
  } catch (error) {
    console.error('Failed to sync emails to Elasticsearch:', error);
    throw error;
  }
}

// Update email in index (for read/star/archive changes)
export async function updateEmailInIndex(emailId: string | number, updates: Partial<EmailDocument>): Promise<void> {
  try {
    await client.update({
      index: INDEX_NAME,
      id: String(emailId),
      doc: updates,
      refresh: true
    });
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      console.warn(`Email ${emailId} not found in index, skipping update`);
    } else {
      console.error('Failed to update email in index:', error);
      throw error;
    }
  }
}

// Check if Elasticsearch is available
export async function isElasticsearchAvailable(): Promise<boolean> {
  try {
    const health = await client.cluster.health();
    return health.status === 'green' || health.status === 'yellow';
  } catch {
    return false;
  }
}

// Get search suggestions (autocomplete)
export async function getSearchSuggestions(
  userId: string | number,
  prefix: string,
  field: 'from_email' | 'from_name' | 'subject' | 'company_name'
): Promise<string[]> {
  try {
    const result = await client.search({
      index: INDEX_NAME,
      query: {
        bool: {
          must: [
            { term: { user_id: String(userId) } },
            { prefix: { [`${field}.keyword`]: prefix.toLowerCase() } }
          ]
        }
      },
      size: 0,
      aggs: {
        suggestions: {
          terms: {
            field: `${field}.keyword`,
            size: 10
          }
        }
      }
    });

    const buckets = (result.aggregations?.suggestions as any)?.buckets || [];
    return buckets.map((bucket: any) => bucket.key);
  } catch (error) {
    console.error('Failed to get search suggestions:', error);
    return [];
  }
}

export { client };
