// Шеф as a guide to the service itself: «где мой план», «открой покупки», «сделай шрифт крупнее», «как поставить
// таймер». The answer is one line and one big button — the screen never jumps by itself (a sudden jump confuses,
// older people most of all), and a setting changes only on the tap. Answered on the device, before the recipe search.
// Note: JavaScript's \b does not see Cyrillic letters as word letters, so word edges here are (?<!\p{L}) / (?!\p{L}).
import { dateKey, plural, recipeById, type ChatGo, type EngineState } from "../engine";
import type { Profile } from "./profile";

export interface NavAnswer { text: string; go?: ChatGo }

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();

/** Words that ask to go somewhere. Without one, only a short message that is just the place («мой план») counts. */
const GO = /^(?:(?:а|ну|пожалуйста|шеф)\s+)*(?:открой|открыть|покажи|показать|перейди|перейти|зайди|зайти|где|куда|верни|вернись|вернуться|хочу (?:в|на|открыть|посмотреть)|как (?:найти|открыть|попасть|перейти|зайти))(?!\p{L})/u;
/** Words that ask to change something. */
const SET = /^(?:(?:а|ну|пожалуйста|шеф)\s+)*(?:сделай|сделать|включи|включить|выключи|выключить|отключи|отключить|поменяй|поменять|смени|увеличь|уменьши|убери|верни|хочу|можно|как (?:сделать|включить|выключить|поменять|увеличить|уменьшить))(?!\p{L})|^(?:шрифт|текст|звук|звуки|тема|темная тема|светлая тема|простой режим)(?!\p{L})/u;
const MAKE_PLAN = /^(?:составь|составить|сделай|создай|спланируй)(?!\p{L})/u;
const PLAN = /(?<!\p{L})план|меню на неделю|ужины на неделю/u;
const HOW = /^как(?!\p{L})/u;

const PLACES: { re: RegExp; short?: RegExp; answer: (s: EngineState) => NavAnswer }[] = [
  {
    re: /^(?!.*школ).*(?:готовк|готовлю|шаг рецепта)/, // «школа готовки» is the school
    answer: (s) => s.cooking && !s.cooking.done
      ? { text: "Вы готовите «" + s.cooking.recipe.title + "», шаг " + (s.cooking.step + 1) + " из " + s.cooking.recipe.steps.length + ".", go: { label: "Продолжить готовку", to: "#/cook", icon: "cook" } }
      : { text: "Сейчас ничего не готовится. Откройте рецепт и нажмите «Начать готовить» — шаги пойдут по одному, с таймерами." },
  },
  {
    re: /(?<!\p{L})план|меню на неделю|ужины на неделю|расписани/u,
    short: /^(?:мой |наш )?план(?: на неделю)?$/,
    answer: (s) => {
      const today = dateKey(new Date());
      const days = s.menu.filter((d) => d.date >= today && d.items.length);
      const now = s.menu.find((d) => d.date === today)?.items[0];
      const dish = now ? recipeById(now.recipeId)?.title ?? null : null;
      return days.length
        ? { text: "Ваш план: " + days.length + " " + plural(days.length, "день расписан", "дня расписано", "дней расписано") + (dish ? ", сегодня — " + dish : "") + ".", go: { label: "Открыть план", to: "#/menu", icon: "plan" } }
        : { text: "План пока пустой. Там можно составить ужины на неделю без повторов — и сразу список покупок.", go: { label: "Открыть план", to: "#/menu", icon: "plan" } };
    },
  },
  {
    re: /покуп(?:к|ок)|список продуктов|корзин/, // «покупки», «покупкам» and «список покупок»
    short: /^(?:мой |наш )?(?:список )?покуп(?:к\p{L}*|ок)$/u,
    answer: (s) => {
      const n = s.shopping.filter((i) => !i.checked).length;
      return { text: n ? "В списке покупок " + n + " " + plural(n, "продукт", "продукта", "продуктов") + "." : "Список покупок пока пустой.", go: { label: "Открыть покупки", to: "#/shopping", icon: "cart" } };
    },
  },
  {
    re: /мои продукты|продукты дома|холодильник|запасы/,
    short: /^(?:мои )?продукты(?: дома)?$|^холодильник$/,
    answer: (s) => ({ text: s.fridge.length ? "Дома отмечено " + s.fridge.length + " " + plural(s.fridge.length, "продукт", "продукта", "продуктов") + "." : "Здесь можно отметить, что есть дома, — подберу блюда из этого.", go: { label: "Мои продукты", to: "#/pantry", icon: "fridge" } }),
  },
  {
    re: /избранн|сохраненн|сохраненк|любимые рецепты|закладк|книг\p{L}* (?:рецептов|семьи)|семейн\p{L}* книг/u,
    short: /^избранное$|^сохраненное$/,
    answer: (s) => ({ text: s.favorites.length ? "Сохранено " + s.favorites.length + " " + plural(s.favorites.length, "рецепт", "рецепта", "рецептов") + "." : "Пока ничего не сохранено — нажмите сердечко у рецепта, и он появится здесь.", go: { label: "Открыть избранное", to: "#/favorites", icon: "heart" } }),
  },
  {
    re: /школ|урок|обучени/,
    short: /^школа(?: готовки)?$|^уроки$/,
    answer: () => ({ text: "Школа готовки: короткие уроки — как жарить, варить, резать, и что делать, если что-то пошло не так.", go: { label: "Открыть школу", to: "#/learn", icon: "school" } }),
  },
  {
    re: /профил|настройк|аккаунт|семь[яию]/,
    short: /^профиль$|^настройки$/,
    answer: () => ({ text: "Размер текста, звуки, тема, семья и общий план — в Профиле.", go: { label: "Открыть профиль", to: "#/profile", icon: "profile" } }),
  },
  {
    re: /все рецепты|каталог|поиск/,
    answer: () => ({ text: "Все рецепты — с поиском и фильтрами по времени, блюду и продуктам.", go: { label: "Все рецепты", to: "#/recipes", icon: "search" } }),
  },
  {
    re: /главн/,
    answer: () => ({ text: "Главная — рецепт дня, ваш план на сегодня и подборки.", go: { label: "На главную", to: "#/", icon: "home" } }),
  },
];

const SIZES: Profile["textSize"][] = ["m", "l", "xl"];

function setting(t: string, p: Profile): NavAnswer | null {
  if (/шрифт|текст|буквы|надпис|размер/.test(t)) {
    const i = SIZES.indexOf(p.textSize);
    if (/крупн|больш|увелич/.test(t))
      return i < SIZES.length - 1
        ? { text: "Могу сделать текст крупнее во всём приложении.", go: { label: "Сделать крупнее", to: "set:textSize:" + SIZES[i + 1], icon: "text" } }
        : { text: "Текст уже самый крупный. Ещё можно включить простой режим — только главное, крупно.", go: { label: "Простой режим", to: "set:simple:on", icon: "text" } };
    if (/мельч|меньш|уменьш/.test(t))
      return i > 0
        ? { text: "Могу сделать текст мельче.", go: { label: "Сделать мельче", to: "set:textSize:" + SIZES[i - 1], icon: "text" } }
        : { text: "Текст уже обычного размера — мельче не бывает." };
  }
  if (/(?:темн|ночн)\p{L}* (?:тем|режим)|тем\p{L}* темн/u.test(t))
    return p.theme === "dark" ? { text: "Тёмная тема уже включена." } : { text: "Включу тёмную тему — глазам легче вечером.", go: { label: "Включить тёмную", to: "set:theme:dark", icon: "moon" } };
  if (/(?:светл|дневн)\p{L}* (?:тем|режим)|тем\p{L}* светл/u.test(t))
    return p.theme === "light" ? { text: "Светлая тема уже включена." } : { text: "Вернуть светлую тему?", go: { label: "Включить светлую", to: "set:theme:light", icon: "sun" } };
  if (/звук|вибрац/.test(t)) {
    if (/выключ|отключ|убер|без звук|не надо|тише/.test(t))
      return p.sounds ? { text: "Могу выключить звуки и вибрацию. Будильник таймера всё равно прозвенит.", go: { label: "Выключить звуки", to: "set:sounds:off", icon: "mute" } } : { text: "Звуки уже выключены." };
    if (/включ|верн/.test(t))
      return p.sounds ? { text: "Звуки уже включены." } : { text: "Включить звуки и вибрацию?", go: { label: "Включить звуки", to: "set:sounds:on", icon: "sound" } };
  }
  if (/прост\p{L}* режим/u.test(t)) {
    if (/выключ|отключ|убер|обычн/.test(t))
      return p.simple ? { text: "Вернуть обычный вид со всеми разделами?", go: { label: "Обычный режим", to: "set:simple:off", icon: "text" } } : { text: "Простой режим и так выключен." };
    return p.simple ? { text: "Простой режим уже включён." } : { text: "Простой режим: крупно и только главное — Главная, Шеф и Избранное.", go: { label: "Включить простой", to: "set:simple:on", icon: "text" } };
  }
  return null;
}

function howTo(t: string, s: EngineState): NavAnswer | null {
  const cooking: ChatGo | undefined = s.cooking && !s.cooking.done ? { label: "Продолжить готовку", to: "#/cook", icon: "cook" } : undefined;
  if (/таймер/.test(t) && /как|постав|завед|включ|запуст|где/.test(t))
    return { text: "В готовке у шага со временем есть кнопка с часами — нажмите её. А если включить «Голосом», можно сказать: «таймер на 5 минут».", go: cooking };
  if (/голос\p{L}* управл|управл\p{L}* голос|без рук|командами/u.test(t))
    return { text: "Во время готовки нажмите «Голосом» и говорите: «дальше», «назад», «повтори», «таймер на 5 минут».", go: cooking };
  if (HOW.test(t) && /добав|полож|занес|внест/.test(t) && /покупк|список/.test(t))
    return { text: "На странице рецепта нажмите «Добавить … в покупки» — в список попадёт только то, чего нет дома.", go: { label: "Открыть покупки", to: "#/shopping", icon: "cart" } };
  if (HOW.test(t) && /добав|постав|занес|внест/.test(t) && /план|меню/.test(t))
    return { text: "На странице рецепта нажмите «В план» и выберите день.", go: { label: "Открыть план", to: "#/menu", icon: "plan" } };
  if (HOW.test(t) && /сохран|в избранн|закладк/.test(t))
    return { text: "Нажмите сердечко на карточке или странице рецепта — он появится в «Избранном».", go: { label: "Открыть избранное", to: "#/favorites", icon: "heart" } };
  if (/^(?:что ты умеешь|что умеешь|что ты можешь|помощь|помоги разобраться|как (?:тут |этим |приложением |сервисом )?пользоваться)/.test(t))
    return { text: "Подберу блюдо по продуктам, времени и настроению. И подскажу, где что: «где мой план», «открой покупки», «сделай шрифт крупнее», «как поставить таймер»." };
  return null;
}

/** An answer about the service itself, or null — then it is a food question for the usual search. */
export function navigatorAnswer(raw: string, s: EngineState, p: Profile): NavAnswer | null {
  const t = norm(raw);
  if (!t || t.length > 80) return null;
  if (SET.test(t)) { const a = setting(t, p); if (a) return a; }
  const how = howTo(t, s);
  if (how) return how;
  const words = t.split(" ").length;
  for (const place of PLACES)
    if ((GO.test(t) && place.re.test(t)) || (words <= 4 && place.short?.test(t))) return place.answer(s);
  // «Составь план на неделю»: the plan itself is made there.
  if (MAKE_PLAN.test(t) && PLAN.test(t)) return PLACES[1].answer(s);
  return null;
}
