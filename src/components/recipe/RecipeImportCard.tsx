import { useRef, useState } from 'react';
import { ClipboardPaste } from 'lucide-react';

import { AiCard } from '../ui/AiCard';
import { BaseDialog } from '../ui/BaseDialog';
import {
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from '../ui/buttonStyle';
import { FieldError } from '../ui/FieldError';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../ui/toastContext';
import { buildExportText, parseRecipeImport } from './recipeImport';
import type { RecipeEditor } from './useRecipeEditor';

/** What the last import left to do: foods to add, values changed. */
interface Report {
  missing: string[];
  warnings: string[];
}

/**
 * The AI card of the recipe editor: copies the form as JSON with its rules
 * and the library (buildExportText), like the other AI cards, then reads the
 * JSON the AI sends back, pasted in a dialog, into the form, to review and
 * save like a typed recipe. The ingredients the library lacks are listed,
 * to add with "Nouvel aliment".
 */
export function RecipeImportCard({ editor }: { editor: RecipeEditor }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [report, setReport] = useState<Report | null>(null);
  const showToast = useToast();

  const importRecipe = () => {
    const result = parseRecipeImport(text, editor.foodItems);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    editor.update(result.form);
    setReport({ missing: result.missing, warnings: result.warnings });
    setText('');
    dialogRef.current?.close();
    showToast('Recette importée, vérifiez-la avant de l’enregistrer');
  };

  return (
    <AiCard text={() => buildExportText(editor.form, editor.foodItems)}>
      <button
        type="button"
        onClick={() => {
          setError(undefined);
          dialogRef.current?.showModal();
        }}
        className={SECONDARY_BUTTON_CLASS}
      >
        <ClipboardPaste className="h-4 w-4" />
        Importer la réponse de l’IA
      </button>

      {report && report.missing.length > 0 && (
        <p className="text-sm text-red-500">
          Pas dans votre bibliothèque : {report.missing.join(', ')}. Ajoutez-les
          avec « Nouvel aliment ».
        </p>
      )}
      {report && report.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-theme-600">
          {report.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <BaseDialog
        dialogRef={dialogRef}
        title="Coller la réponse de l’IA"
        maxWidth="sm"
      >
        <div className="relative">
          <Textarea
            aria-label="Réponse de l’IA"
            rows={8}
            placeholder="Collez ici le JSON écrit par l’IA"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(undefined);
            }}
            data-invalid={Boolean(error)}
            className="min-h-48"
          />
          <FieldError message={error} />
        </div>
        <button
          type="button"
          onClick={importRecipe}
          disabled={text.trim() === ''}
          className={PRIMARY_BUTTON_CLASS}
        >
          Importer la recette
        </button>
      </BaseDialog>
    </AiCard>
  );
}
