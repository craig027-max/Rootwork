import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/styles.css';
import './styles/quiz.css';
import { App } from './app/App';
import { bootstrapProgress } from './core/hydrate';

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Settle the Supabase session + progress after first paint. Safe with no backend
// configured — it resolves the auth slice to 'signed-out' and free play continues.
void bootstrapProgress();
