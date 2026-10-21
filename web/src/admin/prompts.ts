// Cover prompts for the image generator. One subject that says the theme at a glance, big, on a calm background:
// a whole table of small things comes out busy, with artefacts, and the theme gets lost on a small card.
// The same style for every collection, so the cards look like one set. English: image models follow it best.
// Two shapes: tall 4:5 for phones, wide 3:2 for computers (three cards in a row there).
const STYLE = "Close-up food photography: the main subject is large and fills most of the frame, shot from a 45-degree angle. Simple uncluttered background in soft warm cream and light terracotta tones, gently blurred. At most one or two simple props. Soft natural light, realistic, clean and appetizing. No small scattered objects, no cutlery piles, no people, no hands, no text, no letters, no logos.";
const SHAPE = {
  tall: "Vertical 4:5, calm empty space in the lower quarter for a caption.",
  wide: "Horizontal 3:2 wide frame, the subject in the centre, calm empty space along the bottom for a caption.",
};
export type CoverShape = keyof typeof SHAPE;

const SCENES: Record<string, string> = {
  romantic: "One elegant plate of pan-seared salmon with lemon and herbs next to a single lit candle, warm candlelight, romantic evening mood.",
  kids: "A stack of golden cottage cheese pancakes (syrniki) on a bright plate with a smiling face made of berries and a dollop of sour cream, cheerful and playful.",
  guests: "A large festive platter of steaming pilaf seen from slightly above, generous and inviting, golden rice with carrots and meat.",
  movie: "A big bowl overflowing with popcorn, a slice of pizza beside it, cozy dim evening light like a home cinema.",
  sick: "A steaming bowl of clear chicken noodle soup, a cup of tea with a lemon slice softly blurred behind it, comforting and gentle.",
  picnic: "A wicker picnic basket on a red-and-white checkered blanket in green grass, sunny summer day.",
  lenten: "A rustic clay bowl of buckwheat with mushrooms and fresh dill, simple and modest, earthy tones.",
  newyear: "A bowl of Olivier salad decorated with a sprig of fir and a few tangerines, warm festive glow of garland lights in the background.",
  afterny: "A bowl of light vegetable soup with a few tangerines beside it, calm winter morning light.",
  maslenitsa: "A tall stack of thin golden blini with a melting piece of butter on top and a small bowl of sour cream.",
  easter: "A tall kulich with white icing and colorful sprinkles next to two red dyed eggs.",
  feb23: "A plate of juicy meat cutlets with mashed potatoes and a pickle, hearty and homely.",
  mar8: "A slice of delicate berry cake with a small bouquet of tulips behind it, pastel spring colors.",
  lent: "A rustic clay bowl of buckwheat with mushrooms and fresh dill, simple and modest, earthy tones.",
  may: "Grilled shashlik skewers on a plate with fresh herbs and radishes, sunny spring day outdoors.",
  halloween: "A bowl of creamy pumpkin soup with a small decorative pumpkin beside it, warm orange autumn tones, friendly not scary.",
  autumn: "A bowl of mushroom soup with a baked apple and an autumn maple leaf beside it, golden autumn light.",
  winter: "A steaming bowl of hearty beef stew, a slice of rye bread beside it, snowy window softly blurred behind.",
  spring: "A bowl of green sorrel soup with half a boiled egg and fresh dill, bright spring daylight.",
  summer: "A bowl of cold okroshka with an ice cube and fresh cucumber and dill, bright summer daylight.",
};

/** The prompt for a collection's cover of the given shape; an own collection gets one from its title and line. */
export function coverPrompt(key: string, title: string, hint: string, shape: CoverShape = "tall"): string {
  const scene = SCENES[key] ?? `One dish that says «${title}»${hint ? " (" + hint + ")" : ""} at a glance, served simply on a plate.`;
  return scene + " " + STYLE + " " + SHAPE[shape];
}

// Школа готовки: one flat illustration per lesson card, all in one style — the same set of colours as the app,
// one clear action seen from above, nothing busy. Horizontal 3:2 (the card's picture). The scene is the card itself.
const SCHOOL_STYLE = "Flat illustration, warm cream background #FAF7F0, soft terracotta accent #B7432F and herb green #36703F, simple shapes, no text, no letters, no numbers, top-down or three-quarter kitchen view, one clear action, gentle shadows, friendly and uncluttered. Horizontal 3:2.";

/** The prompt for a lesson card's picture: what to show (the card, in Russian — modern image models read it) + the style. */
export function schoolPrompt(lesson: string, title: string, text: string): string {
  return "Illustration for a cooking lesson «" + lesson + "». Show this idea: «" + title + ". " + text + "» " + SCHOOL_STYLE;
}
