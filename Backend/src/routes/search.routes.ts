import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as searchController from '../controllers/search.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Advanced search
router.get('/', searchController.advancedSearch);

// Search suggestions (autocomplete)
router.get('/suggestions', searchController.getSearchSuggestions);

// Sync emails to Elasticsearch
router.post('/sync', searchController.syncToElasticsearch);

// Check Elasticsearch status
router.get('/status', searchController.getElasticsearchStatus);

export default router;
