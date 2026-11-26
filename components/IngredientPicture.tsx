import ingredientsData from "@/data/ingredients.json";

// An ingredient's bin picture (the same sprite or icon the kitchen shows), filling its box.
export default function IngredientPicture({ id, className = "" }: { id: string; className?: string }) {
  const ing = ingredientsData.find((i) => i.id === id);
  if (!ing) return null;
  return <div role="img" aria-label={ing.name} className={`${ing.icon} ${className}`} />;
}
