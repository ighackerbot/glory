import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { generateDrawNumbers, countMatches, TIER_SHARES, MONTHLY_PRICE, PRIZE_POOL_PERCENTAGE } from '../utils/helpers';

const router = Router();
router.use(authMiddleware);

// GET /api/draws
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.from('draws').select('*').order('created_at', { ascending: false });
    if (error) { res.status(500).json({ error: 'Failed to fetch draws.' }); return; }
    res.json({ draws: data || [] });
  } catch (error) { console.error('Get draws error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// GET /api/draws/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: draw, error } = await supabaseAdmin.from('draws').select('*').eq('id', req.params.id).single();
    if (error || !draw) { res.status(404).json({ error: 'Draw not found.' }); return; }
    const { count } = await supabaseAdmin.from('draw_entries').select('*', { count: 'exact', head: true }).eq('draw_id', req.params.id);
    let results: any[] = [];
    if (draw.status === 'published' || draw.status === 'executed') {
      const { data } = await supabaseAdmin.from('draw_results').select('*, users(name, email)').eq('draw_id', req.params.id);
      results = data || [];
    }
    res.json({ draw, entryCount: count, results });
  } catch (error) { console.error('Get draw error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// POST /api/draws — admin
router.post('/', adminAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, drawMonth, drawType } = _req.body;
    if (!title || !drawMonth) { res.status(400).json({ error: 'Title and draw month are required.' }); return; }
    const type = drawType || 'random';

    const { count: subscriberCount } = await supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const totalSubs = subscriberCount || 0;
    const estimatedRevenue = totalSubs * MONTHLY_PRICE;
    const prizePool = estimatedRevenue * PRIZE_POOL_PERCENTAGE;

    const { data: prevDraw } = await supabaseAdmin.from('draws').select('jackpot_rollover').eq('status', 'published').order('created_at', { ascending: false }).limit(1).single();
    const rollover = prevDraw?.jackpot_rollover || 0;
    const totalPool = prizePool + rollover;

    const { data: draw, error } = await supabaseAdmin.from('draws').insert({ title, draw_month: drawMonth, draw_type: type, total_prize_pool: totalPool, jackpot_rollover: rollover }).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to create draw.', details: error.message }); return; }

    await supabaseAdmin.from('prize_pools').insert({
      draw_id: draw.id, pool_month: drawMonth, total_revenue: estimatedRevenue, total_pool: totalPool,
      charity_total: estimatedRevenue * 0.10, five_match_pool: totalPool * TIER_SHARES['5-match'],
      four_match_pool: totalPool * TIER_SHARES['4-match'], three_match_pool: totalPool * TIER_SHARES['3-match'], active_subscribers: totalSubs,
    });
    res.status(201).json({ message: 'Draw created.', draw });
  } catch (error) { console.error('Create draw error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// POST /api/draws/:id/enter
router.post('/:id/enter', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: draw } = await supabaseAdmin.from('draws').select('*').eq('id', req.params.id).eq('status', 'pending').single();
    if (!draw) { res.status(404).json({ error: 'Draw not found or not accepting entries.' }); return; }
    const { data: sub } = await supabaseAdmin.from('subscriptions').select('id').eq('user_id', req.user!.id).eq('status', 'active').single();
    if (!sub) { res.status(403).json({ error: 'Active subscription required to enter draws.' }); return; }
    const { data: scores } = await supabaseAdmin.from('scores').select('score').eq('user_id', req.user!.id).order('played_date', { ascending: false }).limit(5);
    if (!scores || scores.length === 0) { res.status(400).json({ error: 'You need at least one score to enter.' }); return; }

    const { data: entry, error } = await supabaseAdmin.from('draw_entries').insert({ draw_id: req.params.id, user_id: req.user!.id, scores: scores.map(s => s.score) }).select('*').single();
    if (error) {
      if (error.code === '23505') { res.status(409).json({ error: 'You have already entered this draw.' }); return; }
      res.status(500).json({ error: 'Failed to enter draw.', details: error.message }); return;
    }
    res.status(201).json({ message: 'Draw entry submitted.', entry });
  } catch (error) { console.error('Enter draw error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// POST /api/draws/:id/execute — admin
router.post('/:id/execute', adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: draw } = await supabaseAdmin.from('draws').select('*').eq('id', req.params.id).single();
    if (!draw) { res.status(404).json({ error: 'Draw not found.' }); return; }
    if (draw.status !== 'pending' && draw.status !== 'simulated') { res.status(400).json({ error: 'Draw already executed.' }); return; }

    const { data: entries } = await supabaseAdmin.from('draw_entries').select('*').eq('draw_id', req.params.id);
    if (!entries || entries.length === 0) { res.status(400).json({ error: 'No entries.' }); return; }

    let winningNumbers: number[];
    if (draw.draw_type === 'algorithmic') {
      const freq: Record<number, number> = {};
      entries.forEach(e => (e.scores as number[]).forEach(s => { freq[s] = (freq[s] || 0) + 1; }));
      winningNumbers = Object.entries(freq).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5).map(([n]) => Number(n)).sort((a, b) => a - b);
      while (winningNumbers.length < 5) { const r = Math.floor(Math.random() * 45) + 1; if (!winningNumbers.includes(r)) winningNumbers.push(r); }
    } else { winningNumbers = generateDrawNumbers(5, 45); }

    const tierWinners: Record<string, any[]> = { '5-match': [], '4-match': [], '3-match': [] };
    for (const entry of entries) { const m = countMatches(entry.scores as number[], winningNumbers); if (m >= 3) tierWinners[`${m}-match`]?.push(entry); }

    const totalPool = draw.total_prize_pool || 0;
    let jackpotRollover = 0;
    const results: any[] = [];

    for (const [tier, winners] of Object.entries(tierWinners)) {
      const tierPool = totalPool * TIER_SHARES[tier as keyof typeof TIER_SHARES];
      if (winners.length === 0) { if (tier === '5-match') jackpotRollover = tierPool; continue; }
      const prizePerWinner = tierPool / winners.length;
      for (const w of winners) {
        const matched = (w.scores as number[]).filter((s: number) => winningNumbers.includes(s));
        const { data: result } = await supabaseAdmin.from('draw_results').insert({ draw_id: req.params.id, user_id: w.user_id, entry_id: w.id, match_tier: tier, matched_numbers: matched, prize_amount: prizePerWinner }).select('*').single();
        if (result) { results.push(result); await supabaseAdmin.from('winner_verifications').insert({ draw_result_id: result.id, user_id: w.user_id }); }
      }
    }

    await supabaseAdmin.from('draws').update({ status: 'executed', jackpot_rollover: jackpotRollover, executed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ message: 'Draw executed.', winningNumbers, totalEntries: entries.length, results, jackpotRollover });
  } catch (error) { console.error('Execute draw error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// POST /api/draws/:id/simulate — admin
router.post('/:id/simulate', adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: draw } = await supabaseAdmin.from('draws').select('*').eq('id', req.params.id).eq('status', 'pending').single();
    if (!draw) { res.status(404).json({ error: 'Draw not found or not pending.' }); return; }
    const { data: entries } = await supabaseAdmin.from('draw_entries').select('*').eq('draw_id', req.params.id);
    if (!entries || entries.length === 0) { res.status(400).json({ error: 'No entries.' }); return; }

    const winningNumbers = generateDrawNumbers(5, 45);
    const simulation: Record<string, number> = { '5-match': 0, '4-match': 0, '3-match': 0 };
    for (const e of entries) { const m = countMatches(e.scores as number[], winningNumbers); if (m >= 3) simulation[`${m}-match`]++; }
    await supabaseAdmin.from('draws').update({ status: 'simulated', updated_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ message: 'Simulation complete.', winningNumbers, totalEntries: entries.length, simulation });
  } catch (error) { console.error('Simulate error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// PUT /api/draws/:id/publish — admin
router.put('/:id/publish', adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: draw } = await supabaseAdmin.from('draws').select('*').eq('id', req.params.id).eq('status', 'executed').single();
    if (!draw) { res.status(404).json({ error: 'Draw not found or not executed.' }); return; }
    await supabaseAdmin.from('draws').update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ message: 'Draw results published.' });
  } catch (error) { console.error('Publish error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

export default router;
