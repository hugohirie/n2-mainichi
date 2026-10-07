import { createRoot } from 'react-dom/client';
import App from './ui/App';
import './ui/styles.css';

// Sem StrictMode: em dev ele roda os efeitos duas vezes e duplicaria chamadas pagas à API.
void navigator.storage?.persist?.();
createRoot(document.getElementById('root')!).render(<App />);
