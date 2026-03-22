import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET /api/dashboard/user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: userProfile } = await supabaseAdmin.from('users').select('id, email, name, role, selected_charity_id, charity_contribution_pct, created_at').eq('id', userId).single();
    let selectedCharity = null;
    if (userProfile?.selected_charity_id) {
      const { data } = await supabaseAdmin.from('charities').select('id, name, focus').eq('id', userProfile.selected_charity_id).single();
      selectedCharity = data;
    }

    const { data: subscription } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single();
    const { data: scores } = await supabaseAdmin.from('scores').select('*').eq('user_id', userId).order('played_date', { ascending: false }).limit(5);

    const { data: drawEntries } = await supabaseAdmin.from('draw_entries').select('id, entered_at, scores, draws(id, title, draw_month, status)').eq('user_id', userId).order('entered_at', { ascending: false });

    const { data: winnings } = await supabaseAdmin.from('draw_results').select('id, match_tier, prize_amount, matched_numbers, draws(title, draw_month), winner_verifications(admin_review_status, payment_status, proof_image_url)').eq('user_id', userId).order('created_at', { ascending: false });

    const totalWon = winnings?.reduce((sum, w) => sum + (w.prize_amount || 0), 0) || 0;
    const pendingPayouts = winnings?.filter((w: any) => w.winner_verifications && Array.isArray(w.winner_verifications) && w.winner_verifications.some((v: any) => v.payment_status === 'pending' && v.admin_review_status === 'approved')).length || 0;

    res.json({
      profile: { ...userProfile, selectedCharity },
      subscription: subscription || null,
      scores: scores || [],
      drawParticipation: { totalEntered: drawEntries?.length || 0, entries: drawEntries || [] },
      winnings: { totalWon, pendingPayouts, records: winnings || [] },
    });
  } catch (error) { console.error('User dashboard error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

export default router;
