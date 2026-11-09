import { LibraryPicker } from '../components/home/LibraryPicker';
import { useFlow } from '../components/layout/flowContext';
import { ShoppingReview } from '../components/shopping/ShoppingReview';
import { useToast } from '../components/ui/toastContext';
import { useGoBack } from '../routing/navigation';
import { PATHS } from '../routing/paths';

/**
 * /food/shopping/add: adds foods, library meals and recipes to the shopping
 * list, then goes back to it. A recipe starts at all its servings.
 */
export default function ShoppingAddPage() {
  const flow = useFlow();
  const showToast = useToast();
  const backToList = useGoBack(PATHS.food);
  const close = () => flow.close(backToList);

  return (
    <LibraryPicker
      title="Courses"
      subtitle="Ajouter à la liste"
      onClose={close}
      prepare={(items) =>
        items.map((item) =>
          item.kind === 'recipe'
            ? { ...item, quantity: item.recipe.servings }
            : item,
        )
      }
      renderReview={(items) => (
        <ShoppingReview
          initialItems={items}
          onAdded={() => {
            showToast('Ajouté aux courses');
            close();
          }}
        />
      )}
    />
  );
}
