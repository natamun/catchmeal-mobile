import { useState, type ReactNode } from 'react';
import { Copy, Share2 } from 'lucide-react';

import { copyText, shareText } from '../../native/shareText';
import { SECONDARY_BUTTON_CLASS } from './buttonStyle';
import { Card } from './Card';
import { useToast } from './toastContext';

const TITLE = 'Demander à une IA';

interface AiCardProps {
  /** The text to send, built when a button is tapped. */
  text: () => string | Promise<string>;
  disabled?: boolean;
  /** Below the buttons, such as the import of the AI's answer. */
  children?: ReactNode;
}

/**
 * The card that copies or shares a text to paste into an AI chat, the same
 * wherever the app talks to an AI (stats, recipe, recipe editor).
 */
export function AiCard({ text, disabled = false, children }: AiCardProps) {
  const showToast = useToast();
  const [isBusy, setIsBusy] = useState(false);

  const run = async (
    send: (value: string) => Promise<void>,
    failure: string,
  ) => {
    setIsBusy(true);
    try {
      await send(await text());
    } catch {
      showToast(failure);
    } finally {
      setIsBusy(false);
    }
  };

  const copy = () =>
    run(async (value) => {
      await copyText(value);
      showToast('Copié, à coller dans une IA', Copy);
    }, 'Copie impossible');

  const share = () =>
    run((value) => shareText(TITLE, value), 'Partage impossible');

  return (
    <Card title={TITLE}>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void copy()}
          disabled={disabled || isBusy}
          className={SECONDARY_BUTTON_CLASS}
        >
          <Copy className="h-4 w-4" />
          Copier
        </button>
        <button
          type="button"
          onClick={() => void share()}
          disabled={disabled || isBusy}
          className={SECONDARY_BUTTON_CLASS}
        >
          <Share2 className="h-4 w-4" />
          Partager
        </button>
      </div>
      {children}
    </Card>
  );
}
