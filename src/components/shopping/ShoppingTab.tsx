import { useRef, useState } from 'react';
import { CheckCheck, Plus, Share2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useList } from '../../hooks/useList';
import { shareText } from '../../native/shareText';
import { PATHS } from '../../routing/paths';
import { failureMessage } from '../../utils/failureMessage';
import type { FoodItem } from '../food/types';
import { AddCircleButton } from '../ui/AddCircleButton';
import {
  COMPACT_BUTTON_CLASS,
  COMPACT_DANGER_BUTTON_CLASS,
} from '../ui/buttonStyle';
import { Card, CardEmpty, CardLoading } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FieldIconButton } from '../ui/FieldIconButton';
import { Input } from '../ui/Input';
import { LoadError } from '../ui/LoadError';
import {
  addLabelToShopping,
  clearShopping,
  listShopping,
  removeCheckedShopping,
  removeShoppingItems,
  setShoppingChecked,
} from './api';
import { shoppingText, toLines, type ShoppingLine } from './lines';
import { ShoppingChecklist } from './ShoppingChecklist';

interface ShoppingTabProps {
  foodItems: FoodItem[];
}

/**
 * The shopping list: what to buy from the library ("+"), free texts typed at
 * the bottom, lines ticked off in the shop, and the list sent as a text.
 */
export function ShoppingTab({ foodItems }: ShoppingTabProps) {
  const shopping = useList(listShopping);
  const navigate = useNavigate();
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const clearDialogRef = useRef<HTMLDialogElement>(null);

  const lines = toLines(shopping.items, foodItems);
  const inBasket = lines.filter(({ checked }) => checked).length;

  const act = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      await work();
    } catch (err: unknown) {
      setError(failureMessage(err, 'Une erreur est survenue, réessayez.'));
    }
  };

  const addLabel = () => {
    if (label.trim() === '') return;
    void act(async () => {
      await addLabelToShopping(label);
      setLabel('');
    });
  };

  const toggle = (line: ShoppingLine) =>
    void act(() => setShoppingChecked([line.id], !line.checked));

  const remove = (line: ShoppingLine) =>
    void act(() => removeShoppingItems([line.id]));

  const clear = async () => {
    setIsClearing(true);
    await act(clearShopping);
    setIsClearing(false);
    clearDialogRef.current?.close();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card
        flush
        header={
          <>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-theme-800">Ma liste</p>
              <p className="text-xs text-theme-500">
                {lines.length === 0
                  ? 'Rien à acheter'
                  : `${inBasket} / ${lines.length} dans le panier`}
              </p>
            </div>
            <AddCircleButton onClick={() => void navigate(PATHS.shoppingAdd)} />
          </>
        }
      >
        {shopping.isLoading && <CardLoading />}

        {shopping.hasError && (
          <LoadError
            message="Impossible de charger la liste."
            onRetry={shopping.retry}
          />
        )}

        {!shopping.isLoading && !shopping.hasError && lines.length === 0 && (
          <CardEmpty>
            Ajoutez des aliments, des repas ou des recettes avec le +, ou
            écrivez un article ci-dessous.
          </CardEmpty>
        )}

        <ShoppingChecklist lines={lines} onToggle={toggle} onRemove={remove} />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            addLabel();
          }}
          className="flex items-center gap-3 border-t border-theme-200 px-5 py-3"
        >
          <Input
            type="text"
            placeholder="Ajouter un article..."
            maxLength={120}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            enterKeyHint="done"
            autoComplete="off"
          />
          <FieldIconButton
            type="submit"
            label="Ajouter l'article"
            disabled={label.trim() === ''}
          >
            <Plus className="h-5 w-5" />
          </FieldIconButton>
        </form>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {lines.length > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              void act(() => shareText('Courses', shoppingText(lines)))
            }
            className={COMPACT_BUTTON_CLASS}
          >
            <Share2 className="h-4 w-4 shrink-0" />
            Partager
          </button>
          {inBasket > 0 && (
            <button
              type="button"
              onClick={() => void act(removeCheckedShopping)}
              title="Retirer les articles cochés"
              className={COMPACT_BUTTON_CLASS}
            >
              <CheckCheck className="h-4 w-4 shrink-0" />
              Retirer
            </button>
          )}
          <button
            type="button"
            onClick={() => clearDialogRef.current?.showModal()}
            className={COMPACT_DANGER_BUTTON_CLASS}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Vider
          </button>
        </div>
      )}

      <ConfirmDialog
        dialogRef={clearDialogRef}
        title="Vider la liste ?"
        description="Tous les articles seront retirés, cochés ou non."
        confirmLabel="Vider"
        pendingLabel="Suppression..."
        isPending={isClearing}
        onConfirm={() => void clear()}
      />
    </div>
  );
}
