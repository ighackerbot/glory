import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();
router.use(authMiddleware);
router.use(adminAuth);

// GET /api/dashboard/admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { count: totalUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    const { count: activeSubscribers } = await supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { data: prizePools } = await supabaseAdmin.from('prize_pools').select('total_pool, charity_total');
    const totalPrizePool = prizePools?.reduce((s, p) => s + (p.total_pool || 0), 0) || 0;
    const totalCharity = prizePools?.reduce((s, p) => s + (p.charity_total || 0), 0) || 0;
    const { count: totalDraws } = await supabaseAdmin.from('draws').select('*', { count: 'exact', head: true });
    const { count: publishedDraws } = await supabaseAdmin.from('draws').select('*', { count: 'exact', head: true }).eq('status', 'published');
    const { count: totalWinners } = await supabaseAdmin.from('draw_results').select('*', { count: 'exact', head: true });
    const { count: pendingVerif } = await supabaseAdmin.from('winner_verifications').select('*', { count: 'exact', head: true }).eq('admin_review_status', 'pending');
    const { count: pendingPay } = await supabaseAdmin.from('winner_verifications').select('*', { count: 'exact', head: true }).eq('admin_review_status', 'approved').eq('payment_status', 'pending');

    res.json({
      users: { total: totalUsers || 0, activeSubscribers: activeSubscribers || 0 },
      financials: { totalPrizePool, totalCharityContributions: totalCharity, totalPaidOut: 0 },
      draws: { total: totalDraws || 0, published: publishedDraws || 0 },
      winners: { total: totalWinners || 0, pendingVerifications: pendingVerif || 0, pendingPayouts: pendingPay || 0 },
    });
  } catch (error) { console.error('Admin stats error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// GET /api/dashboard/admin/users
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let query = supabaseAdmin.from('users').select('id, email, name, role, charity_contribution_pct, created_at, subscriptions(plan_type, status, renewal_date)').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error } = await query;
    const { count } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    if (error) { res.status(500).json({ error: 'Failed to fetch users.' }); return; }
    res.json({ users: data || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } });
  } catch (error) { console.error('Admin users error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// PUT /api/dashboard/admin/users/:id
router.put('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, role, charityContributionPct } = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (charityContributionPct !== undefined) updateData.charity_contribution_pct = charityContributionPct;
    const { data, error } = await supabaseAdmin.from('users').update(updateData).eq('id', req.params.id).select('id, email, name, role, charity_contribution_pct').single();
    if (error) { res.status(500).json({ error: 'Failed to update user.' }); return; }
    res.json({ message: 'User updated.', user: data });
  } catch (error) { console.error('Admin update user error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// PUT /api/dashboard/admin/users/:id/subscription
router.put('/users/:id/subscription', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, planType } = req.body;
    const { data: sub } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(1).single();
    if (!sub) { res.status(404).json({ error: 'No subscription found.' }); return; }
    const updateData: any = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (planType) updateData.plan_type = planType;
    const { data, error } = await supabaseAdmin.from('subscriptions').update(updateData).eq('id', sub.id).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to update subscription.' }); return; }
    res.json({ message: 'Subscription updated.', subscription: data });
  } catch (error) { console.error('Admin update sub error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

export default router;
