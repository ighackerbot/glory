import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { MAX_SCORES, MIN_SCORE, MAX_SCORE } from '../utils/helpers';

const router = Router();
router.use(authMiddleware);

// GET /api/scores
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: scores, error } = await supabaseAdmin.from('scores').select('*').eq('user_id', req.user!.id).order('played_date', { ascending: false }).limit(MAX_SCORES);
    if (error) { res.status(500).json({ error: 'Failed to fetch scores.' }); return; }
    res.json({ scores: scores || [] });
  } catch (error) { console.error('Get scores error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// POST /api/scores — rolling 5-score logic
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { score, playedDate } = req.body;
    if (score === undefined || score === null) { res.status(400).json({ error: 'Score is required.' }); return; }
    const scoreNum = Number(score);
    if (isNaN(scoreNum) || scoreNum < MIN_SCORE || scoreNum > MAX_SCORE) { res.status(400).json({ error: `Score must be between ${MIN_SCORE} and ${MAX_SCORE} (Stableford format).` }); return; }
    if (!playedDate) { res.status(400).json({ error: 'Played date is required.' }); return; }

    const { data: existingScores } = await supabaseAdmin.from('scores').select('id, played_date').eq('user_id', req.user!.id).order('played_date', { ascending: false });
    if (existingScores && existingScores.length >= MAX_SCORES) {
      const oldestScore = existingScores[existingScores.length - 1];
      await supabaseAdmin.from('scores').delete().eq('id', oldestScore.id);
    }

    const { data: newScore, error } = await supabaseAdmin.from('scores').insert({ user_id: req.user!.id, score: scoreNum, played_date: playedDate }).select('*').single();
    if (error) { res.status(500).json({ error: 'Failed to add score.', details: error.message }); return; }

    const { data: updatedScores } = await supabaseAdmin.from('scores').select('*').eq('user_id', req.user!.id).order('played_date', { ascending: false }).limit(MAX_SCORES);
    res.status(201).json({ message: 'Score added successfully.', score: newScore, scores: updatedScores || [] });
  } catch (error) { console.error('Add score error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

// DELETE /api/scores/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: score } = await supabaseAdmin.from('scores').select('*').eq('id', req.params.id).eq('user_id', req.user!.id).single();
    if (!score) { res.status(404).json({ error: 'Score not found.' }); return; }
    await supabaseAdmin.from('scores').delete().eq('id', req.params.id);
    res.json({ message: 'Score deleted.' });
  } catch (error) { console.error('Delete score error:', error); res.status(500).json({ error: 'Internal server error.' }); }
});

export default router;
