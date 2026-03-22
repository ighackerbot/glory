import { useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

type ScoreEntry = {
  score: number;
  date: string;
};

type Charity = {
  name: string;
  focus: string;
  highlight: string;
};

type Tier = {
  label: string;
  share: number;
  rollover: string;
};

const charities: Charity[] = [
  {
    name: "First Tee Futures",
    focus: "Youth access to golf and mentorship",
    highlight: "Funding equipment grants, coaching hours, and junior event access.",
  },
  {
    name: "Fairway for Families",
    focus: "Family support during long-term treatment",
    highlight: "Supports travel, accommodation, and emergency care for families in crisis.",
  },
  {
    name: "Greens for Good",
    focus: "Community wellbeing through sport",
    highlight: "Builds local programmes that combine sport, mental health, and social care.",
  },
];

const tiers: Tier[] = [
  { label: "5-number match", share: 0.4, rollover: "Yes, jackpot rolls forward" },
  { label: "4-number match", share: 0.35, rollover: "No, split equally" },
  { label: "3-number match", share: 0.25, rollover: "No, split equally" },
];

const monthlyPrice = 24;
const yearlyPrice = 240;

const initialScores: ScoreEntry[] = [
  { score: 34, date: "2026-03-10" },
  { score: 29, date: "2026-03-04" },
  { score: 31, date: "2026-02-27" },
  { score: 27, date: "2026-02-21" },
  { score: 33, date: "2026-02-12" },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function App() {
  const [scores, setScores] = useState<ScoreEntry[]>(initialScores);
  const [draftScore, setDraftScore] = useState("32");
  const [draftDate, setDraftDate] = useState("2026-03-19");
  const [subscribers, setSubscribers] = useState(1200);
  const [monthlyMix, setMonthlyMix] = useState(68);
  const [charityShare, setCharityShare] = useState(12);

  const revenue = useMemo(() => {
    const monthlySubscribers = Math.round((subscribers * monthlyMix) / 100);
    const yearlySubscribers = subscribers - monthlySubscribers;
    const monthlyRevenue = monthlySubscribers * monthlyPrice;
    const yearlyRevenue = yearlySubscribers * (yearlyPrice / 12);
    const total = monthlyRevenue + yearlyRevenue;
    const charity = total * (charityShare / 100);
    const prizePool = total * 0.24;

    return {
      monthlySubscribers,
      yearlySubscribers,
      total,
      charity,
      prizePool,
    };
  }, [charityShare, monthlyMix, subscribers]);

  const addScore = () => {
    const score = Number(draftScore);

    if (!draftDate || Number.isNaN(score) || score < 1 || score > 45) {
      return;
    }

    const next = [{ score, date: draftDate }, ...scores]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5);

    setScores(next);
  };

  return (
    <div className="page-shell">
      <header className="hero">
        <nav className="topbar">
          <div>
            <p className="eyebrow">Golf Charity Subscription Platform</p>
            <h1 className="brand">Birdie Pool</h1>
          </div>
          <div className="topbar-actions">
            <a href="#platform">Platform</a>
            <a href="#charity">Charities</a>
            <a href="#dashboard">Dashboards</a>
            <a className="button button-ghost" href="#subscribe">
              Subscribe
            </a>
          </div>
        </nav>

        <section className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Emotion-led, not golf-cliche</p>
            <h2>
              Track your last five rounds, enter monthly prize draws, and direct every
              subscription toward a charity that matters.
            </h2>
            <p className="hero-text">
              Built around the PRD brief: subscriptions, Stableford score tracking,
              monthly draw mechanics, charity allocation, winner verification, and full
              admin control.
            </p>
            <div className="cta-row">
              <a className="button" href="#subscribe">
                Start monthly plan
              </a>
              <a className="button button-secondary" href="#score-lab">
                Try score logic
              </a>
            </div>
            <div className="stats-row">
              <div className="stat-card">
                <span>Monthly prize cadence</span>
                <strong>1 draw / month</strong>
              </div>
              <div className="stat-card">
                <span>Rolling score memory</span>
                <strong>Last 5 rounds only</strong>
              </div>
              <div className="stat-card">
                <span>Minimum charity share</span>
                <strong>10%+</strong>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="glass-card spotlight-card">
              <p className="card-label">Live monthly snapshot</p>
              <h3>{formatMoney(revenue.prizePool)}</h3>
              <p>Estimated prize pool from the current subscriber mix.</p>
              <div className="tier-stack">
                {tiers.map((tier) => (
                  <div className="tier-row" key={tier.label}>
                    <div>
                      <strong>{tier.label}</strong>
                      <span>{tier.rollover}</span>
                    </div>
                    <b>{Math.round(tier.share * 100)}%</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </header>

      <main>
        <section className="section" id="platform">
          <div className="section-heading">
            <p className="eyebrow">Core product modules</p>
            <h3>Everything the PRD calls out, surfaced as a consumer product.</h3>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <span>01</span>
              <h4>Subscription engine</h4>
              <p>Monthly and yearly plans, renewal states, restricted access, and a Stripe-ready billing layer.</p>
            </article>
            <article className="feature-card">
              <span>02</span>
              <h4>Score management</h4>
              <p>Stableford-only entry, date validation, reverse chronology, and automatic rolling replacement after five scores.</p>
            </article>
            <article className="feature-card">
              <span>03</span>
              <h4>Draw and reward system</h4>
              <p>Three match tiers, jackpot rollover, simulation mode, and admin-controlled publishing.</p>
            </article>
            <article className="feature-card">
              <span>04</span>
              <h4>Charity layer</h4>
              <p>Signup-time charity selection, flexible contribution percentage, and a searchable charity directory.</p>
            </article>
          </div>
        </section>

        <section className="section two-column" id="score-lab">
          <div className="section-heading">
            <p className="eyebrow">Interactive score demo</p>
            <h3>Rolling 5-score logic in Stableford format.</h3>
            <p>
              The PRD requires only the latest five scores, each with a date, kept in reverse chronological order.
            </p>
          </div>

          <div className="glass-card input-card">
            <div className="input-row">
              <label>
                Score
                <input
                  max="45"
                  min="1"
                  type="number"
                  value={draftScore}
                  onChange={(event) => setDraftScore(event.target.value)}
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                />
              </label>
            </div>
            <button className="button" onClick={addScore} type="button">
              Add latest score
            </button>
            <div className="score-list">
              {scores.map((entry) => (
                <div className="score-row" key={`${entry.date}-${entry.score}`}>
                  <strong>{entry.score} pts</strong>
                  <span>{entry.date}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section two-column" id="charity">
          <div className="section-heading">
            <p className="eyebrow">Charity impact</p>
            <h3>Lead with the cause, not with golf imagery.</h3>
            <p>
              The homepage brief prioritises emotional clarity: what users do, how they win, and what good their subscription creates.
            </p>
          </div>

          <div className="charity-grid">
            {charities.map((charity) => (
              <article className="glass-card charity-card" key={charity.name}>
                <p className="card-label">{charity.focus}</p>
                <h4>{charity.name}</h4>
                <p>{charity.highlight}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="dashboard">
          <div className="section-heading">
            <p className="eyebrow">User and admin views</p>
            <h3>Designed to cover all required controls without feeling like enterprise software.</h3>
          </div>

          <div className="dashboard-grid">
            <article className="glass-card dashboard-card">
              <p className="card-label">Subscriber dashboard</p>
              <ul>
                <li>Subscription status, renewal date, and plan controls</li>
                <li>Score entry and edit experience</li>
                <li>Selected charity and contribution percentage</li>
                <li>Draw participation summary and winnings overview</li>
                <li>Winner proof upload with payment status tracking</li>
              </ul>
            </article>
            <article className="glass-card dashboard-card">
              <p className="card-label">Admin dashboard</p>
              <ul>
                <li>User, subscription, and score management</li>
                <li>Draw configuration, simulation, and result publishing</li>
                <li>Charity CRUD and spotlight content control</li>
                <li>Winner verification and payout completion workflow</li>
                <li>Analytics for users, prize pools, charity totals, and draw stats</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section" id="calculator">
          <div className="section-heading">
            <p className="eyebrow">Prize and charity calculator</p>
            <h3>Live model for subscriptions, monthly revenue, and pool splits.</h3>
          </div>

          <div className="calculator-layout">
            <div className="glass-card controls-card">
              <label>
                Active subscribers
                <input
                  max="10000"
                  min="100"
                  type="range"
                  value={subscribers}
                  onChange={(event) => setSubscribers(Number(event.target.value))}
                />
                <strong>{subscribers}</strong>
              </label>
              <label>
                Monthly-plan share
                <input
                  max="100"
                  min="0"
                  type="range"
                  value={monthlyMix}
                  onChange={(event) => setMonthlyMix(Number(event.target.value))}
                />
                <strong>{monthlyMix}%</strong>
              </label>
              <label>
                Charity allocation
                <input
                  max="40"
                  min="10"
                  type="range"
                  value={charityShare}
                  onChange={(event) => setCharityShare(Number(event.target.value))}
                />
                <strong>{charityShare}%</strong>
              </label>
            </div>

            <div className="results-grid">
              <div className="glass-card result-card">
                <span>Estimated monthly revenue</span>
                <strong>{formatMoney(revenue.total)}</strong>
              </div>
              <div className="glass-card result-card">
                <span>Charity contribution</span>
                <strong>{formatMoney(revenue.charity)}</strong>
              </div>
              <div className="glass-card result-card">
                <span>Total prize pool</span>
                <strong>{formatMoney(revenue.prizePool)}</strong>
              </div>
              {tiers.map((tier) => (
                <div className="glass-card result-card" key={tier.label}>
                  <span>{tier.label}</span>
                  <strong>{formatMoney(revenue.prizePool * tier.share)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section subscribe-section" id="subscribe">
          <div className="section-heading">
            <p className="eyebrow">Subscription CTA</p>
            <h3>Prominent plans with clear value and emotional payoff.</h3>
          </div>

          <div className="pricing-grid">
            <article className="pricing-card">
              <p className="card-label">Monthly</p>
              <h4>${monthlyPrice}<span>/month</span></h4>
              <p>Best for new members who want immediate access to score entry, charity selection, and the next draw.</p>
              <a className="button" href="#top">
                Choose monthly
              </a>
            </article>
            <article className="pricing-card pricing-card-featured">
              <p className="card-label">Yearly</p>
              <h4>${yearlyPrice}<span>/year</span></h4>
              <p>Discounted annual access with uninterrupted eligibility, easier retention, and stronger recurring impact.</p>
              <a className="button button-secondary" href="#top">
                Choose yearly
              </a>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
