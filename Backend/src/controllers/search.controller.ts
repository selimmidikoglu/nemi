import { Request, Response } from 'express';
import pool from '../config/database';
import * as elasticsearchService from '../services/elasticsearch.service';

// Advanced search endpoint
export async function advancedSearch(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const {
      q,           // General query
      from,        // From email/name
      to,          // To email/name
      subject,     // Subject contains
      hasWords,    // Body contains
      doesntHave,  // Body excludes
      hasAttachment,
      dateWithin,
      dateFrom,
      dateTo,
      isRead,
      isStarred,
      category,
      badge,
      folder,
      page = 1,
      limit = 50
    } = req.query;

    // Check if Elasticsearch is available
    const esAvailable = await elasticsearchService.isElasticsearchAvailable();

    if (!esAvailable) {
      // Fallback to PostgreSQL full-text search
      return fallbackSearch(req, res, userId);
    }

    const filters: elasticsearchService.AdvancedSearchFilters = {
      query: q as string,
      from: from as string,
      to: to as string,
      subject: subject as string,
      hasWords: hasWords as string,
      doesntHave: doesntHave as string,
      hasAttachment: hasAttachment === 'true' ? true : hasAttachment === 'false' ? false : undefined,
      dateWithin: dateWithin ? parseInt(dateWithin as string) : undefined,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      isStarred: isStarred === 'true' ? true : isStarred === 'false' ? false : undefined,
      category: category as string,
      badge: badge as string,
      folder: folder as any
    };

    const { emailIds, total } = await elasticsearchService.advancedSearch(
      userId,
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );

    if (emailIds.length === 0) {
      return res.json({
        emails: [],
        total: 0,
        page: parseInt(page as string),
        totalPages: 0,
        badgeStats: []
      });
    }

    // Fetch full email data from PostgreSQL
    const emailsQuery = `
      SELECT
        e.*,
        COALESCE(
          (SELECT json_agg(json_build_object('name', filename, 'size', size, 'contentType', mime_type))
           FROM email_attachments WHERE email_id = e.id),
          '[]'::json
        ) as attachments,
        COALESCE(
          (SELECT array_agg(label) FROM email_labels WHERE email_id = e.id),
          ARRAY[]::text[]
        ) as labels,
        COALESCE(
          (SELECT json_agg(json_build_object('name', badge_name, 'color', badge_color, 'icon', badge_icon, 'category', category))
           FROM email_badges WHERE email_id = e.id),
          '[]'::json
        ) as badges
      FROM emails e
      WHERE e.id = ANY($1::uuid[])
      ORDER BY array_position($1::uuid[], e.id)
    `;

    const emailsResult = await pool.query(emailsQuery, [emailIds]);

    // Get badge stats for the search results (all matching emails, not just current page)
    // We need to get ALL matching email IDs first for accurate badge counts
    const allEmailIds = await elasticsearchService.advancedSearch(
      userId,
      filters,
      1,
      10000 // Get all matching IDs
    );

    const badgeStatsQuery = `
      SELECT
        eb.badge_name as name,
        eb.badge_color as color,
        eb.badge_icon as icon,
        eb.category,
        COUNT(DISTINCT eb.email_id) as count
      FROM email_badges eb
      WHERE eb.email_id = ANY($1::uuid[])
      GROUP BY eb.badge_name, eb.badge_color, eb.badge_icon, eb.category
      ORDER BY count DESC
    `;

    const badgeStatsResult = await pool.query(badgeStatsQuery, [allEmailIds.emailIds]);
    const badgeStats = badgeStatsResult.rows.map(row => ({
      name: row.name,
      color: row.color,
      icon: row.icon,
      category: row.category,
      count: parseInt(row.count)
    }));

    res.json({
      emails: emailsResult.rows,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
      badgeStats
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}

// Fallback to PostgreSQL when Elasticsearch is unavailable
async function fallbackSearch(req: Request, res: Response, userId: string) {
  const {
    q,
    from,
    to,
    subject,
    hasWords,
    hasAttachment,
    dateWithin,
    dateFrom,
    dateTo,
    isRead,
    isStarred,
    page = 1,
    limit = 50
  } = req.query;

  const conditions: string[] = ['e.user_id = $1', 'e.is_deleted = false'];
  const params: any[] = [userId];
  let paramIndex = 2;

  // General query - search across multiple fields
  if (q) {
    conditions.push(`(
      e.subject ILIKE $${paramIndex} OR
      e.from_email ILIKE $${paramIndex} OR
      e.from_name ILIKE $${paramIndex} OR
      e.body_text ILIKE $${paramIndex} OR
      e.snippet ILIKE $${paramIndex}
    )`);
    params.push(`%${q}%`);
    paramIndex++;
  }

  // From filter
  if (from) {
    conditions.push(`(e.from_email ILIKE $${paramIndex} OR e.from_name ILIKE $${paramIndex})`);
    params.push(`%${from}%`);
    paramIndex++;
  }

  // To filter
  if (to) {
    conditions.push(`e.to_addresses::text ILIKE $${paramIndex}`);
    params.push(`%${to}%`);
    paramIndex++;
  }

  // Subject filter
  if (subject) {
    conditions.push(`e.subject ILIKE $${paramIndex}`);
    params.push(`%${subject}%`);
    paramIndex++;
  }

  // Has words (body contains)
  if (hasWords) {
    conditions.push(`(e.body_text ILIKE $${paramIndex} OR e.body_html ILIKE $${paramIndex})`);
    params.push(`%${hasWords}%`);
    paramIndex++;
  }

  // Has attachment
  if (hasAttachment === 'true') {
    conditions.push(`e.has_attachments = true`);
  } else if (hasAttachment === 'false') {
    conditions.push(`e.has_attachments = false`);
  }

  // Date filters
  if (dateWithin) {
    conditions.push(`e.date >= NOW() - INTERVAL '${parseInt(dateWithin as string)} days'`);
  }
  if (dateFrom) {
    conditions.push(`e.date >= $${paramIndex}`);
    params.push(dateFrom);
    paramIndex++;
  }
  if (dateTo) {
    conditions.push(`e.date <= $${paramIndex}`);
    params.push(dateTo);
    paramIndex++;
  }

  // Read status
  if (isRead === 'true') {
    conditions.push(`e.is_read = true`);
  } else if (isRead === 'false') {
    conditions.push(`e.is_read = false`);
  }

  // Starred status
  if (isStarred === 'true') {
    conditions.push(`e.is_starred = true`);
  }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  // Count query
  const countQuery = `SELECT COUNT(*) FROM emails e WHERE ${conditions.join(' AND ')}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Fetch emails
  const emailsQuery = `
    SELECT
      e.*,
      COALESCE(
        (SELECT json_agg(json_build_object('name', filename, 'size', size, 'contentType', mime_type))
         FROM email_attachments WHERE email_id = e.id),
        '[]'::json
      ) as attachments,
      COALESCE(
        (SELECT array_agg(label) FROM email_labels WHERE email_id = e.id),
        ARRAY[]::text[]
      ) as labels,
      COALESCE(
        (SELECT json_agg(json_build_object('name', badge_name, 'color', badge_color, 'icon', badge_icon, 'category', category))
         FROM email_badges WHERE email_id = e.id),
        '[]'::json
      ) as badges
    FROM emails e
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.date DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(parseInt(limit as string), offset);
  const emailsResult = await pool.query(emailsQuery, params);

  // Get badge stats for all matching emails in fallback mode
  const badgeConditions = [...conditions]; // Copy the conditions without limit/offset
  const badgeStatsQuery = `
    SELECT
      eb.badge_name as name,
      eb.badge_color as color,
      eb.badge_icon as icon,
      eb.category,
      COUNT(DISTINCT eb.email_id) as count
    FROM email_badges eb
    JOIN emails e ON eb.email_id = e.id
    WHERE ${badgeConditions.join(' AND ')}
    GROUP BY eb.badge_name, eb.badge_color, eb.badge_icon, eb.category
    ORDER BY count DESC
  `;

  // Use params without limit/offset (original params minus the last two)
  const badgeParams = params.slice(0, -2);
  const badgeStatsResult = await pool.query(badgeStatsQuery, badgeParams);
  const badgeStats = badgeStatsResult.rows.map(row => ({
    name: row.name,
    color: row.color,
    icon: row.icon,
    category: row.category,
    count: parseInt(row.count)
  }));

  res.json({
    emails: emailsResult.rows,
    total,
    page: parseInt(page as string),
    totalPages: Math.ceil(total / parseInt(limit as string)),
    badgeStats,
    fallback: true  // Indicate we used PostgreSQL fallback
  });
}

// Sync emails to Elasticsearch
export async function syncToElasticsearch(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;

    // Initialize index if needed
    await elasticsearchService.initializeIndex();

    // Sync emails
    const result = await elasticsearchService.syncAllEmailsToElasticsearch(userId);

    res.json({
      success: true,
      message: `Indexed ${result.indexed} emails to Elasticsearch`
    });
  } catch (error) {
    console.error('Sync to Elasticsearch error:', error);
    res.status(500).json({ error: 'Failed to sync emails to search index' });
  }
}

// Get search suggestions
export async function getSearchSuggestions(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { prefix, field = 'from_email' } = req.query;

    if (!prefix || typeof prefix !== 'string' || prefix.length < 2) {
      res.json({ suggestions: [] });
      return;
    }

    const validFields = ['from_email', 'from_name', 'subject', 'company_name'];
    const searchField = validFields.includes(field as string) ? field as any : 'from_email';

    const suggestions = await elasticsearchService.getSearchSuggestions(
      userId,
      prefix,
      searchField
    );

    res.json({ suggestions });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.json({ suggestions: [] });
  }
}

// Check Elasticsearch status
export async function getElasticsearchStatus(req: Request, res: Response) {
  try {
    const available = await elasticsearchService.isElasticsearchAvailable();
    res.json({ available, message: available ? 'Elasticsearch is healthy' : 'Elasticsearch is unavailable' });
  } catch (error) {
    res.json({ available: false, message: 'Failed to check Elasticsearch status' });
  }
}
