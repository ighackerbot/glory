import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, charityId, charityContributionPct } = req.body;
    if (!email || !password || !name) { res.status(400).json({ error: 'Email, password, and name are required.' }); return; }
    if (password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters.' }); return; }

    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (existingUser) { res.status(409).json({ error: 'An account with this email already exists.' }); return; }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const contributionPct = charityContributionPct || 10;
    if (contributionPct < 10) { res.status(400).json({ error: 'Minimum charity contribution is 10%.' }); return; }

    const { data: user, error } = await supabaseAdmin.from('users').insert({
      email, password_hash: passwordHash, name, role: 'subscriber',
      selected_charity_id: charityId || null, charity_contribution_pct: contributionPct,
    }).select('id, email, name, role, selected_charity_id, charity_contribution_pct, created_at').single();

    if (error) { res.status(500).json({ error: 'Failed to create account.', details: error.message }); return; }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
    res.status(201).json({ message: 'Account created successfully.', token, user });
  } catch (error) { console.error('Signup error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'Email and password are required.' }); return; }

    const { data: user, error } = await supabaseAdmin.from('users').select('*').eq('email', email).single();
    if (error || !user) { res.status(401).json({ error: 'Invalid email or password.' }); return; }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) { res.status(401).json({ error: 'Invalid email or password.' }); return; }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
    res.json({
      message: 'Login successful.', token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, selected_charity_id: user.selected_charity_id, charity_contribution_pct: user.charity_contribution_pct, created_at: user.created_at },
    });
  } catch (error) { console.error('Login error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: user, error } = await supabaseAdmin.from('users').select('id, email, name, role, selected_charity_id, charity_contribution_pct, avatar_url, created_at, updated_at').eq('id', req.user!.id).single();
    if (error || !user) { res.status(404).json({ error: 'User not found.' }); return; }
    res.json({ user });
  } catch (error) { console.error('Get profile error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

export default router;
