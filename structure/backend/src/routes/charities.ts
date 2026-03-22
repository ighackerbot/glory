import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

// GET /api/charities — public list
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, featured } = req.query;
    let query = supabaseAdmin.from('charities').select('*');
    if (search) query = query.or(`name.ilike.%${search}%,focus.ilike.%${search}%,description.ilike.%${search}%`);
    if (featured === 'true') query = query.eq('is_featured', true);
    const { data, error } = await query.order('name');
    if (error) { res.status(500).json({ error: 'Failed to fetch charities.' }); return; }
    res.json({ charities: data || [] });
  } catch (error) { console.error('Get charities error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// GET /api/charities/featured
router.get('/featured', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.from('charities').select('*').eq('is_featured', true).order('name');
    if (error) { res.status(500).json({ error: 'Failed to fetch featured charities.' }); return; }
    res.json({ charities: data || [] });
  } catch (error) { console.error('Get featured error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// GET /api/charities/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.from('charities').select('*').eq('id', req.params.id).single();
    if (error || !data) { res.status(404).json({ error: 'Charity not found.' }); return; }
    res.json({ charity: data });
  } catch (error) { console.error('Get charity error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// POST /api/charities — admin
router.post('/', authMiddleware, adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, focus, highlight, imageUrl, websiteUrl, isFeatured, upcomingEvents } = req.body;
    if (!name) { res.status(400).json({ error: 'Charity name is required.' }); return; }
    const { data, error } = await supabaseAdmin.from('charities').insert({
      name, description: description || null, focus: focus || null, highlight: highlight || null,
      image_url: imageUrl || null, website_url: websiteUrl || null, is_featured: isFeatured || false, upcoming_events: upcomingEvents || null,
    }).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to create charity.', details: error.message }); return; }
    res.status(201).json({ message: 'Charity created.', charity: data });
  } catch (error) { console.error('Create charity error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// PUT /api/charities/:id — admin
router.put('/:id', authMiddleware, adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, focus, highlight, imageUrl, websiteUrl, isFeatured, upcomingEvents } = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (focus !== undefined) updateData.focus = focus;
    if (highlight !== undefined) updateData.highlight = highlight;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (websiteUrl !== undefined) updateData.website_url = websiteUrl;
    if (isFeatured !== undefined) updateData.is_featured = isFeatured;
    if (upcomingEvents !== undefined) updateData.upcoming_events = upcomingEvents;

    const { data, error } = await supabaseAdmin.from('charities').update(updateData).eq('id', req.params.id).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to update charity.' }); return; }
    res.json({ message: 'Charity updated.', charity: data });
  } catch (error) { console.error('Update charity error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// DELETE /api/charities/:id — admin
router.delete('/:id', authMiddleware, adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await supabaseAdmin.from('charities').delete().eq('id', req.params.id);
    res.json({ message: 'Charity deleted.' });
  } catch (error) { console.error('Delete charity error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// PUT /api/charities/user/select
router.put('/user/select', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { charityId, contributionPct } = req.body;
    if (!charityId) { res.status(400).json({ error: 'Charity ID is required.' }); return; }
    const pct = contributionPct || 10;
    if (pct < 10) { res.status(400).json({ error: 'Minimum charity contribution is 10%.' }); return; }

    const { data: charity } = await supabaseAdmin.from('charities').select('id, name').eq('id', charityId).single();
    if (!charity) { res.status(404).json({ error: 'Charity not found.' }); return; }

    await supabaseAdmin.from('users').update({ selected_charity_id: charityId, charity_contribution_pct: pct, updated_at: new Date().toISOString() }).eq('id', req.user!.id);
    res.json({ message: `Charity updated to "${charity.name}" with ${pct}% contribution.` });
  } catch (error) { console.error('Select charity error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

export default router;
