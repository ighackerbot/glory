import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();
router.use(authMiddleware);

// GET /api/winners — admin
router.get('/', adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    let query = supabaseAdmin.from('winner_verifications').select('*, users(name, email), draw_results(match_tier, prize_amount, matched_numbers, draw_id)').order('created_at', { ascending: false });
    if (status && typeof status === 'string') query = query.eq('admin_review_status', status);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: 'Failed to fetch winners.' }); return; }
    res.json({ winners: data || [] });
  } catch (error) { console.error('Get winners error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// GET /api/winners/my
router.get('/my', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.from('winner_verifications').select('*, draw_results(match_tier, prize_amount, matched_numbers, draw_id)').eq('user_id', req.user!.id).order('created_at', { ascending: false });
    if (error) { res.status(500).json({ error: 'Failed to fetch winnings.' }); return; }
    res.json({ winnings: data || [] });
  } catch (error) { console.error('Get winnings error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// POST /api/winners/:id/verify
router.post('/:id/verify', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { proofImageUrl } = req.body;
    if (!proofImageUrl) { res.status(400).json({ error: 'Proof image URL is required.' }); return; }
    const { data: existing } = await supabaseAdmin.from('winner_verifications').select('*').eq('id', req.params.id).eq('user_id', req.user!.id).single();
    if (!existing) { res.status(404).json({ error: 'Verification record not found.' }); return; }
    const { data, error } = await supabaseAdmin.from('winner_verifications').update({ proof_image_url: proofImageUrl, proof_uploaded_at: new Date().toISOString(), admin_review_status: 'pending', updated_at: new Date().toISOString() }).eq('id', req.params.id).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to upload proof.' }); return; }
    res.json({ message: 'Proof uploaded. Awaiting admin review.', verification: data });
  } catch (error) { console.error('Upload proof error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// PUT /api/winners/:id/review — admin
router.put('/:id/review', adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) { res.status(400).json({ error: 'Status must be "approved" or "rejected".' }); return; }
    const { data, error } = await supabaseAdmin.from('winner_verifications').update({ admin_review_status: status, admin_notes: notes || null, reviewed_by: req.user!.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', req.params.id).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to review submission.' }); return; }
    res.json({ message: `Submission ${status}.`, verification: data });
  } catch (error) { console.error('Review error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// PUT /api/winners/:id/payout — admin
router.put('/:id/payout', adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: existing } = await supabaseAdmin.from('winner_verifications').select('*').eq('id', req.params.id).eq('admin_review_status', 'approved').single();
    if (!existing) { res.status(400).json({ error: 'Can only mark approved verifications as paid.' }); return; }
    const { data, error } = await supabaseAdmin.from('winner_verifications').update({ payment_status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', req.params.id).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to update payout.' }); return; }
    res.json({ message: 'Payout completed.', verification: data });
  } catch (error) { console.error('Payout error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

export default router;
