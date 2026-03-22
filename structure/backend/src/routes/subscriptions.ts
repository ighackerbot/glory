import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { MONTHLY_PRICE, YEARLY_PRICE } from '../utils/helpers';

const router = Router();
router.use(authMiddleware);

// GET /api/subscriptions
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: subscription } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', req.user!.id).order('created_at', { ascending: false }).limit(1).single();
    if (!subscription) { res.json({ subscription: null, message: 'No active subscription found.' }); return; }
    if (subscription.status === 'active' && new Date(subscription.renewal_date) < new Date()) {
      await supabaseAdmin.from('subscriptions').update({ status: 'lapsed', updated_at: new Date().toISOString() }).eq('id', subscription.id);
      subscription.status = 'lapsed';
    }
    res.json({ subscription });
  } catch (error) { console.error('Get subscription error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// POST /api/subscriptions
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planType } = req.body;
    if (!planType || !['monthly', 'yearly'].includes(planType)) { res.status(400).json({ error: 'Plan type must be "monthly" or "yearly".' }); return; }
    const { data: existing } = await supabaseAdmin.from('subscriptions').select('id').eq('user_id', req.user!.id).eq('status', 'active').single();
    if (existing) { res.status(409).json({ error: 'You already have an active subscription.' }); return; }

    const price = planType === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE;
    const renewalDate = new Date();
    if (planType === 'monthly') renewalDate.setMonth(renewalDate.getMonth() + 1);
    else renewalDate.setFullYear(renewalDate.getFullYear() + 1);

    const { data: subscription, error } = await supabaseAdmin.from('subscriptions').insert({
      user_id: req.user!.id, plan_type: planType, status: 'active', price, renewal_date: renewalDate.toISOString(),
    }).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to create subscription.', details: error.message }); return; }
    res.status(201).json({ message: `${planType} subscription created successfully.`, subscription });
  } catch (error) { console.error('Create subscription error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// PUT /api/subscriptions/cancel
router.put('/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: subscription } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', req.user!.id).eq('status', 'active').single();
    if (!subscription) { res.status(404).json({ error: 'No active subscription to cancel.' }); return; }
    const { data: updated, error } = await supabaseAdmin.from('subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', subscription.id).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to cancel subscription.' }); return; }
    res.json({ message: 'Subscription cancelled.', subscription: updated });
  } catch (error) { console.error('Cancel subscription error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// PUT /api/subscriptions/renew
router.put('/renew', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planType } = req.body;
    const type = planType || 'monthly';
    const { data: subscription } = await supabaseAdmin.from('subscriptions').select('*').eq('user_id', req.user!.id).in('status', ['lapsed', 'cancelled', 'expired']).order('created_at', { ascending: false }).limit(1).single();
    if (!subscription) { res.status(404).json({ error: 'No lapsed or cancelled subscription found.' }); return; }

    const price = type === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE;
    const renewalDate = new Date();
    if (type === 'monthly') renewalDate.setMonth(renewalDate.getMonth() + 1);
    else renewalDate.setFullYear(renewalDate.getFullYear() + 1);

    const { data: updated, error } = await supabaseAdmin.from('subscriptions').update({ status: 'active', plan_type: type, price, renewal_date: renewalDate.toISOString(), cancelled_at: null, updated_at: new Date().toISOString() }).eq('id', subscription.id).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to renew subscription.' }); return; }
    res.json({ message: 'Subscription renewed successfully.', subscription: updated });
  } catch (error) { console.error('Renew subscription error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

export default router;
