// Cover prompts for the image generator: one style for every collection (so the cards look like one set),
// the scene is the collection's own. English: image models follow it best.
const STYLE = "Realistic food photography, warm natural window light, cozy home kitchen, soft shadows, shallow depth of field, appetizing and calm, muted warm colors, no people, no hands, no text, no letters, no logos, vertical 4:5 composition with the main subject in the center and some empty space at the bottom for a caption.";

const SCENES: Record<string, string> = {
  romantic: "A romantic dinner table for two in the evening: two plates of pan-seared salmon with lemon and herbs, two wine glasses with juice, a lit candle, a small vase with one flower, linen napkins.",
  kids: "A bright breakfast table for children: golden cottage cheese pancakes (syrniki) with sour cream and berries, a glass of milk, a colorful plate, a few strawberries, playful but tidy.",
  guests: "A festive table for guests seen from above: a big dish of pilaf in the center, bowls of salads, sliced vegetables, bread, several plates and forks around, generous and welcoming.",
  movie: "A cozy movie night snack spread on a coffee table: homemade pizza slices, crispy chicken wings, a bowl of popcorn, garlic toasts, a blanket and a dim TV glow in the background.",
  sick: "Comfort food for when you feel unwell: a steaming bowl of clear chicken noodle soup, a cup of tea with lemon and honey, a knitted blanket corner, soft morning light.",
  picnic: "A summer picnic on a checkered blanket in green grass: skewers of grilled meat, sandwiches, fresh vegetables, a basket, a bottle of lemonade, sunny daylight.",
  lenten: "Simple lenten meals on a wooden table: a bowl of hearty bean and tomato soup, buckwheat with mushrooms, a vegetable salad, rye bread, no meat, no dairy, no eggs.",
  newyear: "A New Year's Eve table: Olivier salad, herring under a fur coat salad, tangerines, a small fir branch with ornaments, warm garland lights in the background.",
  afterny: "A light meal after the holidays: a bowl of vegetable soup, oatmeal with apple, a cup of tea, tangerine peels, calm winter morning light.",
  maslenitsa: "A stack of thin golden Russian blini with butter, sour cream, honey and red caviar in small bowls, a samovar softly in the background.",
  easter: "An Easter table: a tall kulich with white icing, a paskha, dyed red eggs, willow branches, an embroidered towel.",
  feb23: "A hearty dinner: juicy meat cutlets with mashed potatoes, pickles, rye bread, a dark wooden table, masculine and cozy.",
  mar8: "A tender spring dinner: a delicate salad, a slice of cake with berries, tulips in a vase, pastel colors, soft morning light.",
  lent: "Simple lenten meals on a wooden table: a bowl of hearty bean and tomato soup, buckwheat with mushrooms, a vegetable salad, rye bread, no meat, no dairy, no eggs.",
  may: "A spring picnic by the river: shashlik on skewers over a grill, fresh herbs, radishes, flatbread, green leaves, sunny day.",
  halloween: "A cozy autumn Halloween table: a bowl of creamy pumpkin soup, pumpkin pastries, small decorative pumpkins, candles, warm orange tones, friendly not scary.",
  autumn: "An autumn harvest table: mushroom soup, baked apples with cinnamon, a pumpkin, fallen maple leaves, warm golden light.",
  winter: "A warming winter meal: a steaming bowl of beef stew, a pot of soup, rye bread, a window with snow outside, warm light.",
  spring: "A fresh spring meal: green sorrel soup with egg, a salad of radish and cucumber with dill, young potatoes with herbs, bright daylight.",
  summer: "A cold summer meal: a bowl of okroshka with ice, a fresh cucumber and tomato salad, berries, a sunny garden table.",
};

/** The prompt for a collection; an own collection gets one from its title and line. */
export function coverPrompt(key: string, title: string, hint: string): string {
  const scene = SCENES[key] ?? `Dishes for a recipe collection called "${title}"${hint ? " (" + hint + ")" : ""}: two or three home-cooked dishes that fit it, on one table.`;
  return scene + " " + STYLE;
}
