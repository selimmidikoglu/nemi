import { Router } from 'express';
import {
  getContactsAutocomplete,
  getRecentContacts,
  getFrequentContacts,
  searchContacts
} from '../controllers/contacts.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/contacts/search?q=searchTerm&limit=10&emailAccountId=xxx (Google + email history)
router.get('/search', searchContacts);

// GET /api/contacts/autocomplete?q=searchTerm&limit=10 (email history only)
router.get('/autocomplete', getContactsAutocomplete);

// GET /api/contacts/recent?limit=5
router.get('/recent', getRecentContacts);

// GET /api/contacts/frequent?limit=10
router.get('/frequent', getFrequentContacts);

export default router;
