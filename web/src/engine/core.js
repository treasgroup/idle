// @ts-nocheck
/* eslint-disable */
// Recipe engine: catalog, matching, parsing, answers, state schema.
// Ported as-is from the previous build of the site (minified names kept for now).
// Readable names live in ./index.ts — import from there, not from this file.
import { z as D } from "zod";
import { tidyRecipe } from "./tidy";

var bS = {
  batch: "01-base",
  description: "Первые 24 рецепта (черновики редакции).",
  ingredients: [
    {
      id: "apple",
      name: "Яблоко",
      aliases: ["яблоко", "яблоки"],
      groups: [],
      per100g: { kcal: 47, protein: 0.4, fat: 0.4, carbs: 9.8 },
    },
    {
      id: "banana",
      name: "Банан без кожуры",
      aliases: ["банан", "бананы"],
      groups: [],
      per100g: { kcal: 96, protein: 1.5, fat: 0.5, carbs: 21 },
    },
    {
      id: "bell-pepper",
      name: "Болгарский перец",
      aliases: [
        "болгарский перец",
        "сладкий перец",
        "красный сладкий перец",
        "желтый сладкий перец",
        "жёлтый сладкий перец",
      ],
      groups: [],
      per100g: { kcal: 27, protein: 1.3, fat: 0.1, carbs: 5.3 },
    },
    {
      id: "black-pepper",
      name: "Чёрный перец",
      aliases: [
        "черный перец",
        "чёрный перец",
        "молотый черный перец",
        "молотый чёрный перец",
      ],
      groups: [],
      per100g: { kcal: 251, protein: 10.4, fat: 3.3, carbs: 38.7 },
    },
    {
      id: "butter",
      name: "Сливочное масло",
      aliases: ["сливочное масло", "масло сливочное"],
      groups: ["dairy"],
      per100g: { kcal: 748, protein: 0.5, fat: 82.5, carbs: 0.8 },
    },
    {
      id: "cabbage",
      name: "Белокочанная капуста",
      aliases: ["капуста", "белокочанная капуста", "белая капуста"],
      groups: [],
      per100g: { kcal: 27, protein: 1.8, fat: 0.1, carbs: 4.7 },
    },
    {
      id: "canned-beans",
      name: "Консервированная фасоль без жидкости",
      aliases: [
        "консервированная фасоль",
        "фасоль в банке",
        "фасоль консервированная",
        "консервированная белая фасоль",
        "консервированная красная фасоль",
      ],
      groups: ["legumes"],
      per100g: { kcal: 90, protein: 6, fat: 0.4, carbs: 15 },
    },
    {
      id: "canned-chickpea",
      name: "Консервированный нут без жидкости",
      aliases: [
        "консервированный нут",
        "нут в банке",
        "нут консервированный",
        "готовый консервированный нут",
      ],
      groups: ["legumes"],
      per100g: { kcal: 139, protein: 7, fat: 2.8, carbs: 22.5 },
    },
    {
      id: "canned-tomato",
      name: "Томаты в собственном соку",
      aliases: [
        "томаты в собственном соку",
        "консервированные томаты",
        "консервированные помидоры",
        "резаные томаты в банке",
      ],
      groups: [],
      per100g: { kcal: 20, protein: 1.1, fat: 0.1, carbs: 3.5 },
    },
    {
      id: "canned-tuna",
      name: "Консервированный тунец в собственном соку без жидкости",
      aliases: [
        "консервированный тунец",
        "тунец в банке",
        "тунец в собственном соку",
        "тунец консервированный",
      ],
      groups: ["fish"],
      per100g: { kcal: 96, protein: 21, fat: 1, carbs: 0 },
    },
    {
      id: "carrot",
      name: "Морковь",
      aliases: ["морковь", "морковка", "морковки"],
      groups: [],
      per100g: { kcal: 35, protein: 1.3, fat: 0.1, carbs: 6.9 },
    },
    {
      id: "chicken-fillet",
      name: "Куриное филе",
      aliases: [
        "куриное филе",
        "филе курицы",
        "куриная грудка без кости",
        "грудка куриная без кости",
      ],
      groups: ["meat", "poultry", "chicken"],
      per100g: { kcal: 113, protein: 23.6, fat: 1.9, carbs: 0.4 },
    },
    {
      id: "chili",
      name: "Молотый перец чили",
      aliases: ["чили", "молотый чили", "перец чили", "острый молотый перец"],
      groups: ["spicy"],
      per100g: { kcal: 282, protein: 13.5, fat: 14.3, carbs: 14.9 },
    },
    {
      id: "cinnamon",
      name: "Молотая корица",
      aliases: ["корица", "молотая корица"],
      groups: [],
      per100g: { kcal: 247, protein: 4, fat: 1.2, carbs: 50 },
    },
    {
      id: "cooked-rice",
      name: "Уже приготовленный рис",
      aliases: [
        "вареный рис",
        "варёный рис",
        "готовый рис",
        "уже приготовленный рис",
        "отварной рис",
        "рис после варки",
      ],
      groups: [],
      per100g: { kcal: 130, protein: 2.7, fat: 0.3, carbs: 28 },
    },
    {
      id: "cottage-cheese",
      name: "Творог 5–9%",
      aliases: ["творог", "творог 5%", "творог 9%"],
      groups: ["dairy"],
      per100g: { kcal: 145, protein: 17, fat: 7, carbs: 2 },
    },
    {
      id: "couscous",
      name: "Кускус быстрого приготовления",
      aliases: ["кускус", "кус-кус", "кускус быстрого приготовления"],
      groups: ["gluten"],
      per100g: { kcal: 376, protein: 12.8, fat: 0.6, carbs: 77.4 },
    },
    {
      id: "cream",
      name: "Сливки 10%",
      aliases: ["сливки", "сливки 10%", "сливки 20%", "сливки для готовки"],
      groups: ["dairy"],
      per100g: { kcal: 118, protein: 2.7, fat: 10, carbs: 4.5 },
      gramsPerUnit: { мл: 1.01 },
    },
    {
      id: "cucumber",
      name: "Огурец",
      aliases: ["огурец", "огурцы", "свежий огурец", "свежие огурцы"],
      groups: [],
      per100g: { kcal: 15, protein: 0.8, fat: 0.1, carbs: 2.8 },
    },
    {
      id: "dill",
      name: "Укроп",
      aliases: ["укроп", "зелень укропа"],
      groups: [],
      per100g: { kcal: 38, protein: 2.5, fat: 0.5, carbs: 6.3 },
    },
    {
      id: "egg",
      name: "Яйцо",
      aliases: ["яйцо", "яйца", "куриные яйца", "куриное яйцо"],
      groups: ["eggs"],
      per100g: { kcal: 157, protein: 12.7, fat: 11.5, carbs: 0.7 },
      gramsPerUnit: { "шт.": 55 },
    },
    {
      id: "frozen-peas",
      name: "Замороженный зелёный горошек",
      aliases: [
        "замороженный горошек",
        "замороженный зеленый горошек",
        "замороженный зелёный горошек",
      ],
      groups: ["legumes"],
      per100g: { kcal: 77, protein: 5.2, fat: 0.4, carbs: 13.6 },
    },
    {
      id: "garlic",
      name: "Чеснок",
      aliases: ["чеснок", "зубчик чеснока", "зубчики чеснока"],
      groups: [],
      per100g: { kcal: 149, protein: 6.4, fat: 0.5, carbs: 33.1 },
      gramsPerUnit: { зубчик: 5, зубчика: 5, зубчиков: 5 },
    },
    {
      id: "green-onion",
      name: "Зелёный лук",
      aliases: [
        "зеленый лук",
        "зелёный лук",
        "перья лука",
        "лук зеленый",
        "лук зелёный",
      ],
      groups: [],
      per100g: { kcal: 20, protein: 1.3, fat: 0.1, carbs: 3.2 },
    },
    {
      id: "hard-cheese",
      name: "Твёрдый сыр",
      aliases: [
        "сыр",
        "твердый сыр",
        "твёрдый сыр",
        "полутвердый сыр",
        "полутвёрдый сыр",
        "пармезан",
        "гауда",
        "российский сыр",
      ],
      groups: ["dairy"],
      per100g: { kcal: 356, protein: 24, fat: 28, carbs: 0 },
    },
    {
      id: "lemon-juice",
      name: "Лимонный сок",
      aliases: ["лимонный сок", "сок лимона"],
      groups: [],
      per100g: { kcal: 22, protein: 0.4, fat: 0.2, carbs: 6.9 },
      gramsPerUnit: { мл: 1 },
    },
    {
      id: "milk",
      name: "Молоко",
      aliases: ["молоко", "коровье молоко"],
      groups: ["dairy"],
      per100g: { kcal: 52, protein: 2.9, fat: 2.5, carbs: 4.7 },
      gramsPerUnit: { мл: 1.03 },
    },
    {
      id: "mushroom",
      name: "Шампиньоны",
      aliases: ["шампиньоны", "шампиньон", "свежие шампиньоны"],
      groups: ["mushrooms"],
      per100g: { kcal: 22, protein: 3.1, fat: 0.3, carbs: 3.3 },
    },
    {
      id: "oat-flakes",
      name: "Овсяные хлопья с варкой 5 минут",
      aliases: [
        "овсяные хлопья",
        "овсянка",
        "геркулес",
        "овсяные хлопья пятиминутные",
      ],
      groups: ["gluten"],
      per100g: { kcal: 352, protein: 12.3, fat: 6.2, carbs: 61.8 },
    },
    {
      id: "onion",
      name: "Репчатый лук",
      aliases: ["лук", "репчатый лук", "луковица", "репчатая луковица"],
      groups: [],
      per100g: { kcal: 41, protein: 1.4, fat: 0.2, carbs: 8.2 },
    },
    {
      id: "paprika",
      name: "Молотая паприка",
      aliases: ["паприка", "молотая паприка", "сладкая паприка"],
      groups: [],
      per100g: { kcal: 282, protein: 14.1, fat: 12.9, carbs: 19.1 },
    },
    {
      id: "parsley",
      name: "Петрушка",
      aliases: ["петрушка", "зелень петрушки"],
      groups: [],
      per100g: { kcal: 47, protein: 3.7, fat: 0.4, carbs: 7.6 },
    },
    {
      id: "pasta",
      name: "Макароны",
      aliases: [
        "макароны",
        "паста",
        "спагетти",
        "пенне",
        "фузилли",
        "рожки",
        "лапша для пасты",
      ],
      groups: ["gluten"],
      per100g: { kcal: 344, protein: 12, fat: 1.1, carbs: 72 },
    },
    {
      id: "plain-yogurt",
      name: "Натуральный йогурт без сахара",
      aliases: [
        "натуральный йогурт",
        "йогурт без сахара",
        "йогурт без добавок",
        "греческий йогурт",
      ],
      groups: ["dairy"],
      per100g: { kcal: 60, protein: 4.3, fat: 2.5, carbs: 4.5 },
    },
    {
      id: "potato",
      name: "Картофель",
      aliases: ["картофель", "картошка", "картофелина", "картофелины"],
      groups: [],
      per100g: { kcal: 77, protein: 2, fat: 0.4, carbs: 16.3 },
    },
    {
      id: "red-lentil",
      name: "Красная колотая чечевица",
      aliases: [
        "красная чечевица",
        "красная колотая чечевица",
        "колотая красная чечевица",
      ],
      groups: ["legumes"],
      per100g: { kcal: 314, protein: 24, fat: 1.5, carbs: 48 },
    },
    {
      id: "red-onion",
      name: "Красный лук",
      aliases: ["красный лук", "фиолетовый лук", "салатный красный лук"],
      groups: [],
      per100g: { kcal: 42, protein: 1.4, fat: 0.1, carbs: 9.1 },
    },
    {
      id: "rice",
      name: "Длиннозёрный рис",
      aliases: [
        "рис",
        "сырой рис",
        "рисовая крупа",
        "длиннозерный рис",
        "длиннозёрный рис",
      ],
      groups: [],
      per100g: { kcal: 344, protein: 6.7, fat: 0.7, carbs: 78.9 },
    },
    {
      id: "salt",
      name: "Соль",
      aliases: ["соль", "поваренная соль", "морская соль"],
      groups: [],
      per100g: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    },
    {
      id: "sour-cream",
      name: "Сметана 15–20%",
      aliases: ["сметана", "сметана 15%", "сметана 20%"],
      groups: ["dairy"],
      per100g: { kcal: 184, protein: 2.7, fat: 18, carbs: 3.1 },
    },
    {
      id: "soy-sauce",
      name: "Соевый соус",
      aliases: ["соевый соус"],
      groups: ["gluten", "soy", "legumes"],
      per100g: { kcal: 51, protein: 6, fat: 0, carbs: 6.6 },
      gramsPerUnit: { мл: 1.15 },
    },
    {
      id: "spinach",
      name: "Свежий шпинат",
      aliases: ["шпинат", "свежий шпинат", "листья шпината"],
      groups: [],
      per100g: { kcal: 23, protein: 2.9, fat: 0.4, carbs: 3.6 },
    },
    {
      id: "sugar",
      name: "Сахар",
      aliases: ["сахар", "белый сахар", "сахарный песок"],
      groups: [],
      per100g: { kcal: 398, protein: 0, fat: 0, carbs: 99.7 },
    },
    {
      id: "tomato",
      name: "Свежие помидоры",
      aliases: [
        "помидор",
        "помидоры",
        "томат",
        "томаты",
        "свежие помидоры",
        "свежие томаты",
        "черри",
      ],
      groups: [],
      per100g: { kcal: 20, protein: 0.9, fat: 0.2, carbs: 3.8 },
    },
    {
      id: "tomato-paste",
      name: "Томатная паста",
      aliases: ["томатная паста"],
      groups: [],
      per100g: { kcal: 82, protein: 4.3, fat: 0.5, carbs: 18.9 },
    },
    {
      id: "vegetable-oil",
      name: "Растительное масло",
      aliases: [
        "растительное масло",
        "подсолнечное масло",
        "оливковое масло",
        "масло подсолнечное",
        "масло оливковое",
      ],
      groups: [],
      per100g: { kcal: 899, protein: 0, fat: 99.9, carbs: 0 },
      gramsPerUnit: { мл: 0.92 },
    },
    {
      id: "water",
      name: "Вода",
      aliases: ["вода", "питьевая вода", "кипяток"],
      groups: [],
      per100g: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      gramsPerUnit: { мл: 1 },
    },
    {
      id: "wheat-flour",
      name: "Пшеничная мука",
      aliases: ["мука", "пшеничная мука", "мука пшеничная"],
      groups: ["gluten"],
      per100g: { kcal: 334, protein: 10.3, fat: 1.1, carbs: 70 },
    },
    {
      id: "wheat-noodle",
      name: "Пшеничная вермишель",
      aliases: ["вермишель", "пшеничная вермишель", "тонкая вермишель"],
      groups: ["gluten"],
      per100g: { kcal: 337, protein: 10.4, fat: 1.1, carbs: 71.5 },
    },
  ],
  recipes: [
    {
      id: "tomato-pasta",
      title: "Паста с томатами и чесноком",
      summary:
        "Простой горячий ужин с ярким томатным соусом и небольшим количеством сыра.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 20,
      activeMinutes: 15,
      difficulty: "easy",
      ingredients: [
        { id: "pasta", name: "Макароны", amount: 180, unit: "г", optional: !1 },
        {
          id: "canned-tomato",
          name: "Томаты в собственном соку",
          amount: 300,
          unit: "г",
          optional: !1,
          swap: ["tomato"],
        },
        {
          id: "garlic",
          name: "Чеснок",
          amount: 2,
          unit: "зубчика",
          optional: !1,
        },
        {
          id: "hard-cheese",
          name: "Твёрдый сыр",
          amount: 30,
          unit: "г",
          optional: !1,
        },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 15,
          unit: "мл",
          optional: !1,
        },
        { id: "salt", name: "Соль", amount: 5, unit: "г", optional: !1 },
        { id: "water", name: "Вода", amount: 1500, unit: "мл", optional: !1 },
      ],
      appliances: ["pot", "pan"],
      tags: ["cozy", "comfort", "vegetarian"],
      steps: [
        {
          text: "Поставьте воду на сильный огонь. Измельчите чеснок, натрите сыр, разомните томаты вилкой.",
          uses: ["canned-tomato", "garlic", "hard-cheese", "water"],
        },
        {
          text: "Посолите закипевшую воду примерно половиной соли. Добавьте макароны и варите по времени на упаковке.",
          uses: ["pasta", "salt", "water"],
        },
        {
          text: "Пока варятся макароны, разогрейте масло в сковороде. Обжарьте чеснок на среднем огне 30 секунд, затем добавьте томаты и оставшуюся соль.",
          uses: ["canned-tomato", "garlic", "vegetable-oil", "salt"],
        },
        {
          text: "Тушите соус без крышки 8 минут, периодически помешивая.",
          timerSeconds: 480,
        },
        {
          text: "Отложите 100 мл воды от макарон, остальное слейте. Перемешайте пасту с соусом; если он густой, добавьте немного отложенной воды. Разложите по тарелкам и посыпьте сыром.",
          uses: ["pasta", "hard-cheese"],
        },
      ],
      tips: [
        "Время варки зависит от формы макарон: ориентируйтесь на упаковку.",
        "Соль добавляйте с учётом солёности сыра и томатов.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner"],
      mainIngredient: "pasta",
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      look: "Паста в глубокой тарелке в густом томатном соусе, сверху тёртый сыр",
      schema: 2,
    },
    {
      id: "mushroom-cream-pasta",
      title: "Паста с грибами в сливочном соусе",
      summary:
        "Сытная паста с обжаренными шампиньонами и мягким сливочным соусом.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 25,
      activeMinutes: 20,
      difficulty: "easy",
      ingredients: [
        { id: "pasta", name: "Макароны", amount: 180, unit: "г", optional: !1 },
        {
          id: "mushroom",
          name: "Шампиньоны",
          amount: 250,
          unit: "г",
          optional: !1,
        },
        {
          id: "cream",
          name: "Сливки 10–20%",
          amount: 150,
          unit: "мл",
          optional: !1,
          swap: ["sour-cream"],
        },
        {
          id: "onion",
          name: "Репчатый лук",
          amount: 80,
          unit: "г",
          optional: !1,
        },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 15,
          unit: "мл",
          optional: !1,
        },
        { id: "salt", name: "Соль", amount: 5, unit: "г", optional: !1 },
        {
          id: "black-pepper",
          name: "Чёрный перец",
          amount: 0.5,
          unit: "г",
          optional: !1,
        },
        { id: "water", name: "Вода", amount: 1500, unit: "мл", optional: !1 },
      ],
      appliances: ["pot", "pan"],
      tags: ["cozy", "hearty", "comfort", "vegetarian"],
      steps: [
        {
          text: "Поставьте воду для макарон. Нарежьте грибы пластинками, а лук — маленькими кубиками.",
          uses: ["pasta", "mushroom", "onion", "water"],
        },
        {
          text: "В закипевшую воду добавьте примерно половину соли и макароны. Варите по инструкции на упаковке.",
          uses: ["pasta", "salt", "water"],
        },
        {
          text: "Разогрейте масло в большой сковороде. Обжарьте лук 3 минуты, затем добавьте грибы и готовьте 7–8 минут, пока выделившаяся жидкость почти не испарится.",
          uses: ["mushroom", "onion", "vegetable-oil"],
        },
        {
          text: "Влейте сливки, добавьте перец и оставшуюся соль. Прогрейте на слабом огне 3 минуты; бурного кипения не допускайте.",
          timerSeconds: 180,
          uses: ["cream", "salt", "black-pepper"],
        },
        {
          text: "Сохраните немного воды от макарон, затем слейте их. Перемешайте с грибами; при необходимости добавьте 1–2 ложки сохранённой воды и прогрейте минуту.",
          uses: ["mushroom"],
        },
      ],
      tips: [
        "Для четырёх порций используйте широкую сковороду или обжарьте грибы в два захода.",
        "Соус густеет при остывании, поэтому подавайте пасту сразу.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner"],
      mainIngredient: "mushroom",
      occasions: ["everyday", "date"],
      budget: "medium",
      kids: !0,
      cookware: ["широкая сковорода"],
      look: "Паста с ломтиками шампиньонов в светлом сливочном соусе на тарелке",
      schema: 2,
    },
    {
      id: "spinach-garlic-pasta",
      title: "Паста со шпинатом и чесноком",
      summary: "Быстрая паста со свежим шпинатом, чесноком и лимонным соком.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 20,
      activeMinutes: 12,
      difficulty: "easy",
      ingredients: [
        {
          id: "pasta",
          name: "Макароны с варкой до 10 минут",
          amount: 180,
          unit: "г",
        },
        { id: "spinach", name: "Свежий шпинат", amount: 150, unit: "г" },
        { id: "garlic", name: "Чеснок", amount: 2, unit: "зубчика" },
        { id: "lemon-juice", name: "Лимонный сок", amount: 15, unit: "мл" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 25,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 5, unit: "г" },
        { id: "water", name: "Вода", amount: 1500, unit: "мл" },
      ],
      appliances: ["pot", "pan"],
      tags: ["quick", "light", "fresh"],
      steps: [
        {
          text: "Поставьте воду на сильный огонь; для быстрого старта используйте кипяток, если он уже есть. Промойте шпинат и тонко нарежьте чеснок.",
          uses: ["spinach", "garlic", "water"],
        },
        {
          text: "Посолите закипевшую воду примерно половиной соли. Варите макароны по инструкции; для времени в 15 минут выбирайте сорт с варкой до 10 минут.",
          uses: ["pasta", "salt", "water"],
        },
        {
          text: "За 4 минуты до готовности макарон разогрейте масло в сковороде. Прогрейте чеснок 30 секунд, добавьте шпинат и готовьте 2–3 минуты, пока листья не уменьшатся в объёме.",
          uses: ["spinach", "garlic", "vegetable-oil"],
        },
        {
          text: "Сохраните 100 мл воды от пасты, остальную слейте. Переложите макароны к шпинату, добавьте лимонный сок, оставшуюся соль и немного сохранённой воды. Перемешайте и подавайте.",
          uses: ["pasta", "spinach", "lemon-juice", "salt"],
        },
      ],
      tips: [
        "Если вода долго закипает или макароны требуют больше 10 минут, общее время увеличится.",
        "Замороженный шпинат требует другого времени приготовления и в этом рецепте не используется.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner"],
      mainIngredient: "spinach",
      season: ["spring", "summer"],
      occasions: ["everyday"],
      budget: "medium",
      look: "Паста с тёмно-зелёными листьями шпината и ломтиками чеснока в тарелке",
      schema: 2,
    },
    {
      id: "egg-fried-rice",
      title: "Жареный рис с яйцом и горошком",
      summary:
        "Быстрый горячий ужин из уже приготовленного риса, яиц и зелёного горошка.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 15,
      activeMinutes: 15,
      difficulty: "easy",
      ingredients: [
        {
          id: "cooked-rice",
          name: "Уже приготовленный рис",
          amount: 300,
          unit: "г",
        },
        { id: "egg", name: "Яйца", amount: 2, unit: "шт." },
        {
          id: "frozen-peas",
          name: "Замороженный зелёный горошек",
          amount: 120,
          unit: "г",
        },
        { id: "soy-sauce", name: "Соевый соус", amount: 20, unit: "мл" },
        { id: "green-onion", name: "Зелёный лук", amount: 20, unit: "г" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 20,
          unit: "мл",
        },
        { id: "water", name: "Вода", amount: 30, unit: "мл" },
      ],
      appliances: ["pan"],
      tags: ["quick", "hearty", "comfort"],
      steps: [
        {
          text: "Разрыхлите готовый рис вилкой. Взбейте яйца, мелко нарежьте зелёный лук. Используйте рис, который после приготовления хранился в холодильнике.",
          uses: ["cooked-rice", "egg", "green-onion"],
        },
        {
          text: "Разогрейте половину масла в сковороде. Влейте яйца и, помешивая, доведите до полностью схватившейся яичной крошки. Переложите её на тарелку.",
          uses: ["egg", "vegetable-oil"],
        },
        {
          text: "Добавьте оставшееся масло, горошек и воду. Готовьте под крышкой 3 минуты на среднем огне.",
          timerSeconds: 180,
          uses: ["frozen-peas", "vegetable-oil", "water"],
        },
        {
          text: "Добавьте рис и соевый соус. Жарьте 4–5 минут, перемешивая, пока рис не станет горячим по всей толщине.",
          uses: ["cooked-rice", "soy-sauce"],
        },
        {
          text: "Верните яйцо в сковороду, добавьте зелёный лук и перемешайте. Прогрейте ещё минуту и сразу подавайте.",
          uses: ["egg", "green-onion"],
        },
      ],
      tips: [
        "Рис в списке уже варёный. Если начинать с сырой крупы, её варку нужно добавить к общему времени.",
        "Соевый соус уже солёный: отдельная соль в этот рецепт не входит.",
        "Для четырёх порций может понадобиться обжарка в два захода; это увеличит время.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner"],
      mainIngredient: "cooked-rice",
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      cookware: ["широкая сковорода с крышкой"],
      look: "Жареный рис с яичной крошкой, зелёным горошком и зелёным луком в миске",
      schema: 2,
    },
    {
      id: "chickpea-tomato-bowl",
      title: "Тёплый нут с томатами",
      summary:
        "Тёплая миска с нутом, томатами и чесноком, когда нужен сытный ужин без мяса.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 15,
      activeMinutes: 12,
      difficulty: "easy",
      ingredients: [
        {
          id: "canned-chickpea",
          name: "Консервированный нут без жидкости",
          amount: 320,
          unit: "г",
        },
        {
          id: "canned-tomato",
          name: "Томаты в собственном соку",
          amount: 250,
          unit: "г",
          swap: ["tomato"],
        },
        { id: "garlic", name: "Чеснок", amount: 2, unit: "зубчика" },
        {
          id: "parsley",
          name: "Петрушка",
          amount: 15,
          unit: "г",
          swap: ["dill"],
        },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 15,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 2, unit: "г" },
        { id: "paprika", name: "Молотая паприка", amount: 2, unit: "г" },
        { id: "water", name: "Вода", amount: 50, unit: "мл" },
      ],
      appliances: ["pan"],
      tags: ["quick", "hearty", "cozy"],
      steps: [
        {
          text: "Слейте жидкость из нута. Измельчите чеснок и петрушку, разомните томаты вилкой.",
          uses: ["canned-chickpea", "canned-tomato", "garlic", "parsley"],
        },
        {
          text: "Разогрейте масло в сковороде. Прогрейте чеснок 30 секунд на среднем огне, добавьте паприку и сразу перемешайте с томатами.",
          uses: ["canned-tomato", "garlic", "vegetable-oil", "paprika"],
        },
        {
          text: "Добавьте нут, воду и соль. Тушите 8 минут без крышки, периодически помешивая.",
          timerSeconds: 480,
          uses: ["canned-chickpea", "salt", "water"],
        },
        {
          text: "Проверьте, что нут горячий, вмешайте петрушку и разложите по мискам. Если соус густоват, добавьте немного горячей воды.",
          uses: ["canned-chickpea", "parsley"],
        },
      ],
      tips: [
        "Сухой нут не заменяет консервированный по времени: его нужно отдельно замочить и сварить.",
        "Соль регулируйте с учётом состава консервов.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner"],
      mainIngredient: "canned-chickpea",
      occasions: ["everyday"],
      budget: "low",
      look: "Нут в густом томатном соусе в глубокой миске, сверху рубленая петрушка",
      schema: 2,
    },
    {
      id: "vegetable-couscous",
      title: "Кускус с огурцом и томатами",
      summary:
        "Лёгкое блюдо с рассыпчатым кускусом, свежими овощами и лимонной заправкой.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 15,
      activeMinutes: 10,
      difficulty: "easy",
      ingredients: [
        {
          id: "couscous",
          name: "Кускус быстрого приготовления",
          amount: 140,
          unit: "г",
        },
        { id: "cucumber", name: "Огурец", amount: 180, unit: "г" },
        { id: "tomato", name: "Свежие помидоры", amount: 200, unit: "г" },
        {
          id: "parsley",
          name: "Петрушка",
          amount: 15,
          unit: "г",
          swap: ["dill"],
        },
        { id: "lemon-juice", name: "Лимонный сок", amount: 20, unit: "мл" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 20,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 3, unit: "г" },
        { id: "water", name: "Вода", amount: 200, unit: "мл" },
      ],
      appliances: ["pot"],
      tags: ["quick", "light", "fresh"],
      steps: [
        {
          text: "В небольшой кастрюле доведите воду до кипения. Проверьте пропорцию воды на упаковке кускуса: указанное количество рассчитано на обычный быстрорастворимый продукт.",
          uses: ["couscous", "water"],
        },
        {
          text: "Снимите кастрюлю с огня, добавьте кускус и половину соли. Перемешайте, накройте и оставьте на 5 минут или на время с упаковки.",
          timerSeconds: 300,
          uses: ["couscous", "salt"],
        },
        {
          text: "Пока кускус набухает, нарежьте огурец и помидоры небольшими кубиками, измельчите петрушку.",
          uses: ["cucumber", "tomato", "parsley"],
        },
        {
          text: "Разрыхлите кускус вилкой. Смешайте с овощами, петрушкой, лимонным соком, маслом и оставшейся солью. Подавайте тёплым или комнатной температуры.",
          uses: ["couscous", "parsley", "lemon-juice", "vegetable-oil", "salt"],
        },
      ],
      tips: [
        "Жемчужный кускус требует варки и не подходит под указанное время.",
        "Для большей порции время запаривания обычно не меняется, но вода должна равномерно покрывать крупу.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "salad",
      meals: ["lunch", "dinner", "snack"],
      mainIngredient: "couscous",
      season: ["summer"],
      occasions: ["everyday", "picnic"],
      budget: "low",
      look: "Рассыпчатый кускус с кубиками огурца и помидоров и зеленью в миске",
      schema: 2,
    },
    {
      id: "red-lentil-soup",
      title: "Суп из красной чечевицы",
      summary:
        "Густой домашний суп с красной чечевицей, морковью и мягкими специями.",
      servings: 2,
      minServings: 1,
      maxServings: 8,
      totalMinutes: 35,
      activeMinutes: 15,
      difficulty: "easy",
      ingredients: [
        {
          id: "red-lentil",
          name: "Красная колотая чечевица",
          amount: 140,
          unit: "г",
        },
        { id: "carrot", name: "Морковь", amount: 100, unit: "г" },
        { id: "onion", name: "Репчатый лук", amount: 80, unit: "г" },
        { id: "tomato-paste", name: "Томатная паста", amount: 25, unit: "г" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 15,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 3, unit: "г" },
        { id: "paprika", name: "Молотая паприка", amount: 2, unit: "г" },
        { id: "water", name: "Вода", amount: 800, unit: "мл" },
      ],
      appliances: ["pot"],
      tags: ["cozy", "hearty", "comfort"],
      steps: [
        {
          text: "Промойте чечевицу. Нарежьте лук мелкими кубиками, морковь натрите крупно.",
          uses: ["red-lentil", "carrot", "onion"],
        },
        {
          text: "Разогрейте масло в кастрюле с толстым дном. Обжаривайте лук и морковь 5 минут на среднем огне, помешивая.",
          uses: ["carrot", "onion", "vegetable-oil"],
        },
        {
          text: "Добавьте томатную пасту и паприку, перемешайте и готовьте ещё минуту.",
          uses: ["tomato-paste", "paprika"],
        },
        {
          text: "Всыпьте чечевицу, влейте воду и доведите до кипения. Убавьте огонь и варите с приоткрытой крышкой 18–20 минут, пока чечевица не станет мягкой.",
          timerSeconds: 1200,
          uses: ["red-lentil", "water"],
        },
        {
          text: "Добавьте соль и перемешайте. Разомните часть чечевицы ложкой прямо в кастрюле для густоты. Если суп слишком густой, добавьте немного горячей воды и вновь прогрейте.",
          uses: ["red-lentil", "salt"],
        },
      ],
      tips: [
        "Зелёная и коричневая чечевица варятся дольше; это отдельные продукты для подбора по времени.",
        "Чечевичный суп густеет после остывания.",
      ],
      storageDays: 3,
      cuisine: "international",
      editorialStatus: "draft",
      course: "soup",
      meals: ["lunch", "dinner"],
      mainIngredient: "red-lentil",
      season: ["autumn", "winter"],
      occasions: ["everyday"],
      budget: "low",
      freezerDays: 60,
      yields: { amount: 1, unit: "л" },
      cookware: ["кастрюля с толстым дном"],
      look: "Густой оранжевый суп из чечевицы в глубокой тарелке",
      schema: 2,
    },
    {
      id: "potato-cream-soup",
      title: "Картофельный суп-пюре",
      summary:
        "Мягкий сливочный суп из картофеля и лука для спокойного домашнего ужина.",
      servings: 2,
      minServings: 1,
      maxServings: 8,
      totalMinutes: 35,
      activeMinutes: 15,
      difficulty: "easy",
      ingredients: [
        { id: "potato", name: "Картофель", amount: 400, unit: "г" },
        { id: "onion", name: "Репчатый лук", amount: 80, unit: "г" },
        {
          id: "cream",
          name: "Сливки 10%",
          amount: 100,
          unit: "мл",
          swap: ["milk"],
        },
        { id: "butter", name: "Сливочное масло", amount: 15, unit: "г" },
        { id: "salt", name: "Соль", amount: 3, unit: "г" },
        { id: "black-pepper", name: "Чёрный перец", amount: 0.5, unit: "г" },
        { id: "water", name: "Вода", amount: 550, unit: "мл" },
      ],
      appliances: ["pot", "blender"],
      tags: ["cozy", "comfort"],
      steps: [
        {
          text: "Очистите картофель и нарежьте кубиками около 2 см. Мелко нарежьте лук.",
          uses: ["potato", "onion"],
        },
        {
          text: "Растопите масло в кастрюле на среднем огне. Готовьте лук 3 минуты до мягкости, не подрумянивая.",
          uses: ["onion", "butter"],
        },
        {
          text: "Добавьте картофель, воду и соль. После закипания варите на небольшом огне 15–18 минут, пока картофель легко не протыкается вилкой.",
          timerSeconds: 1080,
          uses: ["potato", "salt", "water"],
        },
        {
          text: "Снимите кастрюлю с огня. Осторожно измельчите суп погружным блендером, удерживая насадку под поверхностью жидкости, чтобы не разбрызгать горячий суп.",
        },
        {
          text: "Влейте сливки, добавьте перец и прогрейте 2 минуты на слабом огне. Для более жидкого супа добавьте немного горячей воды.",
          uses: ["cream", "black-pepper"],
        },
      ],
      tips: [
        "Рецепт рассчитан на погружной блендер. Прибор с закрытой чашей используйте для горячих продуктов только по его инструкции.",
        "При увеличении порций выбирайте кастрюлю с запасом объёма.",
      ],
      storageDays: 3,
      cuisine: "international",
      editorialStatus: "draft",
      course: "soup",
      meals: ["lunch", "dinner"],
      mainIngredient: "potato",
      season: ["autumn", "winter"],
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      yields: { amount: 1, unit: "л" },
      look: "Гладкий кремовый картофельный суп-пюре в тарелке, сверху щепотка молотого перца",
      schema: 2,
    },
    {
      id: "tomato-bean-soup",
      title: "Томатный суп с фасолью",
      summary:
        "Насыщенный суп из томатов и уже готовой фасоли без долгой варки бобовых.",
      servings: 2,
      minServings: 1,
      maxServings: 8,
      totalMinutes: 25,
      activeMinutes: 15,
      difficulty: "easy",
      ingredients: [
        {
          id: "canned-beans",
          name: "Консервированная фасоль без жидкости",
          amount: 250,
          unit: "г",
        },
        {
          id: "canned-tomato",
          name: "Томаты в собственном соку",
          amount: 300,
          unit: "г",
          swap: ["tomato"],
        },
        { id: "carrot", name: "Морковь", amount: 80, unit: "г" },
        { id: "onion", name: "Репчатый лук", amount: 80, unit: "г" },
        { id: "garlic", name: "Чеснок", amount: 1, unit: "зубчик" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 15,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 2, unit: "г" },
        { id: "water", name: "Вода", amount: 400, unit: "мл" },
      ],
      appliances: ["pot"],
      tags: ["cozy", "hearty"],
      steps: [
        {
          text: "Нарежьте лук мелко, морковь — тонкими ломтиками, чеснок измельчите. Слейте жидкость из фасоли и разомните томаты.",
          uses: ["canned-beans", "canned-tomato", "carrot", "onion", "garlic"],
        },
        {
          text: "Разогрейте масло в кастрюле. Обжаривайте лук и морковь 5 минут, затем добавьте чеснок на 30 секунд.",
          uses: ["carrot", "onion", "garlic", "vegetable-oil"],
        },
        {
          text: "Добавьте томаты и воду. Доведите до кипения и варите на небольшом огне 10 минут, пока морковь не станет мягкой.",
          timerSeconds: 600,
          uses: ["canned-tomato", "carrot", "water"],
        },
        {
          text: "Добавьте фасоль и соль. Варите ещё 4 минуты, чтобы фасоль полностью прогрелась, затем разлейте суп по тарелкам.",
          uses: ["canned-beans", "salt"],
        },
      ],
      tips: [
        "Указанное время подходит для консервированной фасоли. Сухую фасоль нужно готовить отдельно.",
        "Солёность консервов различается: сначала попробуйте суп, затем добавьте всю соль.",
      ],
      storageDays: 3,
      cuisine: "international",
      editorialStatus: "draft",
      course: "soup",
      meals: ["lunch", "dinner"],
      mainIngredient: "canned-beans",
      season: ["autumn", "winter"],
      occasions: ["everyday"],
      budget: "low",
      freezerDays: 60,
      yields: { amount: 1, unit: "л" },
      look: "Густой красный томатный суп с фасолью и кусочками моркови в тарелке",
      schema: 2,
    },
    {
      id: "tomato-cheese-omelette",
      title: "Омлет с помидорами и сыром",
      summary:
        "Нежный омлет на сковороде для быстрого завтрака или лёгкого ужина.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 12,
      activeMinutes: 8,
      difficulty: "easy",
      ingredients: [
        { id: "egg", name: "Яйца", amount: 4, unit: "шт." },
        { id: "tomato", name: "Свежие помидоры", amount: 150, unit: "г" },
        { id: "milk", name: "Молоко", amount: 60, unit: "мл" },
        { id: "hard-cheese", name: "Твёрдый сыр", amount: 40, unit: "г" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 10,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 2, unit: "г" },
      ],
      appliances: ["pan"],
      tags: ["quick", "light", "comfort"],
      steps: [
        {
          text: "Нарежьте помидоры небольшими кубиками, натрите сыр. В миске перемешайте яйца с молоком и солью до однородности.",
          uses: ["egg", "tomato", "milk", "hard-cheese", "salt"],
        },
        {
          text: "Разогрейте масло в сковороде диаметром около 24 см. Готовьте помидоры 2 минуты на среднем огне.",
          uses: ["tomato", "vegetable-oil"],
        },
        {
          text: "Влейте яйца, уменьшите огонь до слабого и накройте крышкой. Готовьте 5–6 минут до схватывания поверхности.",
          timerSeconds: 360,
          uses: ["egg"],
        },
        {
          text: "Посыпьте сыром и накройте ещё на минуту. Убедитесь, что в центре не осталось жидкого яйца, разделите омлет и подавайте.",
          uses: ["egg", "hard-cheese"],
        },
      ],
      tips: [
        "Для четырёх порций используйте более широкую сковороду или готовьте два омлета; толстый омлет потребует больше времени.",
        "Отрегулируйте соль с учётом сыра.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "breakfast",
      meals: ["breakfast", "dinner"],
      mainIngredient: "egg",
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      cookware: ["сковорода 24 см с крышкой"],
      look: "Пышный омлет с кусочками помидоров и расплавленным сыром прямо в сковороде",
      schema: 2,
    },
    {
      id: "shakshuka",
      title: "Яйца в пряном томатном соусе",
      summary:
        "Шакшука с болгарским перцем: тёплая, яркая и достаточно сытная для ужина.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 30,
      activeMinutes: 15,
      difficulty: "easy",
      ingredients: [
        { id: "egg", name: "Яйца", amount: 4, unit: "шт." },
        {
          id: "canned-tomato",
          name: "Томаты в собственном соку",
          amount: 350,
          unit: "г",
          swap: ["tomato"],
        },
        { id: "bell-pepper", name: "Болгарский перец", amount: 150, unit: "г" },
        { id: "onion", name: "Репчатый лук", amount: 80, unit: "г" },
        { id: "garlic", name: "Чеснок", amount: 2, unit: "зубчика" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 15,
          unit: "мл",
        },
        { id: "paprika", name: "Молотая паприка", amount: 2, unit: "г" },
        { id: "chili", name: "Молотый перец чили", amount: 0.3, unit: "г" },
        { id: "salt", name: "Соль", amount: 2, unit: "г" },
      ],
      appliances: ["pan"],
      tags: ["cozy", "hearty", "spicy"],
      steps: [
        {
          text: "Мелко нарежьте лук, чеснок и сладкий перец. Разомните томаты вилкой.",
          uses: ["canned-tomato", "bell-pepper", "onion", "garlic"],
        },
        {
          text: "Разогрейте масло в широкой сковороде. Обжаривайте лук и сладкий перец 5 минут, затем добавьте чеснок, паприку и чили на 30 секунд.",
          uses: [
            "bell-pepper",
            "onion",
            "garlic",
            "vegetable-oil",
            "paprika",
            "chili",
          ],
        },
        {
          text: "Добавьте томаты и соль. Тушите 7 минут на среднем огне, пока соус немного не загустеет.",
          timerSeconds: 420,
          uses: ["canned-tomato", "salt"],
        },
        {
          text: "Ложкой сделайте четыре небольших углубления и аккуратно разбейте в них яйца. Накройте крышкой и готовьте на слабом огне 7–9 минут.",
          uses: ["egg"],
        },
        {
          text: "Проверьте, что белки и желтки полностью схватились; при необходимости оставьте под крышкой ещё на несколько минут. Разделите соус с яйцами на две порции.",
          uses: ["egg"],
        },
      ],
      tips: [
        "Молотый чили входит в обязательные ингредиенты, поэтому подбор учитывает остроту этого блюда.",
        "Время яиц зависит от размера сковороды и толщины соуса.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "breakfast",
      meals: ["breakfast", "dinner"],
      mainIngredient: "egg",
      occasions: ["everyday", "date"],
      budget: "low",
      cookware: ["широкая сковорода с крышкой"],
      look: "Яйца с целыми желтками в густом томатном соусе с перцем в широкой сковороде",
      schema: 2,
    },
    {
      id: "potato-egg-skillet",
      title: "Картофель с яйцом на сковороде",
      summary: "Простой сытный ужин с подрумяненным картофелем и яйцами.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 35,
      activeMinutes: 20,
      difficulty: "easy",
      ingredients: [
        { id: "potato", name: "Картофель", amount: 450, unit: "г" },
        { id: "egg", name: "Яйца", amount: 3, unit: "шт." },
        { id: "onion", name: "Репчатый лук", amount: 80, unit: "г" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 25,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 3, unit: "г" },
        { id: "black-pepper", name: "Чёрный перец", amount: 0.5, unit: "г" },
        { id: "water", name: "Вода", amount: 50, unit: "мл" },
      ],
      appliances: ["pan"],
      tags: ["hearty", "comfort", "cozy"],
      steps: [
        {
          text: "Очистите картофель и нарежьте кубиками около 1,5 см. Лук нарежьте тонкими полукольцами.",
          uses: ["potato", "onion"],
        },
        {
          text: "Разогрейте масло в широкой сковороде. Добавьте картофель, обжаривайте 5 минут на среднем огне, перемешивая.",
          uses: ["potato", "vegetable-oil"],
        },
        {
          text: "Добавьте лук, воду и половину соли. Накройте крышкой и готовьте 12–15 минут на небольшом огне. Проверяйте мягкость картофеля и перемешайте дважды.",
          timerSeconds: 900,
          uses: ["onion", "salt", "water"],
        },
        {
          text: "Снимите крышку и дайте воде испариться. Перемешайте яйца с оставшейся солью и перцем, залейте картофель.",
          uses: ["potato", "egg", "salt", "black-pepper", "water"],
        },
        {
          text: "Накройте и готовьте на слабом огне 4–6 минут до полного схватывания яиц. Разделите блюдо лопаткой на порции.",
          uses: ["egg"],
        },
      ],
      tips: [
        "Слишком крупные кусочки картофеля требуют дополнительного времени.",
        "Если увеличиваете порции, выберите сковороду достаточного диаметра: толстый слой картофеля готовится дольше.",
        "Для одной порции используйте одно целое яйцо и половину второго, предварительно взбитого.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["breakfast", "lunch", "dinner"],
      mainIngredient: "potato",
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      cookware: ["широкая сковорода с крышкой"],
      look: "Подрумяненные кубики картофеля с луком, залитые яйцом, в сковороде",
      schema: 2,
    },
    {
      id: "oven-potato-wedges",
      title: "Картофельные дольки с йогуртовым соусом",
      summary:
        "Румяные дольки из духовки с прохладным соусом из йогурта и чеснока.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 45,
      activeMinutes: 12,
      difficulty: "easy",
      ingredients: [
        { id: "potato", name: "Картофель", amount: 600, unit: "г" },
        {
          id: "plain-yogurt",
          name: "Натуральный йогурт без сахара",
          amount: 120,
          unit: "г",
          swap: ["sour-cream"],
        },
        { id: "garlic", name: "Чеснок", amount: 1, unit: "зубчик" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 25,
          unit: "мл",
        },
        { id: "paprika", name: "Молотая паприка", amount: 2, unit: "г" },
        { id: "salt", name: "Соль", amount: 4, unit: "г" },
        {
          id: "dill",
          name: "Укроп",
          amount: 10,
          unit: "г",
          swap: ["parsley", "green-onion"],
        },
      ],
      appliances: ["oven"],
      tags: ["hearty", "comfort", "cozy"],
      steps: [
        {
          text: "Включите духовку на 210 °C в режиме верхнего и нижнего нагрева. Вымойте картофель, очистите при желании и нарежьте одинаковыми дольками толщиной около 2 см.",
          uses: ["potato"],
        },
        {
          text: "Смешайте картофель с маслом, паприкой и 3 г соли. Разложите на противне одним слоем, оставляя между дольками немного места.",
          uses: ["potato", "vegetable-oil", "paprika", "salt"],
        },
        {
          text: "Запекайте в разогретой духовке 30–35 минут. На середине времени переверните дольки; готовый картофель должен легко протыкаться вилкой.",
          timerSeconds: 1800,
          uses: ["potato"],
        },
        {
          text: "Пока картофель запекается, измельчите чеснок и укроп. Смешайте с йогуртом и оставшейся солью.",
          uses: ["plain-yogurt", "garlic", "salt", "dill"],
        },
        {
          text: "Проверьте мягкость и цвет картофеля; при необходимости запекайте ещё 5 минут. Подавайте горячие дольки с соусом отдельно.",
          uses: ["potato"],
        },
      ],
      tips: [
        "Разогрев духовки включён в ориентировочное общее время.",
        "Четыре порции могут потребовать два противня; время и равномерность запекания нужно проверить.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner", "snack"],
      mainIngredient: "potato",
      occasions: ["everyday", "picnic"],
      budget: "low",
      kids: !0,
      cookware: ["противень"],
      look: "Румяные картофельные дольки с паприкой на тарелке, рядом мисочка белого йогуртового соуса с укропом",
      schema: 2,
    },
    {
      id: "potato-mushroom-pan",
      title: "Картофель с шампиньонами",
      summary:
        "Домашний картофель с грибами и луком, который готовится в одной сковороде.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 35,
      activeMinutes: 22,
      difficulty: "easy",
      ingredients: [
        { id: "potato", name: "Картофель", amount: 450, unit: "г" },
        { id: "mushroom", name: "Шампиньоны", amount: 250, unit: "г" },
        { id: "onion", name: "Репчатый лук", amount: 100, unit: "г" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 30,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 3, unit: "г" },
        { id: "black-pepper", name: "Чёрный перец", amount: 0.5, unit: "г" },
        { id: "water", name: "Вода", amount: 60, unit: "мл" },
      ],
      appliances: ["pan"],
      tags: ["cozy", "hearty", "comfort"],
      steps: [
        {
          text: "Очистите картофель и нарежьте кубиками около 1,5 см. Грибы нарежьте пластинками, лук — полукольцами.",
          uses: ["potato", "mushroom", "onion"],
        },
        {
          text: "Разогрейте половину масла в широкой сковороде. Готовьте грибы 6–7 минут до испарения большей части жидкости. Переложите на тарелку.",
          uses: ["mushroom", "vegetable-oil"],
        },
        {
          text: "Добавьте оставшееся масло, картофель и лук. Обжаривайте 5 минут, затем добавьте воду и накройте крышкой.",
          uses: ["potato", "onion", "vegetable-oil", "water"],
        },
        {
          text: "Готовьте на небольшом огне 12–15 минут, дважды перемешав, до мягкости картофеля.",
          timerSeconds: 900,
        },
        {
          text: "Верните грибы, добавьте соль и перец. Готовьте без крышки ещё 3 минуты, чтобы лишняя влага испарилась.",
          uses: ["mushroom", "salt", "black-pepper"],
        },
      ],
      tips: [
        "Для равномерного приготовления нужен достаточно тонкий слой картофеля.",
        "Лесные грибы требуют отдельной подготовки и не являются прямой заменой шампиньонов.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner"],
      mainIngredient: "potato",
      season: ["autumn"],
      occasions: ["everyday"],
      budget: "low",
      cookware: ["широкая сковорода с крышкой"],
      look: "Жареный картофель с шампиньонами и луком в сковороде",
      schema: 2,
    },
    {
      id: "chicken-rice-pan",
      title: "Рис с курицей в одной сковороде",
      summary:
        "Сытный рис с куриным филе и морковью без отдельной кастрюли для гарнира.",
      servings: 2,
      minServings: 1,
      maxServings: 6,
      totalMinutes: 45,
      activeMinutes: 18,
      difficulty: "easy",
      ingredients: [
        { id: "chicken-fillet", name: "Куриное филе", amount: 300, unit: "г" },
        { id: "rice", name: "Длиннозёрный рис", amount: 140, unit: "г" },
        { id: "carrot", name: "Морковь", amount: 100, unit: "г" },
        { id: "onion", name: "Репчатый лук", amount: 80, unit: "г" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 20,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 3, unit: "г" },
        { id: "paprika", name: "Молотая паприка", amount: 2, unit: "г" },
        { id: "water", name: "Вода", amount: 330, unit: "мл" },
      ],
      appliances: ["pan"],
      tags: ["hearty", "cozy", "comfort"],
      steps: [
        {
          text: "Промойте рис. Нарежьте овощи небольшими кубиками, а курицу — кусочками около 2 см. После сырой курицы вымойте руки, нож и доску.",
          uses: ["chicken-fillet", "rice"],
        },
        {
          text: "Разогрейте масло в глубокой сковороде. Обжарьте курицу 5 минут, перемешивая, затем добавьте лук и морковь ещё на 4 минуты.",
          uses: ["chicken-fillet", "carrot", "onion", "vegetable-oil"],
        },
        {
          text: "Добавьте рис, паприку и соль. Влейте воду, доведите до кипения и перемешайте один раз.",
          uses: ["rice", "salt", "paprika", "water"],
        },
        {
          text: "Накройте крышкой, убавьте огонь до слабого и готовьте 18–20 минут. Ориентируйтесь также на время и пропорцию воды с упаковки риса.",
          timerSeconds: 1200,
          uses: ["rice", "water"],
        },
        {
          text: "Проверьте мягкость риса и готовность курицы: кухонный термометр в центре самого толстого кусочка должен показать не менее 74 °C. Если рис ещё плотный, добавьте немного горячей воды и готовьте ещё несколько минут. Снимите с огня и оставьте под крышкой на 5 минут.",
          uses: ["rice"],
        },
      ],
      tips: [
        "Нужна глубокая сковорода с плотно прилегающей крышкой.",
        "Пропорция воды зависит от сорта риса; при необходимости следуйте упаковке.",
        "Большая порция может готовиться дольше, чем две порции.",
      ],
      storageDays: 2,
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner"],
      mainIngredient: "chicken-fillet",
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      cookware: ["глубокая сковорода с плотной крышкой"],
      look: "Рис с кусочками курицы и морковью в глубокой сковороде",
      schema: 2,
    },
    {
      id: "chicken-sour-cream",
      title: "Курица в сметанном соусе",
      summary: "Мягкие кусочки курицы с луком и густым сметанным соусом.",
      servings: 2,
      minServings: 1,
      maxServings: 6,
      totalMinutes: 25,
      activeMinutes: 16,
      difficulty: "easy",
      ingredients: [
        { id: "chicken-fillet", name: "Куриное филе", amount: 350, unit: "г" },
        {
          id: "sour-cream",
          name: "Сметана 15–20%",
          amount: 120,
          unit: "г",
          swap: ["cream"],
        },
        { id: "onion", name: "Репчатый лук", amount: 100, unit: "г" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 15,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 3, unit: "г" },
        { id: "black-pepper", name: "Чёрный перец", amount: 0.5, unit: "г" },
        { id: "water", name: "Вода", amount: 100, unit: "мл" },
      ],
      appliances: ["pan"],
      tags: ["cozy", "comfort", "hearty"],
      steps: [
        {
          text: "Нарежьте лук тонкими полукольцами, курицу — небольшими кусочками около 2 см. После сырой курицы вымойте руки и рабочие принадлежности.",
          uses: ["chicken-fillet", "onion"],
        },
        {
          text: "Разогрейте масло. Обжаривайте лук 3 минуты, затем добавьте курицу и готовьте 6 минут на среднем огне, периодически перемешивая.",
          uses: ["chicken-fillet", "onion", "vegetable-oil"],
        },
        {
          text: "В миске перемешайте сметану с водой, солью и перцем. Убавьте огонь и влейте смесь в сковороду.",
          uses: ["sour-cream", "salt", "black-pepper", "water"],
        },
        {
          text: "Накройте крышкой и тушите на слабом огне 8–10 минут до полной готовности курицы; соус должен лишь слабо кипеть.",
          timerSeconds: 600,
        },
        {
          text: "Перемешайте и проверьте курицу кухонным термометром: в центре самого толстого кусочка должно быть не менее 74 °C. Разложите по тарелкам. Гарнир не входит в этот рецепт и готовится отдельно.",
          uses: ["chicken-fillet"],
        },
      ],
      tips: [
        "Не кипятите сметанный соус сильно: он может расслоиться.",
        "Время рассчитано на небольшие кусочки филе, а не на целую грудку.",
      ],
      storageDays: 2,
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner"],
      mainIngredient: "chicken-fillet",
      needsSide: !0,
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      look: "Кусочки курицы в светлом сметанном соусе на тарелке",
      schema: 2,
    },
    {
      id: "chicken-vegetable-pan",
      title: "Курица с овощами и соевым соусом",
      summary:
        "Быстро обжаренные полоски курицы со сладким перцем, морковью и лёгкой остротой.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 25,
      activeMinutes: 22,
      difficulty: "easy",
      ingredients: [
        { id: "chicken-fillet", name: "Куриное филе", amount: 300, unit: "г" },
        { id: "bell-pepper", name: "Болгарский перец", amount: 200, unit: "г" },
        { id: "carrot", name: "Морковь", amount: 120, unit: "г" },
        { id: "garlic", name: "Чеснок", amount: 2, unit: "зубчика" },
        { id: "soy-sauce", name: "Соевый соус", amount: 25, unit: "мл" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 20,
          unit: "мл",
        },
        { id: "chili", name: "Молотый перец чили", amount: 0.3, unit: "г" },
        { id: "water", name: "Вода", amount: 40, unit: "мл" },
      ],
      appliances: ["pan"],
      tags: ["light", "spicy", "fresh"],
      steps: [
        {
          text: "Нарежьте перец полосками, морковь тонкой соломкой, чеснок измельчите. Курицу нарежьте узкими полосками. После работы с сырой курицей вымойте руки и принадлежности.",
          uses: ["chicken-fillet", "bell-pepper", "carrot", "garlic"],
        },
        {
          text: "Разогрейте масло в широкой сковороде. Обжаривайте курицу 6–7 минут на среднем или чуть более сильном огне, регулярно перемешивая.",
          uses: ["chicken-fillet", "vegetable-oil"],
        },
        {
          text: "Добавьте морковь и сладкий перец. Готовьте ещё 5 минут, помешивая, затем вмешайте чеснок и чили.",
          uses: ["bell-pepper", "carrot", "garlic", "chili"],
        },
        {
          text: "Влейте соевый соус и воду. Накройте на 3–4 минуты, пока курица полностью не приготовится, а морковь не станет мягче.",
          timerSeconds: 240,
          uses: ["chicken-fillet", "carrot", "soy-sauce", "water"],
        },
        {
          text: "Перемешайте и проверьте курицу кухонным термометром: в центре самого толстого кусочка должно быть не менее 74 °C. Подавайте овощи с курицей как самостоятельное блюдо; рис или лапша не входят в состав.",
          uses: ["chicken-fillet"],
        },
      ],
      tips: [
        "Соевый соус уже солёный: дополнительная соль не нужна.",
        "Для четырёх порций обжаривайте курицу двумя партиями, если сковорода небольшая.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "main",
      meals: ["lunch", "dinner"],
      mainIngredient: "chicken-fillet",
      needsSide: !0,
      occasions: ["everyday"],
      budget: "low",
      cookware: ["широкая сковорода с крышкой"],
      look: "Полоски курицы с ярким болгарским перцем и морковью в соевом соусе на сковороде",
      schema: 2,
    },
    {
      id: "chicken-noodle-soup",
      title: "Куриный суп с вермишелью",
      summary:
        "Простой суп с кусочками куриного филе, картофелем и тонкой вермишелью.",
      servings: 2,
      minServings: 1,
      maxServings: 8,
      totalMinutes: 40,
      activeMinutes: 18,
      difficulty: "easy",
      ingredients: [
        { id: "chicken-fillet", name: "Куриное филе", amount: 220, unit: "г" },
        { id: "potato", name: "Картофель", amount: 200, unit: "г" },
        { id: "carrot", name: "Морковь", amount: 80, unit: "г" },
        { id: "onion", name: "Репчатый лук", amount: 60, unit: "г" },
        {
          id: "wheat-noodle",
          name: "Пшеничная вермишель",
          amount: 50,
          unit: "г",
        },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 10,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 4, unit: "г" },
        { id: "water", name: "Вода", amount: 1e3, unit: "мл" },
      ],
      appliances: ["pot"],
      tags: ["cozy", "comfort", "hearty"],
      steps: [
        {
          text: "Нарежьте картофель кубиками около 1,5 см, лук мелко, морковь тонкими ломтиками. Курицу нарежьте кусочками около 2 см, затем вымойте руки и принадлежности.",
          uses: ["chicken-fillet", "potato", "carrot", "onion"],
        },
        {
          text: "Разогрейте масло в кастрюле и готовьте лук с морковью 4 минуты. Влейте воду и доведите до кипения.",
          uses: ["carrot", "onion", "vegetable-oil", "water"],
        },
        {
          text: "Добавьте курицу, картофель и соль. После повторного закипания варите на слабом огне 15–18 минут до мягкости картофеля и полной готовности курицы.",
          timerSeconds: 1080,
          uses: ["chicken-fillet", "potato", "salt"],
        },
        {
          text: "Добавьте вермишель. Варите по времени на её упаковке, обычно 3–5 минут, помешивая, чтобы она не слиплась.",
          uses: ["wheat-noodle"],
        },
        {
          text: "Проверьте готовность вермишели и курицы: кухонный термометр в центре самого толстого кусочка должен показать не менее 74 °C. Снимите с огня и разлейте суп по тарелкам.",
        },
      ],
      tips: [
        "Выбирайте вермишель без яйца, если ориентируетесь на указанный состав аллергенов; проверяйте упаковку.",
        "Крупная лапша потребует другого времени варки.",
      ],
      storageDays: 3,
      cuisine: "international",
      editorialStatus: "draft",
      course: "soup",
      meals: ["lunch", "dinner"],
      mainIngredient: "chicken-fillet",
      season: ["autumn", "winter"],
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      yields: { amount: 1.3, unit: "л" },
      look: "Прозрачный куриный суп с вермишелью, картофелем и морковью в тарелке",
      schema: 2,
    },
    {
      id: "tuna-bean-salad",
      title: "Салат с тунцом и фасолью",
      summary:
        "Сытный салат без плиты: консервированный тунец, фасоль и свежие овощи.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 10,
      activeMinutes: 10,
      difficulty: "easy",
      ingredients: [
        {
          id: "canned-tuna",
          name: "Консервированный тунец в собственном соку без жидкости",
          amount: 160,
          unit: "г",
        },
        {
          id: "canned-beans",
          name: "Консервированная фасоль без жидкости",
          amount: 220,
          unit: "г",
          swap: ["canned-chickpea"],
        },
        { id: "cucumber", name: "Огурец", amount: 150, unit: "г" },
        { id: "tomato", name: "Свежие помидоры", amount: 150, unit: "г" },
        {
          id: "red-onion",
          name: "Красный лук",
          amount: 40,
          unit: "г",
          swap: ["onion", "green-onion"],
        },
        { id: "lemon-juice", name: "Лимонный сок", amount: 15, unit: "мл" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 15,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 1, unit: "г" },
      ],
      appliances: [],
      tags: ["quick", "fresh", "light", "hearty"],
      steps: [
        {
          text: "Слейте жидкость из тунца и фасоли. Разделите рыбу вилкой на небольшие кусочки.",
          uses: ["canned-tuna", "canned-beans"],
        },
        {
          text: "Вымойте овощи. Нарежьте огурец и помидоры небольшими кусочками, красный лук — очень тонкими полукольцами.",
          uses: ["cucumber", "tomato", "red-onion"],
        },
        {
          text: "В большой миске перемешайте лимонный сок, масло и соль. Добавьте фасоль и овощи, аккуратно смешайте.",
          uses: ["canned-beans", "lemon-juice", "vegetable-oil", "salt"],
        },
        {
          text: "Добавьте тунец, ещё раз осторожно перемешайте и сразу подавайте. Если консервы солёные, используйте меньше указанной соли.",
          uses: ["canned-tuna", "salt"],
        },
      ],
      tips: [
        "Вес тунца и фасоли указан после удаления жидкости.",
        "Храните готовый салат в холодильнике; не оставляйте надолго при комнатной температуре.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "salad",
      meals: ["lunch", "dinner", "snack"],
      mainIngredient: "canned-tuna",
      season: ["summer"],
      occasions: ["everyday", "picnic"],
      budget: "medium",
      look: "Салат из тунца, фасоли, огурцов, помидоров и красного лука в миске",
      schema: 2,
    },
    {
      id: "cucumber-tomato-salad",
      title: "Огурцы и помидоры со сметаной",
      summary: "Свежий домашний салат с зеленью и сметанной заправкой.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 10,
      activeMinutes: 10,
      difficulty: "easy",
      ingredients: [
        { id: "cucumber", name: "Огурец", amount: 250, unit: "г" },
        { id: "tomato", name: "Свежие помидоры", amount: 250, unit: "г" },
        {
          id: "sour-cream",
          name: "Сметана 15–20%",
          amount: 60,
          unit: "г",
          swap: ["plain-yogurt"],
        },
        { id: "dill", name: "Укроп", amount: 15, unit: "г", swap: ["parsley"] },
        { id: "green-onion", name: "Зелёный лук", amount: 20, unit: "г" },
        { id: "salt", name: "Соль", amount: 2, unit: "г" },
      ],
      appliances: [],
      tags: ["quick", "light", "fresh"],
      steps: [
        {
          text: "Вымойте огурцы, помидоры и зелень, обсушите их. У огурцов удалите кончики.",
          uses: ["cucumber", "tomato"],
        },
        {
          text: "Нарежьте огурцы полукружьями, помидоры — небольшими дольками. Мелко нарежьте укроп и зелёный лук.",
          uses: ["cucumber", "tomato", "dill", "green-onion"],
        },
        {
          text: "Переложите овощи и зелень в миску. Добавьте сметану и соль, аккуратно перемешайте.",
          uses: ["sour-cream", "salt"],
        },
        {
          text: "Подавайте сразу после заправки. Это лёгкий салат: для полноценного сытного ужина понадобится отдельное основное блюдо.",
        },
      ],
      tips: [
        "Если готовите заранее, храните овощи и заправку раздельно.",
        "После добавления соли овощи выделяют сок.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "salad",
      meals: ["lunch", "dinner"],
      mainIngredient: "cucumber",
      season: ["summer"],
      occasions: ["everyday", "picnic"],
      budget: "low",
      kids: !0,
      look: "Нарезанные огурцы и помидоры со сметаной и зеленью в салатнице",
      schema: 2,
    },
    {
      id: "cabbage-chickpea-salad",
      title: "Хрустящий салат с нутом",
      summary:
        "Капуста, морковь и готовый нут с лимонной заправкой: свежо и сытнее обычного овощного салата.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 15,
      activeMinutes: 15,
      difficulty: "easy",
      ingredients: [
        { id: "cabbage", name: "Белокочанная капуста", amount: 250, unit: "г" },
        { id: "carrot", name: "Морковь", amount: 100, unit: "г" },
        {
          id: "canned-chickpea",
          name: "Консервированный нут без жидкости",
          amount: 220,
          unit: "г",
          swap: ["canned-beans"],
        },
        {
          id: "parsley",
          name: "Петрушка",
          amount: 15,
          unit: "г",
          swap: ["dill"],
        },
        { id: "lemon-juice", name: "Лимонный сок", amount: 20, unit: "мл" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 20,
          unit: "мл",
        },
        { id: "salt", name: "Соль", amount: 3, unit: "г" },
      ],
      appliances: [],
      tags: ["quick", "fresh", "light", "hearty"],
      steps: [
        {
          text: "Тонко нашинкуйте капусту, морковь натрите крупно. Промойте и измельчите петрушку.",
          uses: ["cabbage", "carrot", "parsley"],
        },
        {
          text: "Переложите капусту в миску, добавьте половину соли. Помните руками 1–2 минуты, чтобы она стала немного мягче.",
          uses: ["cabbage", "salt"],
        },
        {
          text: "Слейте жидкость из нута. Добавьте нут, морковь и петрушку к капусте.",
          uses: ["cabbage", "carrot", "canned-chickpea", "parsley"],
        },
        {
          text: "Смешайте масло, лимонный сок и оставшуюся соль. Заправьте салат, перемешайте и подавайте.",
          uses: ["lemon-juice", "vegetable-oil", "salt"],
        },
      ],
      tips: [
        "Для этого времени нужен уже готовый консервированный нут.",
        "Жёсткую зимнюю капусту шинкуйте особенно тонко.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "salad",
      meals: ["lunch", "dinner", "snack"],
      mainIngredient: "cabbage",
      season: ["autumn", "winter"],
      occasions: ["everyday"],
      budget: "low",
      look: "Тонко нашинкованная капуста с морковью, нутом и петрушкой в миске",
      schema: 2,
    },
    {
      id: "cottage-cheese-pancakes",
      title: "Сырники со сметаной",
      summary: "Небольшие творожные сырники с умеренным количеством сахара.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 30,
      activeMinutes: 25,
      difficulty: "medium",
      ingredients: [
        { id: "cottage-cheese", name: "Творог 5–9%", amount: 300, unit: "г" },
        { id: "egg", name: "Яйцо", amount: 1, unit: "шт." },
        { id: "wheat-flour", name: "Пшеничная мука", amount: 55, unit: "г" },
        { id: "sugar", name: "Сахар", amount: 20, unit: "г" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 20,
          unit: "мл",
        },
        {
          id: "sour-cream",
          name: "Сметана 15–20%",
          amount: 60,
          unit: "г",
          swap: ["plain-yogurt"],
        },
        { id: "salt", name: "Соль", amount: 1, unit: "г" },
      ],
      appliances: ["pan"],
      tags: ["sweet", "comfort", "cozy"],
      steps: [
        {
          text: "Разомните творог вилкой. Добавьте яйцо, сахар, соль и 35 г муки. Перемешайте и оставьте на 5 минут.",
          uses: ["cottage-cheese", "egg", "wheat-flour", "sugar", "salt"],
        },
        {
          text: "Оставшиеся 20 г муки насыпьте на тарелку. Разделите массу на 6–8 небольших частей, сформируйте шайбы толщиной примерно 1,5 см и слегка обваляйте в муке.",
          uses: ["wheat-flour"],
        },
        {
          text: "Разогрейте масло в широкой сковороде. Выложите сырники с промежутками и жарьте 4–5 минут на умеренно слабом огне до золотистого низа.",
          uses: ["vegetable-oil"],
        },
        {
          text: "Переверните, накройте крышкой и готовьте ещё 5–6 минут. Сырники должны хорошо прогреться внутри, а не только подрумяниться снаружи.",
          timerSeconds: 360,
        },
        {
          text: "Разломите один сырник и проверьте, что внутри нет сырой жидкой массы. При необходимости прогрейте ещё. Подавайте со сметаной.",
          uses: ["sour-cream"],
        },
      ],
      tips: [
        "Очень влажный творог сначала отцедите; это дополнительная подготовка и время.",
        "При половинной порции взбейте яйцо и используйте половину по объёму; не округляйте автоматически до целого яйца.",
        "Четыре порции могут потребовать несколько заходов на сковороде.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "breakfast",
      meals: ["breakfast", "snack"],
      mainIngredient: "cottage-cheese",
      occasions: ["everyday"],
      budget: "medium",
      kids: !0,
      freezerDays: 60,
      yields: { amount: 7, unit: "шт." },
      cookware: ["широкая сковорода с крышкой"],
      look: "Румяные сырники стопкой на тарелке, рядом ложка сметаны",
      schema: 2,
    },
    {
      id: "apple-oatmeal",
      title: "Овсянка с яблоком и корицей",
      summary: "Тёплая молочная каша с кусочками яблока и мягкой сладостью.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 15,
      activeMinutes: 10,
      difficulty: "easy",
      ingredients: [
        {
          id: "oat-flakes",
          name: "Овсяные хлопья с варкой 5 минут",
          amount: 100,
          unit: "г",
        },
        { id: "milk", name: "Молоко", amount: 350, unit: "мл" },
        { id: "water", name: "Вода", amount: 150, unit: "мл" },
        { id: "apple", name: "Яблоко", amount: 180, unit: "г" },
        { id: "sugar", name: "Сахар", amount: 10, unit: "г" },
        { id: "cinnamon", name: "Молотая корица", amount: 1, unit: "г" },
        { id: "salt", name: "Соль", amount: 1, unit: "г" },
      ],
      appliances: ["pot"],
      tags: ["quick", "sweet", "cozy", "comfort"],
      steps: [
        {
          text: "Вымойте яблоко, удалите сердцевину и нарежьте небольшими кубиками около 1 см.",
          uses: ["apple"],
        },
        {
          text: "В кастрюле смешайте молоко, воду, яблоко, сахар и соль. На среднем огне доведите до слабого кипения, помешивая.",
          uses: ["milk", "water", "apple", "sugar", "salt"],
        },
        {
          text: "Всыпьте хлопья и корицу. Варите на слабом огне 5 минут или по инструкции на упаковке, часто помешивая, чтобы каша не прилипла.",
          timerSeconds: 300,
          uses: ["oat-flakes", "cinnamon"],
        },
        {
          text: "Снимите с огня, накройте и оставьте на 2 минуты. Размешайте и разложите по мискам. Для более жидкой каши добавьте немного горячей воды.",
        },
      ],
      tips: [
        "Для цельных хлопьев с долгой варкой общее время будет больше.",
        "Обычные овсяные хлопья могут содержать примеси глютена; при исключении глютена этот рецепт не предлагается.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      course: "breakfast",
      meals: ["breakfast"],
      mainIngredient: "oat-flakes",
      season: ["autumn", "winter"],
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      look: "Овсяная каша с кусочками яблока, посыпанная корицей, в миске",
      schema: 2,
    },
    {
      id: "banana-pancakes",
      title: "Банановые оладьи",
      summary: "Небольшие оладьи на спелом банане без добавленного сахара.",
      servings: 2,
      minServings: 1,
      maxServings: 4,
      totalMinutes: 25,
      activeMinutes: 22,
      difficulty: "easy",
      ingredients: [
        { id: "banana", name: "Банан без кожуры", amount: 180, unit: "г" },
        { id: "egg", name: "Яйца", amount: 2, unit: "шт." },
        { id: "wheat-flour", name: "Пшеничная мука", amount: 60, unit: "г" },
        { id: "water", name: "Вода", amount: 30, unit: "мл" },
        {
          id: "vegetable-oil",
          name: "Растительное масло",
          amount: 15,
          unit: "мл",
        },
        { id: "cinnamon", name: "Молотая корица", amount: 1, unit: "г" },
        { id: "salt", name: "Соль", amount: 0.5, unit: "г" },
      ],
      appliances: ["pan"],
      tags: ["sweet", "comfort"],
      steps: [
        {
          text: "Разомните спелый банан вилкой до пюре. Добавьте яйца, воду, корицу и соль, перемешайте.",
          uses: ["banana", "egg", "water", "cinnamon", "salt"],
        },
        {
          text: "Всыпьте муку и размешайте до густого теста без сухих участков. Оставьте на 3 минуты.",
          uses: ["wheat-flour"],
        },
        {
          text: "Разогрейте сковороду на умеренно слабом огне и смажьте частью масла. Выкладывайте по столовой ложке теста, оставляя промежутки.",
          uses: ["vegetable-oil"],
        },
        {
          text: "Жарьте каждую партию 2–3 минуты с первой стороны и около 2 минут со второй. Перед новой партией добавляйте немного оставшегося масла.",
          uses: ["vegetable-oil"],
        },
        {
          text: "Проверьте первый оладушек: середина должна схватиться и не оставаться жидкой. При необходимости уменьшите огонь и готовьте дольше. Подавайте тёплыми.",
        },
      ],
      tips: [
        "Небольшие оладьи легче переворачивать и равномернее готовить.",
        "Время включает несколько партий на сковороде; для четырёх порций оно увеличится.",
      ],
      cuisine: "international",
      editorialStatus: "draft",
      dish: "oladi",
      variant: "банановые",
      course: "breakfast",
      meals: ["breakfast", "snack"],
      mainIngredient: "banana",
      occasions: ["everyday"],
      budget: "low",
      kids: !0,
      look: "Небольшие румяные банановые оладьи на тарелке",
      schema: 2,
    },
  ],
};
var zp = {
    maxMinutes: null,
    servings: 2,
    mood: null,
    desired: [],
    available: [],
    absent: [],
    excluded: [],
    appliances: ["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"],
    strictPantry: !1,
    vegetarian: !1,
  },
  GE = {
    excluded: [],
    appliances: ["pan", "pot", "oven", "blender"],
    vegetarian: !1,
  },
  vS = ["cooked", "liked", "not_now", "too_hard", "dislike_ingredient"],
  Es = {
    favorites: [],
    recent: [],
    shopping: [],
    preferences: GE,
    cooking: null,
    conversation: [],
    conditions: zp,
    feedbackQueue: [],
    engaged: !1,
    installDismissed: !1,
    voiceUsed: !1,
    readAloud: !1,
    largeText: !1,
    onboarding: "new",
    menu: [],
    syncBase: null,
    taste: { liked: [], tooHard: [], notNow: [] },
    noticeOk: !1,
    book: [],
    notes: {},
    myRecipes: [],
    rewards: !0,
    seenBadges: [],
    reminders: { daily: null, weekly: !1 },
    today: { date: "", skip: [] },
    fridge: [],
    polls: [],
    voter: "",
    joined: [],
    menuPlan: { meals: ["dinner"], quickWeekdays: !0, cookAhead: !0 },
    tasteTest: { portrait: "", title: "", at: 0, dismissed: !1 },
  };
var kS = [
    "soup",
    "main",
    "side",
    "salad",
    "breakfast",
    "baking",
    "dessert",
    "snack",
    "sauce",
    "drink",
  ],
  xS = ["breakfast", "lunch", "dinner", "snack"],
  wS = ["winter", "spring", "summer", "autumn"],
  TS = [
    "everyday",
    "guests",
    "holiday",
    "new-year",
    "easter",
    "maslenitsa",
    "picnic",
    "kids-party",
    "date",
  ],
  SS = ["low", "medium", "high"];
var Pb = { low: "Бюджетно", medium: "Обычно", high: "Дороже обычного" };
var KE = [
    "meat",
    "poultry",
    "chicken",
    "fish",
    "seafood",
    "dairy",
    "eggs",
    "gluten",
    "soy",
    "nuts",
    "mushrooms",
    "legumes",
    "spicy",
  ],
  YE = [
    "cozy",
    "light",
    "hearty",
    "quick",
    "comfort",
    "fresh",
    "spicy",
    "sweet",
    "vegetarian",
  ],
  XE = ["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"],
  QE = [
    "russian",
    "ukrainian",
    "belarusian",
    "caucasian",
    "central-asian",
    "tatar",
    "international",
  ],
  FE = {
    dairy: "milk",
    eggs: "egg",
    gluten: "gluten",
    soy: "soy",
    nuts: "nuts",
    fish: "fish",
    seafood: "seafood",
  },
  JE = {
    зубчика: "зубчик",
    зубчиков: "зубчик",
    шт: "шт.",
    штук: "шт.",
    штуки: "шт.",
    "ст.л.": "ст. л.",
    "ч.л.": "ч. л.",
    гр: "г",
    "гр.": "г",
    "г.": "г",
    "мл.": "мл",
  },
  jb = (e) => JE[e.trim()] || e.trim(),
  wr = D.string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "латиница, цифры и дефисы")
    .max(60),
  $E = D.object({
    kcal: D.number().min(0).max(900),
    protein: D.number().min(0).max(100),
    fat: D.number().min(0).max(100),
    carbs: D.number().min(0).max(100),
  }),
  WE = D.object({
    id: wr,
    name: D.string().min(1).max(80),
    aliases: D.array(D.string().min(1).max(60)).max(25).default([]),
    groups: D.array(D.enum(KE)).default([]),
    per100g: $E,
    gramsPerUnit: D.record(
      D.string(),
      D.number().positive().max(2e3),
    ).optional(),
    aisle: D.enum([
      "veg",
      "meat",
      "fish",
      "dairy",
      "bread",
      "grocery",
      "canned",
      "spices",
      "frozen",
      "other",
    ]).optional(),
  }),
  AS = D.object({
    id: wr,
    title: D.string().min(3).max(90),
    summary: D.string().min(10).max(300),
    aliases: D.array(D.string().min(2).max(60)).max(10).optional(),
    servings: D.number().int().min(1).max(12),
    minServings: D.number().int().min(1).max(12),
    maxServings: D.number().int().min(1).max(12),
    totalMinutes: D.number().int().min(1).max(4320),
    activeMinutes: D.number().int().min(0).max(720),
    difficulty: D.enum(["easy", "medium", "hard"]),
    ingredients: D.array(
      D.object({
        id: wr,
        name: D.string().min(1).max(80),
        amount: D.number().positive().max(1e5),
        unit: D.string().min(1).max(20),
        optional: D.boolean().default(!1),
        swap: D.array(wr).max(4).optional(),
      }),
    )
      .min(1)
      .max(30),
    appliances: D.array(D.enum(XE)).default([]),
    tags: D.array(D.enum(YE)).default([]),
    steps: D.array(
      D.object({
        text: D.string().min(5).max(700),
        timerSeconds: D.number().int().min(10).max(86400).optional(),
        uses: D.array(wr).max(50).optional(),
      }),
    )
      .min(2)
      .max(25),
    tips: D.array(D.string().min(3).max(400)).max(8).default([]),
    storageDays: D.number().int().min(0).max(14).optional(),
    cuisine: D.enum(QE).optional(),
    dish: wr.optional(),
    variant: D.string().min(2).max(40).optional(),
    editorialStatus: D.enum(["draft", "checked", "cooked"]).default("draft"),
    course: D.enum(kS).optional(),
    meals: D.array(D.enum(xS)).max(4).optional(),
    mainIngredient: wr.optional(),
    needsSide: D.boolean().optional(),
    season: D.array(D.enum(wS)).max(4).optional(),
    occasions: D.array(D.enum(TS)).max(6).optional(),
    budget: D.enum(SS).optional(),
    kids: D.boolean().optional(),
    freezerDays: D.number().int().min(1).max(180).optional(),
    yields: D.object({
      amount: D.number().positive().max(1e3),
      unit: D.string().min(1).max(20),
    }).optional(),
    cookware: D.array(D.string().min(2).max(60)).max(6).optional(),
    look: D.string().min(10).max(240).optional(),
    sources: D.array(
      D.object({
        title: D.string().min(2).max(160),
        url: D.string().url().max(400).optional(),
      }),
    )
      .max(5)
      .optional(),
    schema: D.number().int().min(1).max(99).optional(),
  }),
  CS = {
    string: "текст",
    number: "число",
    boolean: "true/false",
    array: "список",
    object: "объект",
    undefined: "отсутствует",
  };
function Hb(e) {
  return e.issues
    .slice(0, 4)
    .map((t) => {
      let n = t.path.join(".") || "запись";
      switch (t.code) {
        case "invalid_type":
          return (
            n +
            ": " +
            (t.received === "undefined"
              ? "нет обязательного поля"
              : "ожидается " +
                (CS[t.expected] || t.expected) +
                ", а не " +
                (CS[t.received] || t.received))
          );
        case "invalid_enum_value":
          return (
            n +
            ": значение «" +
            String(t.received) +
            "» не из списка (" +
            t.options.join(", ") +
            ")"
          );
        case "too_small":
          return (
            n +
            ": слишком " +
            (t.type === "string"
              ? "короткий текст"
              : t.type === "array"
                ? "мало элементов"
                : "маленькое число") +
            " (минимум " +
            t.minimum +
            ")"
          );
        case "too_big":
          return (
            n +
            ": слишком " +
            (t.type === "string"
              ? "длинный текст"
              : t.type === "array"
                ? "много элементов"
                : "большое число") +
            " (максимум " +
            t.maximum +
            ")"
          );
        case "invalid_string":
          return n + ": " + t.message;
        case "unrecognized_keys":
          return n + ": лишние поля " + t.keys.join(", ");
        default:
          return n + ": " + t.message;
      }
    })
    .join("; ");
}
function Oa(e, t, n) {
  let a = jb(t);
  if (a === "г") return n;
  if (a === "кг") return n * 1e3;
  let i =
    e?.gramsPerUnit?.[a] ??
    (a === "мл"
      ? 1
      : a === "л" && e?.gramsPerUnit?.мл
        ? e.gramsPerUnit.мл * 1e3
        : void 0);
  return i === void 0 ? null : n * (a === "л" && !e?.gramsPerUnit?.л ? 1 : i);
}
var eD = (e) =>
    e && typeof e == "object" && !Array.isArray(e)
      ? Object.fromEntries(Object.entries(e).filter(([, t]) => t !== null))
      : e,
  tD = [
    "aliases",
    "course",
    "meals",
    "mainIngredient",
    "needsSide",
    "season",
    "occasions",
    "budget",
    "kids",
    "freezerDays",
    "yields",
    "cookware",
    "look",
    "sources",
    "schema",
    "cuisine",
    "variant",
    "storageDays",
  ];
function nD(e, t, n, a) {
  if (!e || typeof e != "object" || Array.isArray(e)) return e;
  let i = { ...e },
    s = AS.shape;
  for (let r of tD) {
    if (!(r in i)) continue;
    let o = s[r].safeParse(i[r]);
    o.success ||
      (a.push({
        file: t,
        item: n,
        message:
          Hb(
            new D.ZodError(
              o.error.issues.map((l) => ({ ...l, path: [r, ...l.path] })),
            ),
          ) + " — поле пропущено, рецепт показывается",
      }),
      delete i[r]);
  }
  return i;
}
function Vb(e) {
  let t = [],
    n = [],
    a = new Map(),
    i = new Map(),
    s = e.map((u) => ({ name: u.name, recipes: 0, ingredients: 0 })),
    r = e.map((u) => {
      if (u.error)
        return t.push({ file: u.name, item: "файл", message: u.error }), null;
      let f = u.data;
      return !f || typeof f != "object"
        ? (t.push({
            file: u.name,
            item: "файл",
            message: "нет объекта с полями ingredients и recipes",
          }),
          null)
        : {
            name: u.name,
            batch: typeof f.batch == "string" ? f.batch : u.name,
            ingredients: Array.isArray(f.ingredients) ? f.ingredients : [],
            recipes: Array.isArray(f.recipes) ? f.recipes : [],
          };
    });
  r.forEach((u, f) => {
    if (u)
      for (let p of u.ingredients) {
        let m = p?.id,
          y = WE.safeParse(p);
        if (!y.success) {
          t.push({
            file: u.name,
            item: "продукт " + String(m ?? "?"),
            message: Hb(y.error),
          });
          continue;
        }
        let S = a.get(y.data.id);
        // The same product described again in a later batch (same name and calories): nothing to report.
        if (S && S.info?.name === y.data.name && S.info?.per100g?.kcal === y.data.per100g.kcal) continue;
        if (S) {
          t.push({
            file: u.name,
            item: "продукт " + y.data.id,
            message:
              "такой id уже есть в файле " + S.file + " — второй пропущен",
          });
          continue;
        }
        let w = y.data.per100g,
          v = w.protein * 4 + w.fat * 9 + w.carbs * 4;
        w.kcal > 40 &&
          Math.abs(v - w.kcal) / w.kcal > 0.3 &&
          n.push({
            file: u.name,
            item: "продукт " + y.data.id,
            message:
              "калорийность " +
              w.kcal +
              " плохо сходится с БЖУ (≈" +
              Math.round(v) +
              ")",
          }),
          a.set(y.data.id, { info: y.data, file: u.name }),
          s[f].ingredients++;
      }
  });
  let o = new Map();
  for (let { info: u } of a.values())
    for (let f of [u.name, ...u.aliases].map((p) => p.toLowerCase())) {
      let p = o.get(f);
      p && p !== u.id
        ? n.push({
            file: a.get(u.id).file,
            item: "продукт " + u.id,
            message: "синоним «" + f + "» уже есть у " + p,
          })
        : o.set(f, u.id);
    }
  return (
    r.forEach((u, f) => {
      if (u)
        for (let p of u.recipes) {
          let m = p?.id,
            y = "рецепт " + String(m ?? "?"),
            S = AS.safeParse(nD(eD(p), u.name, y, n));
          if (!S.success) {
            t.push({ file: u.name, item: y, message: Hb(S.error) });
            continue;
          }
          let w = S.data,
            v = [];
          (w.minServings > w.servings || w.servings > w.maxServings) &&
            v.push("должно быть minServings ≤ servings ≤ maxServings"),
            w.activeMinutes > w.totalMinutes &&
              v.push("activeMinutes больше totalMinutes");
          let b = new Set();
          for (let C of w.ingredients) {
            let M = a.get(C.id)?.info;
            if (!M) {
              v.push("продукта «" + C.id + "» нет в списке ingredients");
              continue;
            }
            b.has(C.id) && v.push("продукт «" + C.id + "» указан дважды"),
              b.add(C.id),
              Oa(M, C.unit, 1) === null
                ? v.push(
                    "для «" +
                      C.id +
                      "» единица «" +
                      C.unit +
                      "» без gramsPerUnit",
                  )
                : jb(C.unit) === "мл" &&
                  !M.gramsPerUnit?.мл &&
                  n.push({
                    file: u.name,
                    item: y,
                    message:
                      "для «" +
                      C.id +
                      "» в мл нет плотности, считаю 1 г = 1 мл",
                  });
          }
          if (v.length) {
            t.push({ file: u.name, item: y, message: v.join("; ") });
            continue;
          }
          let g = new Set(w.ingredients.map((C) => C.id));
          w.mainIngredient &&
            !g.has(w.mainIngredient) &&
            (n.push({
              file: u.name,
              item: y,
              message:
                "mainIngredient «" +
                w.mainIngredient +
                "» нет в составе — поле пропущено",
            }),
            delete w.mainIngredient);
          for (let C of w.ingredients)
            if (C.swap) {
              let M = C.swap.filter((Z) => !a.has(Z) || Z === C.id);
              M.length &&
                n.push({
                  file: u.name,
                  item: y,
                  message:
                    "замена для «" +
                    C.id +
                    "»: нет продукта " +
                    M.join(", ") +
                    " — пропущено",
                }),
                (C.swap = C.swap.filter((Z) => !M.includes(Z))),
                C.swap.length || delete C.swap;
            }
          for (let [C, M] of w.steps.entries())
            if (M.uses) {
              let Z = M.uses.filter((V) => !g.has(V));
              Z.length &&
                n.push({
                  file: u.name,
                  item: y,
                  message:
                    "шаг " +
                    (C + 1) +
                    ": в составе нет " +
                    Z.join(", ") +
                    " — пропущено",
                }),
                (M.uses = [...new Set(M.uses.filter((V) => g.has(V)))]),
                M.uses.length > 15
                  ? (n.push({
                      file: u.name,
                      item: y,
                      message:
                        "шаг " +
                        (C + 1) +
                        ": в uses " +
                        M.uses.length +
                        " продуктов (больше 15) — подсказка к шагу пропущена",
                    }),
                    delete M.uses)
                  : M.uses.length || delete M.uses;
            }
          let x = i.get(w.id);
          if (x) {
            t.push({
              file: u.name,
              item: y,
              message:
                "такой id уже есть в файле " + x.file + " — второй пропущен",
            });
            continue;
          }
          let N = new Set(
              w.ingredients.flatMap((C) => a.get(C.id).info.groups),
            ),
            _ = [...new Set([...N].map((C) => FE[C]).filter(Boolean))].sort(),
            B = !["meat", "poultry", "chicken", "fish", "seafood"].some((C) =>
              N.has(C),
            ),
            R = [
              ...new Set([
                ...w.tags.filter((C) => C !== "vegetarian"),
                ...(B ? ["vegetarian"] : []),
              ]),
            ];
          w.tags.includes("vegetarian") &&
            !B &&
            n.push({
              file: u.name,
              item: y,
              message: "тег vegetarian снят: в составе мясо или рыба",
            });
          let T = {
            ...w,
            tags: R,
            allergens: _,
            ingredients: w.ingredients.map((C) => ({ ...C, unit: jb(C.unit) })),
            version: u.batch,
          };
          w.steps.length < 3 &&
            n.push({
              file: u.name,
              item: y,
              message:
                "всего " +
                w.steps.length +
                " шага — проверьте, не пропущено ли что-то",
            }),
            i.set(w.id, { recipe: T, file: u.name }),
            s[f].recipes++;
        }
    }),
    {
      // tidy.ts: timers from the text, plain words instead of degrees, frying oil, «Детям» (files stay as they are).
      recipes: [...i.values()].map((u) => tidyRecipe(u.recipe)),
      ingredients: [...a.values()].map((u) => u.info),
      errors: t,
      warnings: n,
      files: s,
    }
  );
}
var F = [],
  za = [],
  bt = 0,
  qb = new Map();
function me(e) {
  return qb.get(e);
}
function Za() {
  return [...qb.values()];
}
function Gb(e) {
  (F = e.recipes),
    (qb = new Map(e.ingredients.map((t) => [t.id, t]))),
    (za = e.ingredients
      .filter((t) => F.some((n) => n.ingredients.some((a) => a.id === t.id)))
      .map((t) => ({ id: t.id, name: t.name }))
      .sort((t, n) => t.name.localeCompare(n.name, "ru"))),
    bt++;
}
var Kb = Vb([{ name: "01-base.json", data: bS }]);
Gb(Kb);
var Qa = {
  schemaVersion: 2,
  groupAliases: {
    meat: ["мясо", "мясное", "без мяса"],
    poultry: ["птица", "мясо птицы"],
    chicken: ["курица", "куриное мясо"],
    fish: ["рыба", "рыбное"],
    seafood: ["морепродукты"],
    dairy: [
      "молочные продукты",
      "молочка",
      "молочное",
      "без молочного",
      "без молочки",
    ],
    eggs: ["яйца", "яйцо", "без яиц"],
    gluten: ["глютен", "без глютена", "безглютеновое"],
    soy: ["соя", "соевые продукты"],
    nuts: ["орехи", "арахис"],
    mushrooms: ["грибы", "грибное"],
    legumes: ["бобовые", "бобовые продукты"],
    spicy: ["острое", "острые блюда", "без острого"],
  },
  dietGroups: {
    vegetarian: ["meat", "poultry", "fish", "seafood"],
    vegan: ["meat", "poultry", "fish", "seafood", "dairy", "eggs"],
  },
  ambiguousAliases: {
    масло: ["vegetable-oil", "butter"],
    перец: ["bell-pepper", "black-pepper", "chili"],
    лук: ["onion", "red-onion", "green-onion"],
    нут: ["dry-chickpea", "canned-chickpea", "cooked-chickpea"],
    фасоль: ["dry-beans", "canned-beans", "cooked-beans"],
    курица: ["chicken-fillet", "chicken-unspecified"],
    тунец: ["canned-tuna", "tuna-unspecified"],
    овсянка: ["oat-flakes"],
    помидоры: ["tomato", "canned-tomato"],
    томаты: ["tomato", "canned-tomato"],
    помидор: ["tomato", "canned-tomato"],
    томат: ["tomato", "canned-tomato"],
    рис: ["rice", "cooked-rice"],
    сыр: ["hard-cheese", "processed-cheese"],
    горбуша: ["pink-salmon-fillet", "canned-pink-salmon"],
    фарш: ["minced-pork-beef", "minced-beef"],
  },
  notes: [
    "Не считать сырой рис эквивалентом готового: время варки не включено в быстрый рецепт жареного риса.",
    "Не считать сухие бобовые эквивалентом консервированных; форму нужно уточнить для строгого подбора только из того, что дома.",
    "Не приравнивать свежие помидоры к консервированным без отдельной редакционно проверенной замены.",
    "Свежий и замороженный шпинат имеют разное время подготовки.",
    "Лимон сам по себе не тождественен точному объёму сока; можно отдельно уточнить или добавить проверенный выход сока.",
    "Не добавлять соль, воду или масло в домашние запасы автоматически.",
    "Метки аллергенов основаны на типовом составе ингредиентов; конкретную упаковку нужно проверить. У обычных соевого соуса, макарон и овсяных хлопьев глютен учитывается консервативно.",
    "Для слова «курица» как предпочтения допустим поиск куриных блюд; для наличия в строгом режиме форму и часть туши следует уточнить.",
    "Словарь не является медицинской базой и не гарантирует отсутствие следов аллергенов на производстве.",
  ],
  families: {
    tomatoes: { label: "помидоры", ids: ["tomato", "canned-tomato"] },
    beans: {
      label: "фасоль",
      ids: ["dry-beans", "canned-beans", "cooked-beans"],
    },
    chickpeas: {
      label: "нут",
      ids: ["dry-chickpea", "canned-chickpea", "cooked-chickpea"],
    },
    tuna: { label: "тунец", ids: ["canned-tuna", "tuna-unspecified"] },
    onions: { label: "лук", ids: ["onion", "red-onion", "green-onion"] },
    "pink-salmon": {
      label: "горбуша",
      ids: ["pink-salmon-fillet", "canned-pink-salmon"],
    },
    cheese: { label: "сыр", ids: ["hard-cheese", "processed-cheese"] },
    "rice-any": { label: "рис", ids: ["rice", "cooked-rice"] },
    mince: { label: "фарш", ids: ["minced-pork-beef", "minced-beef"] },
  },
};
var Oe = {
    poultry: "Птица",
    chicken: "Курица",
    seafood: "Морепродукты",
    mushrooms: "Грибы",
    legumes: "Бобовые",
    dairy: "Молочное",
    eggs: "Яйца",
    cozy: "Уютное",
    light: "Лёгкое",
    hearty: "Сытное",
    quick: "Побыстрее",
    comfort: "Простое",
    fresh: "Свежее",
    spicy: "Острое",
    sweet: "Сладкое",
    vegetarian: "Без мяса",
    pan: "Сковорода",
    pot: "Кастрюля",
    oven: "Духовка",
    blender: "Блендер",
    multicooker: "Мультиварка",
    airfryer: "Аэрогриль",
    microwave: "Микроволновка",
    milk: "Молочное",
    egg: "Яйца",
    gluten: "Глютен",
    nuts: "Орехи",
    fish: "Рыба",
    soy: "Соя",
    meat: "Мясо",
  },
  Sr = Qa.families || {};
for (let [e, t] of Object.entries(Sr))
  Oe[e] = t.label.charAt(0).toUpperCase() + t.label.slice(1);
function _e(e) {
  return e.toLowerCase().replace(/ё/g, "е");
}
var iD = [
  "ями",
  "ами",
  "ого",
  "его",
  "ому",
  "ему",
  "ыми",
  "ими",
  "ых",
  "их",
  "ах",
  "ях",
  "ов",
  "ев",
  "ей",
  "ой",
  "ий",
  "ый",
  "ая",
  "яя",
  "ое",
  "ее",
  "ые",
  "ие",
  "ам",
  "ям",
  "ом",
  "ем",
  "ую",
  "юю",
  "а",
  "я",
  "о",
  "е",
  "ы",
  "и",
  "у",
  "ю",
  "ь",
  "й",
];
function Xe(e) {
  for (let t of iD)
    if (e.length - t.length >= 3 && e.endsWith(t)) return e.slice(0, -t.length);
  return e;
}
function pt(e) {
  return _e(e)
    .replace(/[^a-zа-я0-9\s,.;:!?-]/g, " ")
    .replace(/-/g, " ")
    .replace(/([,.;:!?])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
}
function sD(e, t, n = 2) {
  if (Math.abs(e.length - t.length) > n) return n + 1;
  let a = Array.from({ length: e.length + 1 }, (i, s) => [
    s,
    ...Array(t.length).fill(0),
  ]);
  for (let i = 1; i <= t.length; i++) a[0][i] = i;
  for (let i = 1; i <= e.length; i++) {
    let s = 1 / 0;
    for (let r = 1; r <= t.length; r++) {
      let o = e[i - 1] === t[r - 1] ? 0 : 1;
      (a[i][r] = Math.min(
        a[i - 1][r] + 1,
        a[i][r - 1] + 1,
        a[i - 1][r - 1] + o,
      )),
        i > 1 &&
          r > 1 &&
          e[i - 1] === t[r - 2] &&
          e[i - 2] === t[r - 1] &&
          (a[i][r] = Math.min(a[i][r], a[i - 2][r - 2] + 1)),
        (s = Math.min(s, a[i][r]));
    }
    if (s > n) return n + 1;
  }
  return a[e.length][t.length];
}
var RS = new Set("аеиоуыэюя".split("")),
  rD = new Set([
    "пост",
    "гост",
    "гостей",
    "праздник",
    "пп",
    "диет",
    "ребенк",
    "ребенок",
    "грустн",
    "холодн",
    "жарк",
    "хоч",
    "хочу",
    "хочетс",
    "хотел",
    "можн",
    "нужн",
    "сегодн",
    "вечер",
    "завтр",
    "сдела",
    "пригот",
    "приготов",
    "давай",
    "прост",
    "прост",
    "быстр",
    "вкусн",
    "нибуд",
    "устал",
    "дом",
    "дома",
    "есть",
    "нет",
    "без",
    "что",
    "чтоб",
    "тольк",
    "очен",
    "много",
    "немног",
    "сейчас",
    "потом",
    "после",
    "перед",
    "утр",
    "обед",
    "ужин",
    "ужина",
    "завтрак",
    "плох",
    "хорош",
    "ладн",
    "пожалуйст",
    "спасиб",
    "поесть",
    "покуш",
    "кушат",
    "кушать",
    "съест",
    "лень",
    "сил",
    "врем",
    "минут",
    "час",
    "порци",
    "порц",
    "человек",
    "челов",
    "нужн",
    "мне",
  ]);
function Fa(e, t) {
  if (e === t) return !0;
  let n = Math.min(e.length, t.length);
  if (n < 4 || rD.has(e) || (e[0] !== t[0] && n < 6)) return !1;
  if (n === 4) {
    if (e.length !== t.length) return !1;
    let a = 0;
    for (let i = 0; i < 4; i++)
      if (e[i] !== t[i]) {
        if (!RS.has(e[i]) || !RS.has(t[i])) return !1;
        a++;
      }
    return a === 1;
  }
  return sD(e, t, n <= 7 ? 1 : 2) <= (n <= 7 ? 1 : 2);
}
function cu(e) {
  let t = e.split(/\s+/).filter(Boolean);
  for (let n = Math.min(8, Math.floor(t.length / 2)); n >= 1; n--) {
    let a = [];
    for (let i = 0; i < t.length; ) {
      let s = t
        .slice(i, i + n)
        .join(" ")
        .toLowerCase();
      for (
        a.push(...t.slice(i, i + n)), i += n;
        i + n <= t.length &&
        t
          .slice(i, i + n)
          .join(" ")
          .toLowerCase() === s;

      )
        i += n;
    }
    t = a;
  }
  return t.join(" ");
}
function Yb(e) {
  let t = [];
  for (let n of e) {
    let a = n.trim();
    if (!a) continue;
    let i = t[t.length - 1],
      s = i?.toLowerCase(),
      r = a.toLowerCase();
    if (i === void 0) t.push(a);
    else if (r.startsWith(s)) t[t.length - 1] = a;
    else {
      if (s.endsWith(r) || s === r) continue;
      t.push(a);
    }
  }
  return Xb(cu(t.join(" ")));
}
function Xb(e) {
  let t = e.split(/\s+/).filter(Boolean);
  if (t.length < 4) return e;
  let n = t[0].toLowerCase(),
    a = t.map((r, o) => (r.toLowerCase() === n ? o : -1)).filter((r) => r >= 0);
  if (a.length < 2) return e;
  let i = a.map((r, o) => t.slice(r, a[o + 1] ?? t.length)),
    s = (r) => r.join(" ").toLowerCase();
  for (let r = 0; r < i.length - 1; r++)
    if (!i.slice(r + 1).some((o) => (s(o) + " ").startsWith(s(i[r]) + " ")))
      return e;
  return i[i.length - 1].join(" ");
}
var NS = /[жшчщц]$/,
  MS = {
    картофель: "картофелем",
    щавель: "щавелем",
    миндаль: "миндалем",
    имбирь: "имбирём",
    фарш: "фаршем",
    пельмени: "пельменями",
    яйца: "яйцами",
    яйцо: "яйцом",
    филе: "филе",
    кабачок: "кабачком",
    кабачки: "кабачками",
    тунец: "тунцом",
    перец: "перцем",
    огурец: "огурцом",
    горошек: "горошком",
    чеснок: "чесноком",
    творожок: "творожком",
    лавровый: "лавровым",
    кофе: "кофе",
    какао: "какао",
    пюре: "пюре",
    соус: "соусом",
    масло: "маслом",
    мясо: "мясом",
    курица: "курицей",
    кетчуп: "кетчупом",
    майонез: "майонезом",
    дрожжи: "дрожжами",
    сельдь: "сельдью",
    селедка: "селёдкой",
    селёдка: "селёдкой",
    мед: "мёдом",
  };
function ES(e) {
  if (MS[e]) return MS[e];
  if (/ок$/.test(e) && e.length > 4) return e.slice(0, -2) + "ком";
  if (/[ыи]$/.test(e)) {
    let t = e.slice(0, -1);
    return t + (/[кгхжшчщц]$/.test(t) || e.endsWith("ы") ? "ами" : "ями");
  }
  if (e.endsWith("а")) {
    let t = e.slice(0, -1);
    return t + (NS.test(t) ? "ей" : "ой");
  }
  return e.endsWith("я")
    ? e.slice(0, -1) + "ей"
    : e.endsWith("о")
      ? e.slice(0, -1) + "ом"
      : e.endsWith("е")
        ? e.slice(0, -1) + "ем"
        : e.endsWith("ь")
          ? e + "ю"
          : e.endsWith("й")
            ? e.slice(0, -1) + "ем"
            : e + (NS.test(e) ? "ем" : "ом");
}
function oD(e) {
  let t = [
    [/ые$/, "ыми"],
    [/ие$/, "ими"],
    [/ый$/, "ым"],
    [/ой$/, "ым"],
    [/ий$/, "им"],
    [/ая$/, "ой"],
    [/яя$/, "ей"],
    [/ое$/, "ым"],
    [/ее$/, "им"],
  ];
  for (let [n, a] of t) if (n.test(e)) return e.replace(n, a);
  return e;
}
function aa(e) {
  let t = e.split(" ");
  if (t.length === 1) return /^[а-яё]+$/.test(t[0]) ? ES(t[0]) : t[0];
  let n = t.findIndex((s, r) => r > 0 && /^(в|на|с|из|без|для|по)$/.test(s)),
    a = n > 0 ? t.slice(0, n) : t,
    i = n > 0 ? t.slice(n) : [];
  return [...a.map((s, r) => (r === a.length - 1 ? ES(s) : oD(s))), ...i].join(
    " ",
  );
}
function _i(e) {
  return e.length < 2
    ? e.join("")
    : e.slice(0, -1).join(", ") + " и " + e[e.length - 1];
}
function Cr(e) {
  return e.replace(
    /(^|[\s(«])([Сс]) (?=[сзшжщСЗШЖЩ][бвгджзклмнпрстфхцчшщ]|[Мм]н|[Вв]с|[Лл]ьд)/g,
    (t, n, a) => n + (a === "С" ? "Со" : "со") + " ",
  );
}
var Oi = [
  {
    key: "soup",
    label: "Суп",
    title: [
      "суп",
      "борщ",
      "щи",
      "солянк",
      "рассольник",
      "уха",
      "уху",
      "харчо",
      "окрошк",
      "лагман",
      "похлебк",
      "свекольник",
      "шурп",
    ],
    words: ["суп", "супчик", "супец", "похлебк", "бульон", "первое", "перво"],
  },
  {
    key: "salad",
    label: "Салат",
    title: ["салат", "винегрет", "оливье", "шуб", "мимоз"],
    words: ["салат", "салатик"],
  },
  {
    key: "omelette",
    label: "Омлет или яичница",
    title: ["омлет", "яичниц"],
    words: ["омлет", "яичниц"],
  },
  {
    key: "pancakes",
    label: "Блины и оладьи",
    title: ["оладь", "блин", "панкейк"],
    words: [
      "оладь",
      "оладуш",
      "оладушк",
      "панкейк",
      "блин",
      "блинчик",
      "блинч",
    ],
  },
  { key: "syrniki", label: "Сырники", title: ["сырник"], words: ["сырник"] },
  {
    key: "breakfast",
    label: "Завтрак",
    title: [
      "омлет",
      "яичниц",
      "оладь",
      "блин",
      "панкейк",
      "сырник",
      "овсянк",
      "каш",
      "гренк",
      "тост",
      "бутерброд",
      "творожн",
      "мюсли",
      "гранол",
      "смузи",
      "драник",
    ],
    words: ["завтрак", "позавтрак"],
  },
  {
    key: "porridge",
    label: "Каша",
    title: ["овсянк", "каш"],
    words: ["каш", "кашк", "овсянк", "овсяночк"],
  },
  {
    key: "baking",
    label: "Выпечка",
    title: [
      "пирог",
      "пирожк",
      "шарлотк",
      "кекс",
      "манник",
      "печенье",
      "ватрушк",
      "булочк",
      "маффин",
      "торт",
      "зебр",
    ],
    words: [
      "выпечк",
      "пирог",
      "пирожк",
      "пирожок",
      "пирожки",
      "пирожн",
      "кекс",
      "торт",
      "печенье",
      "печень",
      "булочк",
    ],
  },
];
for (let e of Oi) Oe["dish:" + e.key] = e.label;
var DS = new Set([
    "овощн",
    "овощ",
    "овощей",
    "овощами",
    "с",
    "со",
    "и",
    "в",
    "во",
    "на",
    "по",
    "из",
    "под",
    "для",
    "к",
    "без",
    "от",
    "до",
    "за",
    "а",
    "или",
    "как",
    "по-домашнему",
    "домашн",
    "классическ",
    "прост",
    "прост",
    "быстр",
    "легк",
    "вкусн",
    "сытн",
    "тепл",
    "свеж",
    "нежн",
    "пышн",
    "хрустящ",
    "ароматн",
    "сочн",
    "пикантн",
    "пряном",
    "прян",
    "сливочн",
    "густ",
    "мягк",
    "горяч",
    "холодн",
    "летн",
    "зимн",
    "маминых",
    "бабушкин",
    "день",
    "дня",
    "минут",
    "скорую",
    "руку",
    "одной",
    "одном",
    "сковород",
    "кастрюл",
    "духовк",
    "духовке",
    "мультиварк",
    "микроволновк",
  ]),
  lD =
    /(ый|ий|ой|ая|яя|ое|ее|ые|ие|ого|его|ому|ему|ым|им|ыми|ими|ых|их|ую|юю|ном|нем|ском|ской|ским)$/,
  cD = new Set([
    "щи",
    "плов",
    "борщ",
    "суп",
    "уха",
    "харчо",
    "лагман",
    "оливье",
    "рагу",
    "лобио",
    "чахохбили",
    "пюре",
    "сырники",
    "блины",
    "оладьи",
    "котлеты",
    "тефтели",
    "голубцы",
    "пельмени",
    "вареники",
    "драники",
    "запеканка",
    "шарлотка",
    "манник",
    "хачапури",
    "шаурма",
    "окрошка",
    "солянка",
    "рассольник",
    "винегрет",
    "гуляш",
    "бефстроганов",
    "азу",
    "жаркое",
    "омлет",
    "яичница",
    "каша",
    "овсянка",
  ]),
  Zp = null;
function uD() {
  let e = new Set(),
    t = [
      ...Za().flatMap((n) => [n.name, ...n.aliases]),
      ...Object.values(Qa.groupAliases).flat(),
    ];
  for (let n of t) for (let a of pt(n)) e.add(Xe(a));
  return e;
}
function uu(e) {
  return pt(e).filter((t) => !/^[,.;:!?]$/.test(t));
}
function $o() {
  var s;
  if (Zp?.version === bt) return Zp;
  let e = [],
    t = new Map(),
    n = uD(),
    a = new Set();
  for (let r of Oi)
    for (let o of r.words)
      e.push({ key: "dish:" + r.key, words: [o], label: r.label });
  let i = new Set(Oi.flatMap((r) => r.words));
  for (let r of F) {
    let o = new Set();
    for (let l of uu(r.title)) {
      let u = Xe(l);
      o.add(u);
      let f = cD.has(l);
      (!f && (DS.has(l) || DS.has(u) || l.length < 3 || lD.test(l))) ||
        (!f && (n.has(u) || [...n].some((p) => p.length >= 5 && Fa(u, p)))) ||
        i.has(u) ||
        a.has(u) ||
        (a.add(u),
        e.push({ key: "dish:" + u, words: [u], label: l }),
        (Oe["dish:" + u] = l));
    }
    {
      let l = uu(r.title).map(Xe);
      l.length >= 2 &&
        (e.push({ key: "dish:r:" + r.id, words: l, label: _e(r.title) }),
        (Oe["dish:r:" + r.id] = _e(r.title)));
    }
    for (let l of r.aliases || []) {
      let u = uu(l).map(Xe);
      if (!u.length) continue;
      let f = "dish:r:" + r.id;
      e.push({ key: f, words: u, label: _e(l) }), (s = Oe)[f] ?? (s[f] = _e(l));
      for (let p of u) o.add(p);
    }
    t.set(r.id, o);
  }
  return (
    e.sort((r, o) => o.words.length - r.words.length),
    (Zp = { version: bt, entries: e, titleStems: t }),
    Zp
  );
}
Oe["dish:oven"] = "В духовке";
Oe["dish:multicooker"] = "В мультиварке";
Oe["dish:airfryer"] = "В аэрогриле";
Oe["dish:microwave"] = "В микроволновке";
Oe["dish:freezer"] = "Можно заморозить";
function Ds(e) {
  return $o(), Oe[e] || e.replace(/^dish:(r:)?/, "").replace(/-/g, " ");
}
function nt(e, t) {
  let n = t.slice(5);
  if (n === "oven" || n === "multicooker" || n === "airfryer" || n === "microwave") return !!e.appliances?.includes(n);
  if (n === "freezer") return !!e.freezerDays;
  let a = Oi.find((s) => s.key === n);
  return a
    ? uu(e.title).some((r) => a.title.some((o) => r.startsWith(o)))
    : n.startsWith("r:")
      ? e.id === n.slice(2)
      : ($o().titleStems.get(e.id) ?? new Set(uu(e.title).map(Xe))).has(n);
}
function Ne(e) {
  return e.course
    ? e.course
    : nt(e, "dish:soup")
      ? "soup"
      : nt(e, "dish:salad")
        ? "salad"
        : nt(e, "dish:baking")
          ? "baking"
          : nt(e, "dish:breakfast")
            ? "breakfast"
            : e.tags.includes("sweet")
              ? "dessert"
              : "main";
}
var dD =
    /^(water|salt|black-pepper|pepper|vegetable-oil|sunflower-oil|olive-oil|sugar|bay-leaf|onion|garlic|dill|parsley|green-onion|greens|herbs)$/,
  _S = (e) => dD.test(e);
function zi(e) {
  if (e.mainIngredient) return e.mainIngredient;
  let t,
    n = -1;
  for (let a of e.ingredients) {
    if (a.optional || _S(a.id)) continue;
    let i = Oa(me(a.id), a.unit, a.amount) ?? a.amount;
    i > n && ((n = i), (t = a.id));
  }
  return t;
}
var Qb = (e) =>
  e.ingredients.filter((t) => !t.optional && !_S(t.id)).map((t) => t.id);
function Zt(e) {
  if (e.meals?.length) return e.meals;
  switch (Ne(e)) {
    case "breakfast":
      return ["breakfast"];
    case "soup":
      return ["lunch", "dinner"];
    case "baking":
    case "dessert":
    case "snack":
    case "drink":
      return ["snack"];
    default:
      return ["lunch", "dinner"];
  }
}
var fD = ["meat", "poultry", "chicken", "fish", "seafood", "dairy", "eggs"];
function Ar(e) {
  return e.ingredients
    .filter((t) => !t.optional)
    .every((t) => !(me(t.id)?.groups || []).some((n) => fD.includes(n)));
}
function Up(e, t) {
  if (!e.yields) return "";
  let n = (e.yields.amount * t) / e.servings;
  return (
    "≈ " +
    (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10)
      .toString()
      .replace(".", ",") +
    " " +
    e.yields.unit
  );
}
function mn(e) {
  if (e < 60) return e + " мин";
  if (e < 1440) {
    let t = Math.floor(e / 60),
      n = e % 60;
    return t + " ч" + (n ? " " + n + " мин" : "");
  }
  return Math.round(e / 60) + " ч";
}
function Ip(e) {
  return Oa(me(e.id), e.unit, e.amount);
}
var OS = new Map();
function Yt(e) {
  let t = bt + "|" + e.id + "|" + e.version,
    n = OS.get(t);
  if (n) return n;
  let a = { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    i = !0;
  for (let o of e.ingredients) {
    if (o.optional) continue;
    let l = me(o.id)?.per100g,
      u = Ip(o);
    if (!l || u === null) {
      i = !1;
      continue;
    }
    // absorbed: oil for deep frying — only the part the food takes in (tidy.ts).
    for (let f of ["kcal", "protein", "fat", "carbs"]) a[f] += (l[f] * u * (o.absorbed ?? 1)) / 100;
  }
  let s = Math.max(1, e.servings),
    r = {
      perServing: {
        kcal: Math.round(a.kcal / s),
        protein: Math.round(a.protein / s),
        fat: Math.round(a.fat / s),
        carbs: Math.round(a.carbs / s),
      },
      complete: i,
    };
  return OS.set(t, r), r;
}
var pD = [
    ["зубчик", "зубчика", "зубчиков"],
    ["щепотка", "щепотки", "щепоток"],
    ["пучок", "пучка", "пучков"],
    ["стакан", "стакана", "стаканов"],
    ["ломтик", "ломтика", "ломтиков"],
    ["веточка", "веточки", "веточек"],
    ["лист", "листа", "листов"],
    ["банка", "банки", "банок"],
    ["пачка", "пачки", "пачек"],
    ["упаковка", "упаковки", "упаковок"],
    ["головка", "головки", "головок"],
    ["кочан", "кочана", "кочанов"],
    ["кусок", "куска", "кусков"],
    ["кусочек", "кусочка", "кусочков"],
    ["стебель", "стебля", "стеблей"],
    ["горсть", "горсти", "горстей"],
    ["бутылка", "бутылки", "бутылок"],
    ["пакет", "пакета", "пакетов"],
    ["яйцо", "яйца", "яиц"],
    ["штука", "штуки", "штук"],
  ],
  zS = new Map();
for (let e of pD) for (let t of e) zS.set(t, e);
function Fb(e) {
  return e >= 100
    ? Math.round(e / 5) * 5
    : e >= 10
      ? Math.round(e)
      : e >= 1
        ? Math.round(e * 10) / 10
        : Math.round(e * 100) / 100;
}
function Jb(e, t, n, a) {
  if (!Number.isInteger(e)) return n;
  let i = e % 10,
    s = e % 100;
  return i === 1 && s !== 11
    ? t
    : i >= 2 && i <= 4 && (s < 12 || s > 14)
      ? n
      : a;
}
function ZS(e, t) {
  let n = zS.get(t.trim().toLowerCase());
  return n ? Jb(Fb(e), ...n) : t;
}
var Wo = [
    { key: "veg", label: "Овощи, фрукты, зелень" },
    { key: "meat", label: "Мясо и птица" },
    { key: "fish", label: "Рыба" },
    { key: "dairy", label: "Молочное и яйца" },
    { key: "bread", label: "Хлеб" },
    { key: "grocery", label: "Крупы, макароны, мука, масло" },
    { key: "canned", label: "Консервы, соусы, соленья" },
    { key: "spices", label: "Специи и приправы" },
    { key: "frozen", label: "Заморозка" },
    { key: "other", label: "Другое" },
  ],
  $b = {},
  Zi = (e, t) => {
    for (let n of t.split(/\s+/)) n && ($b[n] = e);
  };
Zi(
  "veg",
  "eggplant apple banana bell-pepper cabbage carrot cucumber dill garlic green-onion lemon-juice mushroom onion parsley potato red-onion spinach tomato beet radish sorrel zucchini cilantro pumpkin",
);
Zi(
  "meat",
  "chicken-fillet beef smoked-pork boiled-sausage minced-pork-beef pork chicken-thigh-fillet beef-liver",
);
Zi("fish", "pollock-fillet pink-salmon-fillet");
Zi(
  "dairy",
  "butter cottage-cheese cream egg hard-cheese milk plain-yogurt sour-cream processed-cheese kefir",
);
Zi("bread", "white-bread");
Zi(
  "grocery",
  "couscous oat-flakes pasta red-lentil rice cooked-rice wheat-flour wheat-noodle split-pea pearl-barley buckwheat semolina millet sugar baking-soda walnut vegetable-oil",
);
Zi(
  "canned",
  "canned-beans canned-chickpea canned-tomato canned-tuna tomato-paste soy-sauce black-olive pickled-cucumber",
);
Zi(
  "spices",
  "black-pepper chili cinnamon paprika salt bay-leaf coriander cumin",
);
Zi("frozen", "frozen-peas");
var mD = [
  ["frozen", /заморож|пельмен|вареник|мороже/],
  [
    "canned",
    /консерв|в банке|соус|кетчуп|майонез|горчиц|паста томат|томатн|солён|солен|маринов|маслин|олив|огурцы бочк/,
  ],
  [
    "spices",
    /перец молот|молотый|черный перец|перец черн|специ|приправ|(^|[^а-я])соль([^а-я]|$)|лавров|кориц|паприк|зира|кориандр|ванил|дрожж|разрыхл/,
  ],
  [
    "fish",
    /рыб|минта|горбуш|лосос|сёмг|семг|треск|сельд|селёд|креветк|кальмар|тунец|тунц/,
  ],
  [
    "meat",
    /мяс|говяд|свинин|куриц|курин|индейк|фарш|колбас|сосиск|ветчин|бекон|(^|[^а-я])печень([^а-я]|$)|печенк|бедр|окорок|грудк/,
  ],
  [
    "dairy",
    /молок|кефир|сметан|творог|сыр|сливк|йогурт|ряженк|масло сливоч|сливочн|яйц|яиц/,
  ],
  ["bread", /хлеб|батон|лаваш|булк|багет|сухар/],
  [
    "grocery",
    /крупа|круп|рис|гречк|пшен|перлов|манк|овсян|геркулес|макарон|спагетти|вермишел|лапш|мука|сахар|масло|чай|кофе|какао|орех|изюм|кураг|чернослив|сухофрукт|мед|мёд|сода|горох|фасоль сух|чечевиц|нут/,
  ],
  [
    "veg",
    /картоф|картош|морков|лук|чеснок|капуст|свекл|свёкл|помидор|томат|огур|перец|кабач|баклажан|тыкв|зелен|укроп|петрушк|кинз|салат|шпинат|щавел|редис|гриб|шампиньон|яблок|банан|лимон|апельсин|груш|ягод|фрукт|овощ/,
  ],
];
function Rr(e) {
  let t = me(e.ingredientId);
  if (t?.aisle && Wo.some((s) => s.key === t.aisle)) return t.aisle;
  if ($b[e.ingredientId]) return $b[e.ingredientId];
  let n = e.name.toLowerCase().replace(/ё/g, "е");
  if (/заморож|пельмен|вареник/.test(n)) return "frozen";
  if (/майонез|кетчуп|соус/.test(n)) return "canned";
  let a = t?.groups || [];
  if (a.includes("fish") || a.includes("seafood")) return "fish";
  if (a.includes("meat") || a.includes("poultry")) return "meat";
  if (a.includes("dairy") || a.includes("eggs")) return "dairy";
  let i = e.name
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/(^|[^а-я])сыр(ой|ый|ая|ое|ые|ого|ую|ых)(?=[^а-я]|$)/g, "$1");
  for (let [s, r] of mD) if (r.test(i)) return s;
  return "other";
}
function Lp(e) {
  let t = e.filter((i) => !i.checked),
    n = Wo.map((i) => ({
      key: i.key,
      label: i.label,
      items: t.filter((s) => Rr(s) === i.key),
    })).filter((i) => i.items.length),
    a = e.filter((i) => i.checked);
  return (
    a.length && n.push({ key: "bought", label: "Уже куплено", items: a }), n
  );
}
var gD = new Set([
    "water",
    "salt",
    "sugar",
    "black-pepper",
    "vegetable-oil",
    "bay-leaf",
    "baking-soda",
    "lemon-juice",
    "cooked-rice",
  ]),
  t0 = (e) => e.charAt(0).toUpperCase() + e.slice(1),
  hD =
    /^((сыр|свеж|очищенн|охлажденн|охлаждённ|нечищенн)(ой|ый|ая|ое|ые|ого)\s+)+/i;
function n0(e) {
  let [t, ...n] = e.trim().split(/,\s+/),
    a = [t.replace(hD, ""), ...n.filter((i) => /%/.test(i))].join(", ");
  return (
    (a = a
      .replace(
        /\s+без (скорлуп|кожур|кожиц|косточ|кож|жидкост|кост|рассол|добав).*$/i,
        "",
      )
      .trim()),
    a ? t0(a) : e
  );
}
function Bp(e, t) {
  let n = me(e);
  return n0(n?.name || t);
}
function We(e) {
  let t = me(e);
  if (!t) return e;
  let n = t.aliases.find((i) => i.split(" ").length <= 2 && i.length <= 18);
  if (n) return t0(n);
  let a = n0(t.name).replace(
    /\s*\d+([,.]\d+)?(\s*[–—-]\s*\d+([,.]\d+)?)?\s*%/g,
    "",
  );
  return t0(a.split(/,| \(| с | без | для /)[0].trim() || t.name);
}
var Wb = null;
function Pp(e = 2) {
  if (Wb?.version === bt) return Wb.groups;
  let t = new Map();
  for (let i of F)
    for (let s of i.ingredients)
      !s.optional && !gD.has(s.id) && t.set(s.id, (t.get(s.id) || 0) + 1);
  let n = [...t.entries()]
      .filter(([, i]) => i >= e)
      .sort((i, s) => s[1] - i[1])
      .map(([i]) => i),
    a = Wo.filter((i) => i.key !== "spices" && i.key !== "other")
      .map((i) => ({
        key: i.key,
        label: i.label,
        items: n
          .filter(
            (s) => Rr({ ingredientId: s, name: me(s)?.name || s }) === i.key,
          )
          .map((s) => ({ id: s, label: We(s) })),
      }))
      .filter((i) => i.items.length);
  return (Wb = { version: bt, groups: a }), a;
}
function jp(e) {
  return "Есть дома: " + e.map((t) => We(t).toLowerCase()).join(", ");
}
function _s(e, t) {
  return me(e) ? We(e) : n0(t);
}
var e0 = null;
function yD(e) {
  if (e0?.version !== bt) {
    let t = new Map();
    for (let n of F)
      for (let a of n.ingredients) t.set(a.id, (t.get(a.id) || 0) + 1);
    e0 = { version: bt, count: t };
  }
  return e0.count.get(e) || 0;
}
var US =
    /(^|\s)(сыр(ой|ая|ое|ые)|молот(ый|ая|ое|ые)|суш[её]н(ый|ая|ое|ые)|свеж(ий|ая|ее|ие)|консервированн\S*|заморож\S*|очищенн\S*|охлажд\S*|натуральн\S*|без\s+\S+|с\s+\S+|из\s+\S+|в\s+\S+)(?=\s|$)/g,
  bD = new Set(["meat", "fish", "poultry", "seafood", "mushrooms", "legumes"]),
  vD = new Set([
    "meat",
    "dairy",
    "eggs",
    "gluten",
    "nuts",
    "soy",
    "fish",
    "seafood",
    "vegetables",
    "fruit",
    "legumes",
    "grains",
    "spices",
    "sweet",
  ]);
function a0(e, t, n = 30) {
  let a = e.trim().toLowerCase().replace(/ё/g, "е");
  if (!a) return [];
  let i = (l) => l.toLowerCase().replace(/ё/g, "е"),
    s = (l) => {
      let u = i(l);
      return u === a
        ? 120
        : u.startsWith(a)
          ? 100
          : u.split(/[\s,()-]+/).some((f) => f.startsWith(a))
            ? 75
            : u.includes(a)
              ? 25
              : 0;
    },
    r = t
      .map((l) => {
        let u = me(l),
          f = We(l),
          p = Math.max(
            0,
            ...[...(u?.aliases || []), u?.name || ""].map(
              (y) =>
                s(
                  i(y)
                    .replace(/[,.;:()«»%0-9–-]+/g, " ")
                    .replace(US, " ")
                    .replace(US, " ")
                    .replace(/\s+/g, " ")
                    .trim(),
                ) * 0.45,
            ),
            ...(u?.groups || [])
              .filter((y) => bD.has(y) && Oe[y] && i(Oe[y]).startsWith(a))
              .map(() => 60),
          ),
          m = Math.max(s(f) + 5, p);
        return {
          id: l,
          label: f,
          match: m,
          groups: (u?.groups || []).filter((y) => !vD.has(y)),
          score:
            m +
            Math.min(30, Math.log2(yD(l) + 1) * 7) -
            Math.min(12, f.length * 0.25),
        };
      })
      .filter((l) => l.match >= 20)
      .sort((l, u) => u.score - l.score),
    o = r[0];
  if (o && o.groups.length)
    for (let l of r.slice(1))
      l.groups.some((u) => o.groups.includes(u)) &&
        (l.score = Math.max(l.score, Math.min(o.score - 1, l.score + 40)));
  return r
    .sort((l, u) => u.score - l.score || l.label.localeCompare(u.label, "ru"))
    .slice(0, n)
    .map((l) => l.id);
}
var kD = { milk: "dairy", egg: "eggs" },
  i0 = { version: -1, map: new Map() },
  xD = [
    [
      "pork",
      /свин|бекон|(^|[^а-я])сал(о|а)([^а-я]|$)|ветчин|грудинк|корейк|буженин|карбонад|шпик/,
    ],
    ["beef", /говя|телят/],
    ["lamb", /баран|ягн/],
  ];
function wD(e) {
  if (i0.version !== bt) {
    let t = new Map();
    for (let n of Za())
      for (let a of n.groups)
        t.has(a) || t.set(a, new Set()), t.get(a).add(n.id);
    for (let [n, a] of Object.entries(Sr)) t.set(n, new Set(a.ids));
    for (let n of Za())
      for (let [a, i] of xD)
        (n.id.includes(a) || i.test(n.name.toLowerCase())) &&
          (t.has(a) || t.set(a, new Set([a])), t.get(a).add(n.id));
    i0 = { version: bt, map: t };
  }
  return i0.map.get(kD[e] || e);
}
function Os(e, t) {
  return e === t || !!wD(t)?.has(e);
}
function ia(e, t) {
  return me(t) ? e === t : Os(e, t);
}
var Hp = (e) => e.startsWith("dish:");
function TD(e, t) {
  let n = me(t),
    a = n && pt(n.aliases[0] || n.name)[0];
  if (!a || a.length < 5) return !1;
  let i = Xe(a);
  return pt(e.title).some((s) => Xe(s) === i);
}
var IS = () => 0;
function LS(e) {
  IS = e;
}
var el = [
    "water",
    "salt",
    "sugar",
    "black-pepper",
    "vegetable-oil",
    "sunflower-oil",
    "bay-leaf",
  ],
  r0 = new Set(el);
function zs(e) {
  return new Set(["water", ...(e?.basics ?? el)]);
}
var SD = { kids: "Детям", guests: "Для гостей", date: "Ужин вдвоём" };
function CD(e, t) {
  if (t === "kids") return e.kids === !0;
  let n = e.occasions || [];
  return t === "guests"
    ? n.some((a) => a === "guests" || a === "holiday" || a === "new-year")
    : n.some((a) => a === "date" || a === "guests" || a === "holiday");
}
function Qe(e, t, n, a = 3, i = {}) {
  let s = [...new Set([...t.excluded, ...n.excluded])],
    // Asking "в аэрогриле" means the person has one, even if the profile does not say so.
    r = t.appliances.filter((p) => n.appliances.includes(p) || t.desired.includes("dish:" + p)),
    o = (p) => t.available.some((m) => ia(p, m)),
    l = (p) => t.absent.some((m) => ia(p, m)),
    u = zs(n);
  return e
    .filter((p) => {
      if (
        !Number.isInteger(t.servings) ||
        t.servings < 1 ||
        t.servings > 12 ||
        (t.maxMinutes !== null && p.totalMinutes > t.maxMinutes) ||
        (t.mood === "sweet" && !p.tags.includes("sweet")) ||
        (t.occasion && !CD(p, t.occasion))
      )
        return !1;
      if (t.maxKcal || t.minProtein) {
        let m = Yt(p).perServing;
        if (
          (t.maxKcal && m.kcal > t.maxKcal) ||
          (t.minProtein && m.protein < t.minProtein)
        )
          return !1;
      }
      return !(
        t.servings > p.maxServings ||
        ((t.vegetarian || n.vegetarian) &&
          (!p.tags.includes("vegetarian") ||
            p.allergens.includes("fish") ||
            p.ingredients.some((m) => Os(m.id, "meat") || Os(m.id, "fish")))) ||
        p.appliances.some((m) => !r.includes(m)) ||
        s.some((m) =>
          Hp(m)
            ? nt(p, m)
            : p.allergens.includes(m) || p.ingredients.some((y) => Os(y.id, m)),
        ) ||
        t.desired.some((m) =>
          Hp(m)
            ? !nt(p, m)
            : !p.ingredients.some((y) => ia(y.id, m)) && !TD(p, m),
        ) ||
        (t.strictPantry &&
          p.ingredients.some(
            (m) => !m.optional && ((!o(m.id) && !u.has(m.id)) || l(m.id)),
          ))
      );
    })
    .map((p) => {
      let m = (R) => _s(R.id, R.name),
        y = p.ingredients.filter((R) => o(R.id) && !l(R.id)).map(m),
        S = p.ingredients.filter((R) => l(R.id)).map(m),
        w = p.ingredients.filter((R) => !o(R.id) && !l(R.id)).map(m),
        v = [
          ...new Set(
            p.ingredients
              .filter(
                (R) => l(R.id) || (!R.optional && !o(R.id) && !u.has(R.id)),
              )
              .map(m),
          ),
        ],
        b = t.mood && p.tags.includes(t.mood),
        g = t.mood === "sweet" && ["baking", "dessert"].includes(Ne(p)) ? 4 : 0,
        x =
          (b ? 8 : 0) +
          g +
          y.length * 4 -
          S.length * 3 -
          (t.available.length ? v.length : 0) +
          (p.tags.includes("quick") ? 1 : 0) -
          p.totalMinutes / 100 +
          IS(p) +
          (i.meal && Zt(p).includes(i.meal)
            ? ["main", "soup"].includes(Ne(p)) || i.meal === "breakfast"
              ? 3
              : 1
            : 0),
        N = [
          b ? (Oe[t.mood] || "По настроению").toLowerCase() : null,
          t.maxMinutes !== null
            ? "укладывается в " + t.maxMinutes + " минут"
            : null,
          t.servings < p.minServings
            ? "рецепт минимум на " +
              p.minServings +
              " порции — останется на потом"
            : null,
          null,
        ]
          .filter(Boolean)
          .join(", "),
        B = [
          y.length
            ? "из ваших: " +
              [...new Set(y.map((R) => R.toLowerCase()))].slice(0, 3).join(", ")
            : "",
          N,
        ]
          .filter(Boolean)
          .join(" · ");
      return {
        recipe: p,
        available: y,
        missing: S,
        unknown: w,
        toBuy: v,
        reason: B ? B.charAt(0).toUpperCase() + B.slice(1) : p.summary,
        score: x,
      };
    })
    .sort((p, m) => m.score - p.score || p.recipe.id.localeCompare(m.recipe.id))
    .slice(0, a)
    .map((p) => ({
      recipe: p.recipe,
      available: p.available,
      missing: p.missing,
      unknown: p.unknown,
      toBuy: p.toBuy,
      reason: p.reason,
    }));
}
function Ui(e, t, n) {
  if (!Number.isInteger(n) || n < t.minServings || n > t.maxServings)
    throw new Error("Недопустимое число порций");
  let a = (e.amount * n) / t.servings,
    s =
      e.unit === "шт." || e.unit.startsWith("зубч")
        ? Math.max(1, Math.round(a))
        : a >= 100
          ? Math.round(a / 5) * 5
          : Math.round(a * 100) / 100;
  return { ...e, amount: s };
}
function du(e) {
  return new Intl.NumberFormat("ru", { maximumFractionDigits: 2 }).format(
    Fb(e),
  );
}
var AD = /^(шт\.?|зубч|головк|кочан|яйц|банк|пачк|упаковк|батон|пучок|пучк)/;
function Zs(e, t) {
  let n =
    AD.test(t.trim().toLowerCase()) && !Number.isInteger(e) && e > 1
      ? Math.ceil(e - 0.05)
      : t === "шт." && !Number.isInteger(e)
        ? Math.max(1, Math.ceil(e - 0.05))
        : e;
  return du(n) + " " + ZS(n, t);
}
var RD = { зубчика: "зубчик", зубчиков: "зубчик", шт: "шт." };
function s0(e) {
  return RD[e] || e;
}
function fu(e, t, n) {
  let a = e.map((i) => ({ ...i }));
  for (let i of t) {
    let s = me(i.id),
      r =
        s?.gramsPerUnit?.["шт."] && s0(i.unit) !== "шт."
          ? Oa(s, i.unit, i.amount)
          : null,
      o =
        r !== null
          ? {
              ...i,
              unit: "шт.",
              amount: Math.round((r / s.gramsPerUnit["шт."]) * 100) / 100,
            }
          : i,
      l = s0(o.unit),
      u = a.find(
        (y) => y.ingredientId === o.id && s0(y.unit) === l && !y.checked,
      ),
      f = u
        ? void 0
        : a.find(
            (y) =>
              y.ingredientId === o.id &&
              !y.checked &&
              Oa(s, y.unit, 1) !== null &&
              Oa(s, l, 1) !== null,
          ),
      p = u ?? f,
      m = u || !f ? o.amount : Oa(s, l, o.amount) / Oa(s, f.unit, 1);
    p
      ? ((p.amount = Math.round((p.amount + m) * 100) / 100),
        n &&
          !(p.recipes || []).includes(n) &&
          (p.recipes = [...(p.recipes || []), n]))
      : a.push({
          key: crypto.randomUUID(),
          ingredientId: o.id,
          name: o.name,
          amount: o.amount,
          unit: l,
          checked: !1,
          ...(n ? { recipes: [n] } : {}),
        });
  }
  return a;
}
function Vp(e, t, n) {
  return e.ingredients
    .filter((a) => a.id !== "water" && !n.some((i) => ia(a.id, i)))
    .map((a) => Ui(a, e, t));
}
function pu(e, t) {
  let n = (s, r, o) => [...new Set([...s, ...r])].filter((l) => !o.includes(l)),
    a = n(e.available, t.availableAdd, [...t.availableRemove, ...t.absentAdd]),
    i = n(e.absent, t.absentAdd, [...t.absentRemove, ...t.availableAdd]);
  return {
    ...e,
    desired: n(e.desired, t.desiredAdd, t.desiredRemove),
    available: a,
    absent: i,
    excluded: n(e.excluded, t.excludedAdd, t.excludedRemove),
    maxMinutes: t.maxMinutesChanged ? t.maxMinutes : e.maxMinutes,
    servings: t.servings ?? e.servings,
    mood: t.moodChanged ? t.mood : e.mood,
    appliances: t.appliancesChanged ? t.appliances : e.appliances,
    strictPantry: t.strictPantry ?? e.strictPantry,
    vegetarian: t.vegetarian ?? e.vegetarian,
    ...(t.nutrition && "maxKcal" in t.nutrition
      ? { maxKcal: t.nutrition.maxKcal }
      : {}),
    ...(t.nutrition && "minProtein" in t.nutrition
      ? { minProtein: t.nutrition.minProtein }
      : {}),
    ...("occasion" in t ? { occasion: t.occasion ?? null } : {}),
  };
}
function qp(e) {
  return [
    ...e.desired.filter(Hp).map((t) => "Хочется: " + Ds(t).toLowerCase()),
    e.maxMinutes ? "До " + e.maxMinutes + " мин" : null,
    e.servings + " порции",
    e.mood ? Oe[e.mood] : null,
    e.vegetarian ? "Без мяса" : null,
    e.strictPantry ? "Без покупок" : null,
    e.maxKcal ? "До " + e.maxKcal + " ккал" : null,
    e.minProtein ? "Белка от " + e.minProtein + " г" : null,
    e.occasion ? SD[e.occasion] : null,
    ...e.excluded.map((t) => {
      let n = Hp(t) ? Ds(t) : Oe[t] || me(t)?.aliases[0] || me(t)?.name || t;
      return "Без: " + n.charAt(0).toLowerCase() + n.slice(1);
    }),
  ].filter(Boolean);
}
function rn(e) {
  return {
    ...zp,
    servings: e.servings ?? zp.servings,
    desired: [],
    available: [],
    absent: [],
    excluded: [],
    appliances: [...e.appliances],
    vegetarian: e.vegetarian,
  };
}
var Gp = ["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"],
  ND = { dairy: "milk", eggs: "egg" },
  MD = {
    egg: ["яиц", "яичко", "яички"],
    "chicken-fillet": [
      "куриное филе",
      "филе курицы",
      "куриной грудки",
      "куриная грудка",
    ],
    potato: ["картошка", "картофель", "картошки", "картошку"],
    "cottage-cheese": ["творог", "творожок"],
    pasta: ["макарошки"],
    "sour-cream": ["сметана"],
    milk: ["молоко"],
  },
  ED = {
    пять: 5,
    десять: 10,
    пятнадцать: 15,
    двадцать: 20,
    "двадцать пять": 25,
    тридцать: 30,
    сорок: 40,
    "сорок пять": 45,
    пятьдесят: 50,
    шестьдесят: 60,
    девяносто: 90,
    полчаса: 30,
    "полтора часа": 90,
    час: 60,
    часик: 60,
    "пару часов": 120,
    "два часа": 120,
  },
  DD = {
    одного: 1,
    себя: 1,
    одному: 1,
    двоих: 2,
    двух: 2,
    двое: 2,
    троих: 3,
    трех: 3,
    трое: 3,
    четверых: 4,
    четырех: 4,
    четверо: 4,
    пятерых: 5,
    пяти: 5,
    пятеро: 5,
    шестерых: 6,
    шести: 6,
    шестеро: 6,
    семерых: 7,
    восьмерых: 8,
    восьми: 8,
    десятерых: 10,
    десяти: 10,
    двенадцати: 12,
  },
  BS = [
    [
      "comfort",
      /(из ничего|из того,? что (есть )?в любом доме|из простых продуктов|устал|вымота|замота|без сил|сил нет|нет сил|лень|ленив|попроще|проще|без заморочек|без суеты|без возни|ничего сложного|не сложн|несложн|элементарн|не умею готовить|плохо готовлю|новичок|для чайник|бюджетн|дешев|недорог|эконом|до зарплаты|из простых продуктов|подешевле|стипенди|денег нет|нет денег|экономлю|экономим)/,
    ],
    [
      "quick",
      /(быстр|побыстрее|некогда|мало времени|на скорую руку|спешу|тороплюсь|срочно|мигом|по-быстрому|по быстрому|опаздыва|перекус)/,
    ],
    [
      "cozy",
      /(печал|из-за холода|холод на улице|на улице холод|холодрыг|холодин|ноябр|темнот|осенн|разбит\S* сердц|грущу|тоскую|бабул|бабушк|по-домашнему|как мама|мамин|уют|тепленьк|теплого|теплое|горяч|согреться|согреть|домашн|как у бабушки|как у мамы|как в детстве|грустн|тоскл|хандр|настроения нет|плохое настроение|стресс|холодно|замерз|замёрз|(^|[^а-я])мороз|зимн|дожд|слякот)/,
    ],
    [
      "light",
      /(скинуть вес|сбросить вес|сбросить пару|скинуть пару|лишний вес|легк|не тяжел|диетич|полегче|(^|[^а-я])пп([^а-я]|$)|правильн\S* питани|диет|худе|похуд|калори|на сушке|переел|переела|на ночь|поздно вечером|ночью)/,
    ],
    [
      "hearty",
      /(до вечера хватил|восстановиться|пробежк|после работы на ногах|сытн|наесться|голоден|голодн|плотн|посытнее|после тренировк|после зала|спортзал|тренировк|белков|протеин|набрать массу|на массу|голодный как волк)/,
    ],
    [
      "fresh",
      /((^|[^а-я])овощ|свеж|освеж|хрустящ|похрустеть|жарко|жара|духота|летн|витамин)/,
    ],
    ["spicy", /(остр|пикантн|с перчинкой|поострее)/],
    [
      "sweet",
      /(сладк|десерт|сладенько|к чаю|вкусняшк|побаловать|сладкоежк|к кофе)/,
    ],
  ],
  PS =
    /((после|вчера|вчерашн\S*|прошл\S*)\s+(\S+\s+)?(застол|праздн|корпоратив|дня рожден|день рожден|новогодн|шашлык|выходн)|переел|переела|объел)/,
  KS = "",
  _D = [
    [
      PS,
      (e) => {
        e.moodChanged || ((e.mood = "light"), (e.moodChanged = !0));
      },
    ],
    [
      /(соберутся|собираемся|приедут|приезжают|придут в гости|родня|родственник|одноклассник|с семь[её]й едет|едет .* с семь|гост|застоль|праздн|день рождени|днюх|новый год|новогодн|юбиле|банкет|на компанию|большой компанией|новосель)/,
      (e) => {
        PS.test(KS) ||
          ((e.occasion = "guests"),
          e.servings === null && (e.servings = 6),
          e.moodChanged || ((e.mood = "hearty"), (e.moodChanged = !0)));
      },
    ],
    [
      /(ребен|ребён|детям|детей|для детск|малыш|сыну|дочке|дочери|в садик|в школу|школьник)/,
      (e) => {
        e.occasion = "kids";
      },
    ],
    [
      /(романтич|свидани|при свечах|годовщин|для любим|любимому|любимой|для мужа|для жены|удивить (мужа|жену|девушку|парня))/,
      (e) => {
        e.occasion = "date";
      },
    ],
    [
      /((^|[^а-я])пост(а|е|у|ом)?([^а-я]|$)|постн|пощусь|соблюдаю пост)/,
      (e) => {
        (e.vegetarian = !0), e.excludedAdd.push("egg", "milk");
      },
    ],
    [
      /(простыл|простуд|заболел|болею|температур|горло болит|насморк)/,
      (e) => {
        e.desiredAdd.push("dish:soup"),
          e.moodChanged || ((e.mood = "cozy"), (e.moodChanged = !0));
      },
    ],
  ],
  YS =
    /^(нет|нету|закончил(ся|ась|ось|ись)|кончил(ся|ась|ось|ись)|сломал(ся|ась|ось|ись)|сломан[аоы]?)$/;
function jS(e, t) {
  return (
    YS.test(e[t] || "") ||
    (e[t] === "не" &&
      /^(работает|работают|осталось|осталась|остался|осталось)$/.test(
        e[t + 1] || "",
      ))
  );
}
function HS(e, t) {
  return YS.test(e[t] || "") ? 1 : 2;
}
var OD = [
    ["oven", /^духовк/],
    ["blender", /^блендер/],
    ["multicooker", /^мультиварк/],
    ["airfryer", /^(аэрогрил|аэрофритюр)/],
    ["microwave", /^(микроволн|свч)/],
    ["pan", /^сковород|^сковородк/],
    ["pot", /^кастрюл/],
  ],
  o0 = null;
function zD(e) {
  let t = new Set(e.map((o) => o.id)),
    n = [],
    a = new Set(Object.keys(Qa.ambiguousAliases).map(_e)),
    i = (o, l, u) => {
      let f = pt(l).map(Xe);
      f.length && o.length && n.push({ ids: o, words: f, group: u });
    };
  for (let o of e) a.has(_e(o.name)) || i([o.id], o.name, !1);
  for (let o of Za())
    if (t.has(o.id)) for (let l of o.aliases) a.has(_e(l)) || i([o.id], l, !1);
  for (let [o, l] of Object.entries(MD))
    if (t.has(o)) for (let u of l) i([o], u, !1);
  for (let [o, l] of Object.entries(Qa.groupAliases))
    for (let u of l) {
      let f = _e(u).replace(/^без\s+/, "");
      i([ND[o] || o], f, !0);
    }
  for (let [o, l] of Object.entries(Qa.ambiguousAliases))
    i(
      l.filter((u) => t.has(u)),
      o,
      !1,
    );
  let s = new Map();
  for (let o of e) {
    let l = pt(o.name)[0];
    l && l.length >= 4 && s.set(Xe(l), [...(s.get(Xe(l)) || []), o.id]);
  }
  let r = new Set(n.filter((o) => o.words.length === 1).map((o) => o.words[0]));
  for (let [o, l] of s)
    l.length === 1 && !r.has(o) && n.push({ ids: l, words: [o], group: !1 });
  return n.sort((o, l) => l.words.length - o.words.length);
}
var ZD = [
    ["нехочу"],
    ["не", "хачу"],
    ["не", "хочю"],
    ["не", "хочеться"],
    ["бес"],
    ["не", "ем"],
    ["не", "ешь"],
    ["не", "люблю"],
    ["не", "хочу"],
    ["не", "надо"],
    ["не", "нужно"],
    ["не", "переношу"],
    ["не", "кладите"],
    ["не", "клади"],
    ["без"],
    ["кроме"],
    ["нельзя"],
    ["аллергия"],
    ["аллергия", "на"],
    ["исключи"],
    ["исключите"],
    ["исключить"],
    ["убери"],
    ["уберите"],
    ["убрать"],
  ],
  UD = [
    ["нет"],
    ["нету"],
    ["сломалась"],
    ["сломался"],
    ["сломан"],
    ["сломана"],
    ["закончился"],
    ["закончилась"],
    ["закончилось"],
    ["закончились"],
    ["кончился"],
    ["кончилась"],
    ["кончились"],
    ["не", "осталось"],
    ["не", "осталась"],
    ["не", "остался"],
  ],
  ID = [
    ["есть"],
    ["дома"],
    ["имеется"],
    ["имеются"],
    ["осталось"],
    ["осталась"],
    ["остался"],
    ["остались"],
    ["лежит"],
    ["лежат"],
    ["в", "холодильнике"],
    ["у", "меня"],
  ],
  LD = [
    ["хочу"],
    ["хочется"],
    ["хачу"],
    ["хочю"],
    ["хочеться"],
    ["хочица"],
    ["хочеца"],
    ["хотелось"],
    ["хочу", "бы"],
    ["охота"],
    ["с"],
    ["со"],
    ["хотим"],
    ["захотелось"],
    ["люблю"],
  ],
  BD = new Set([
    "хочу",
    "хочется",
    "хотим",
    "буду",
    "будем",
    "что",
    "чего",
    "поесть",
    "охота",
  ]);
function Kp(e, t, n) {
  return n.every((a, i) => e[t + i] === a);
}
function tl(e, t, n) {
  o0?.version !== bt && (o0 = { version: bt, entries: zD(n) });
  let a = o0.entries,
    i = _e(e),
    s = pt(e),
    r = s.map(Xe),
    o = {
      desiredAdd: [],
      desiredRemove: [],
      availableAdd: [],
      availableRemove: [],
      absentAdd: [],
      absentRemove: [],
      excludedAdd: [],
      excludedRemove: [],
      maxMinutes: null,
      maxMinutesChanged: !1,
      servings: null,
      mood: null,
      moodChanged: !1,
      appliances: [],
      appliancesChanged: !1,
      strictPantry: null,
      vegetarian: null,
      reply: "",
    },
    l =
      /(начн[её]м заново|сначала|сбрось|сбросить|забудь|очисти условия|с чистого листа)/.test(
        i,
      );
  l &&
    /(начн[её]м заново|сначала|сбрось|сбросить|забудь|очисти условия|с чистого листа)/.test(
      i,
    ) &&
    Object.assign(o, {
      desiredRemove: t.desired,
      availableRemove: t.available,
      absentRemove: t.absent,
      excludedRemove: t.excluded,
      maxMinutesChanged: !0,
      moodChanged: !0,
      strictPantry: !1,
      nutrition: { maxKcal: null, minProtein: null },
      occasion: null,
    });
  let u = null,
    f =
      i.match(/(\d{1,3})\s*(?:-|–|до)?\s*(\d{1,3})?\s*мин/) ||
      i.match(
        /мин\S*\s+(?:за\s+|на\s+|до\s+)?(\d{1,3})(?:\s*(?:-|–|до)\s*(\d{1,3}))?/,
      ),
    p = i.match(/(\d)\s*час/);
  if (f) u = Number(f[2] || f[1]);
  else if (p) u = Number(p[1]) * 60;
  else
    for (let [k, U] of Object.entries(ED).sort(
      (Y, G) => G[0].length - Y[0].length,
    ))
      if (
        new RegExp("(^|[^а-я])" + k + "([^а-я]|$)").test(i) &&
        (U >= 60 || /мин/.test(i) || k === "полчаса")
      ) {
        u = U;
        break;
      }
  /(не важно сколько|без ограничени[йя] по времени|время не важно|сколько угодно)/.test(
    i,
  )
    ? ((o.maxMinutes = null), (o.maxMinutesChanged = !0))
    : u !== null &&
      ((o.maxMinutes = Math.max(5, Math.min(180, u))),
      (o.maxMinutesChanged = !0));
  let m =
    i.match(/(\d{1,2})\s*(?:порци|человек|персон|едок)/) ||
    i.match(/на\s+(\d{1,2})(?:\s|$|[,.])/);
  if (m) o.servings = Math.max(1, Math.min(12, Number(m[1])));
  else {
    let k =
      i.match(
        /(?:на|для)\s+(одного|себя|двоих|двух|троих|трех|четверых|четырех|пятерых|пяти|шестерых|шести|семерых|восьмерых|восьми|десятерых|десяти|двенадцати)/,
      ) || i.match(/нас\s+(двое|трое|четверо|пятеро|шестеро)/);
    k
      ? (o.servings = DD[k[1]])
      : /(впрок|на неделю|на несколько дней|на пару дней|на два дня|на три дня|на 2 дня|на 3 дня|большую кастрюлю|целую кастрюлю|кастрюлю)/.test(
            i,
          )
        ? (o.servings = 8)
        : /(на всю семью|на семью|для семьи)/.test(i)
          ? (o.servings = 4)
          : /(одному|для себя|на себя)/.test(i)
            ? (o.servings = 1)
            : /(вдвоем|на двоих|романтич|свидани)/.test(i) && (o.servings = 2);
  }
  let y = null;
  for (let [k, U] of BS) {
    let Y = new RegExp(U.source, "g"),
      G;
    for (; (G = Y.exec(i)); )
      if (
        !/(^|[^а-я])(без|не|не хочу|не хочется|не надо|не нужно|не люблю|не очень)\s+(что-то\s+|что-нибудь\s+|ничего\s+)?$/.test(
          i.slice(Math.max(0, G.index - 28), G.index),
        )
      ) {
        (!y || G.index < y.at) && (y = { mood: k, at: G.index });
        break;
      }
  }
  y && ((o.mood = y.mood), (o.moodChanged = !0)),
    /(вегетариан|без мяса и рыбы)/.test(i) && (o.vegetarian = !0);
  let S =
    /(без плиты|без готовки|без варки|без термическ|ничего не (варить|жарить|готовить на плите)|плиты нет|нет плиты|плита не работает|не включая плиту|отключили (свет|газ)|нет (света|газа))/.test(
      i,
    );
  /(заморозить|заморозк|в морозилк|для морозилк)/.test(i) &&
    !/(можно ли|можно\s.*заморозить\?|как заморозить)/.test(i) &&
    o.desiredAdd.push("dish:freezer"),
    (KS = i);
  for (let [k, U] of _D) k.test(i) && U(o);
  /(можно с мясом|не вегетариан|с мясом можно)/.test(i) && (o.vegetarian = !1),
    /(только из того|только из имеющ|только то,? что есть|ничего не (покупать|докупать|покупая|докупая)|без похода в магазин|без (до)?покуп|не (хочу |буду |надо |нужно |будем )?(ничего )?(до)?покупать|ничего не (хочу |буду |будем )?(до)?покупать|в магазин не (пойду|хочу|пойдем|идти)|не (хочу |буду )?идти в магазин|без магазина|из имеющегося)/.test(
      i,
    ) && (o.strictPantry = !0),
    /(дома|есть|осталось|остались|осталась|остался|в холодильнике)( у (меня|нас))? только\s/.test(
      i,
    ) && (o.strictPantry = !0),
    /(можно (немного )?докупить|схожу в магазин|могу купить)/.test(i) &&
      (o.strictPantry = !1);
  {
    let k = i.match(
      /(?:до|не больше|не более|меньше|в пределах)\s*(\d{3,4})\s*(?:ккал|кило?калори|калори)/,
    );
    /(без ограничени[яй] по калори|калории не важн|любые калории|сколько угодно калори)/.test(
      i,
    )
      ? (o.nutrition = { ...o.nutrition, maxKcal: null })
      : k && +k[1] >= 100 && +k[1] <= 2e3
        ? (o.nutrition = { ...o.nutrition, maxKcal: +k[1] })
        : /(низкокалор|малокалор|мало калори|немного калори|диетическ)/.test(
            i,
          ) && (o.nutrition = { ...o.nutrition, maxKcal: 400 }),
      /(белка сколько угодно|белок не важ)/.test(i)
        ? (o.nutrition = { ...o.nutrition, minProtein: null })
        : /(много белка|побольше белка|больше белка|белков(ое|ого|ую|ые)|высокобелк|протеинов|богат(ое|ую|ый) белком)/.test(
            i,
          ) && (o.nutrition = { ...o.nutrition, minProtein: 30 });
  }
  let w = null,
    v = null,
    b = [...t.appliances],
    g = !1,
    x = [],
    N = [],
    _ = [],
    B = (k) => {
      for (let U of N) (x[U].mode = k), (x[U].bare = !1);
      (k === "excluded" || k === "absent") &&
        ((b = b.filter((U) => !_.includes(U))), _.length && (g = !0)),
        (N = []),
        (_ = []);
    };
  for (let k = 0; k < s.length; k++) {
    let U = s[k];
    if (/^[,.;:!?]$/.test(U)) {
      U !== "," && ((w = v = null), (N = []), (_ = []));
      continue;
    }
    if (U === "но" || U === "а") {
      (w = v = null), (N = []), (_ = []);
      continue;
    }
    let Y = ZD.find((le) => Kp(s, k, le));
    if (Y) {
      // "без" is a preposition: it applies to what follows ("курица без духовки"), unlike "…не хочу",
      // which applies to the products named before it.
      Y[0] === "без" ? ((N = []), (_ = [])) : B("excluded"),
        (w = "excluded"),
        Y[0] !== "без" && (v = "excluded"),
        (k += Y.length - 1);
      continue;
    }
    let G = UD.find((le) => Kp(s, k, le));
    if (G) {
      B("absent"), (w = v = "absent"), (k += G.length - 1);
      continue;
    }
    let Q = ID.find((le) => Kp(s, k, le));
    if (Q && !(U === "есть" && BD.has(s[k - 1] || ""))) {
      B("available"), (w = v = "available"), (k += Q.length - 1);
      continue;
    }
    if (LD.find((le) => Kp(s, k, le))) {
      U !== "с" && U !== "со" && B("desired"),
        (w = U === "с" || U === "со" ? "desired" : (v = "desired"));
      continue;
    }
    U === "можно" && w === null && (w = "desired");
    let ke = OD.find(([, le]) => le.test(U));
    if (ke && jS(s, k + 1)) {
      (b = b.filter((le) => le !== ke[0])), (g = !0), (k += HS(s, k + 1));
      continue;
    }
    if (ke) {
      let [le] = ke;
      w === "excluded" || w === "absent"
        ? ((b = b.filter((Ze) => Ze !== le)), (g = !0))
        : /только/.test(s.slice(Math.max(0, k - 3), k).join(" "))
          ? ((b = [le]), (g = !0))
          : ["oven", "multicooker", "airfryer", "microwave"].includes(le) &&
              w !== "available" &&
              /^(в|из|для)$/.test(s[k - 1] || "")
            ? x.push({
                mode: "desired",
                ids: ["dish:" + le],
                group: !1,
                dish: !0,
              })
            : w === null
              ? _.push(le)
              : !b.includes(le) && w === "available" && (b.push(le), (g = !0));
      continue;
    }
    let P = (le) =>
        le.every(
          (Ze, Mt) =>
            r[k + Mt] === Ze ||
            (Mt === 0 &&
              Ze.length >= 5 &&
              !!s[k] &&
              s[k].startsWith(Ze) &&
              le.length === 1),
        ),
      vt = (le) => le.every((Ze, Mt) => !!r[k + Mt] && Fa(r[k + Mt], Ze));
    if (
      (U === "блин" && /^[,!.]$/.test(s[k + 1] || "")) ||
      /^сыр(ая|ой|ое|ые|ого|ую|ым|ых|ыми)$/.test(U)
    )
      continue;
    let He = $o().entries,
      ze = He.find((le) => le.words.length >= 2 && P(le.words)),
      W = ze
        ? void 0
        : a.find((le) => le.words.every((Ze, Mt) => r[k + Mt] === Ze));
    if (
      (!W && !ze && (ze = He.find((le) => P(le.words))),
      !W &&
        !ze &&
        ((W = a.find((le) => vt(le.words))),
        W || (ze = He.find((le) => vt(le.words)))),
      ze)
    ) {
      w === null && N.push(x.length),
        x.push({
          mode: w ?? "desired",
          ids: [ze.key],
          group: !1,
          dish: !0,
          bare: w === null,
        }),
        (k += ze.words.length - 1);
      continue;
    }
    if (W && w !== null && w !== "excluded" && jS(s, k + W.words.length)) {
      x.push({
        mode: "absent",
        ids: W.ids,
        group: W.group,
        bare: !1,
        word: s.slice(k, k + W.words.length).join(" "),
      }),
        (k += W.words.length - 1 + HS(s, k + W.words.length));
      continue;
    }
    W &&
      (w === null && N.push(x.length),
      x.push({
        mode: w ?? "available",
        ids: W.ids,
        group: W.group,
        bare: w === null,
        word: s.slice(k, k + W.words.length).join(" "),
      }),
      (k += W.words.length - 1));
  }
  let R = /(можно|уже можно|снова можно|теперь можно)/.test(i),
    T = x.filter((k) => !k.dish);
  if (
    T.length <= 2 &&
    !T.some((k) => k.mode === "available" && !k.bare) &&
    !/(дома|холодильник|осталось|остались|остался|имеется)/.test(i)
  )
    for (let k of T) k.bare && k.mode === "available" && (k.mode = "desired");
  let C = (k) =>
    k.length > 1
      ? Object.entries(Sr).find(([, U]) =>
          k.every((Y) => U.ids.includes(Y)),
        )?.[0]
      : void 0;
  for (let k of x) {
    if (k.dish) {
      let U = k.ids[0];
      k.mode === "excluded"
        ? (o.excludedAdd.push(U),
          t.desired.includes(U) && o.desiredRemove.push(U))
        : k.mode !== "absent" &&
          (o.desiredAdd.push(U),
          t.excluded.includes(U) && o.excludedRemove.push(U));
      continue;
    }
    if (k.mode === "excluded") {
      o.excludedAdd.push(...k.ids);
      continue;
    }
    if (R && k.ids.some((U) => t.excluded.includes(U))) {
      o.excludedRemove.push(...k.ids);
      continue;
    }
    k.mode === "absent"
      ? o.absentAdd.push(...k.ids)
      : k.mode === "desired"
        ? o.desiredAdd.push(C(k.ids) ?? k.ids[0])
        : o.availableAdd.push(k.ids[0]);
  }
  let M =
    /^(а|и|ещ[её]|тоже|плюс|добавь)\s|(^|\s)(ещ[её]|тоже|добавь|плюс)(\s|$)/.test(
      i,
    );
  !M &&
    o.desiredAdd.some((k) => !k.startsWith("dish:")) &&
    o.desiredRemove.push(
      ...t.desired.filter(
        (k) => !k.startsWith("dish:") && !o.desiredAdd.includes(k),
      ),
    ),
    o.desiredAdd.some((k) => k.startsWith("dish:")) &&
      o.desiredRemove.push(
        ...t.desired.filter((k) => !o.desiredAdd.includes(k)),
      );
  for (let k of [
    "desiredAdd",
    "desiredRemove",
    "availableAdd",
    "absentAdd",
    "excludedAdd",
    "excludedRemove",
  ])
    o[k] = [...new Set(o[k])];
  (o.desiredAdd = o.desiredAdd.filter(
    (k) =>
      !o.excludedAdd.includes(k) &&
      !o.absentAdd.includes(k) &&
      k !== "water" &&
      k !== "salt",
  )),
    (o.availableAdd = o.availableAdd.filter(
      (k) => k !== "water" && k !== "salt",
    )),
    g &&
      ((o.appliances = Gp.filter((k) => b.includes(k))),
      (o.appliancesChanged = !0)),
    S &&
      ((o.appliances = Gp.filter((k) => k === "blender" && b.includes(k))),
      (o.appliancesChanged = !0));
  let Z = o.desiredAdd.filter((k) => k.startsWith("dish:"));
  if (y && o.moodChanged && o.mood === y.mood && Z.length) {
    let k = new Set(Z.flatMap((G) => pt(Ds(G)).map(Xe))),
      U = s.filter((G) => !k.has(Xe(G))).join(" "),
      Y = BS.find((G) => G[0] === y.mood)?.[1];
    Y && !Y.test(U) && ((o.mood = null), (o.moodChanged = !1));
  }
  let V = M || /^(а|но|только|и|тогда|так)\s/.test(i);
  return (
    Z.length &&
      !V &&
      !l &&
      (!o.maxMinutesChanged &&
        t.maxMinutes !== null &&
        ((o.maxMinutes = null), (o.maxMinutesChanged = !0)),
      !o.moodChanged && t.mood && ((o.mood = null), (o.moodChanged = !0)),
      o.strictPantry === null && t.strictPantry && (o.strictPantry = !1),
      !o.appliancesChanged &&
        Gp.some((k) => !t.appliances.includes(k)) &&
        ((o.appliances = [...Gp]), (o.appliancesChanged = !0)),
      !("occasion" in o) && t.occasion && (o.occasion = null),
      !o.nutrition &&
        (t.maxKcal || t.minProtein) &&
        (o.nutrition = { maxKcal: null, minProtein: null })),
    (o.reply = l
      ? "Хорошо, начинаем заново: все условия сброшены. Расскажите, что хочется."
      : Ii(o) && Yp(e)
        ? "Вот ещё варианты:"
        : QS(o, n)),
    o
  );
}
var VS = {
    light: "Лёгкое — пожалуйста:",
    cozy: "Тёплое и уютное — как раз под настроение:",
    hearty: "Посытнее — чтобы точно наесться:",
    quick: "Быстрые варианты:",
    comfort: "Понимаю. Вот совсем простое, без возни:",
    fresh: "Что-нибудь свежее:",
    spicy: "Поострее — держите:",
    sweet: "Сладкое — пожалуйста:",
  },
  qS = {
    kids: "Детям обычно нравится вот это:",
    guests: "Для гостей предлагаю:",
    date: "Для ужина вдвоём:",
  },
  PD = {
    light: "лёгкое",
    cozy: "уютное",
    hearty: "посытнее",
    quick: "побыстрее",
    comfort: "попроще",
    fresh: "свежее",
    spicy: "поострее",
    sweet: "сладкое",
  },
  jD = { kids: "детям", guests: "для гостей", date: "для ужина вдвоём" },
  GS = {
    oven: "без духовки",
    pan: "без сковороды",
    pot: "без кастрюли",
    blender: "без блендера",
    spicy: "не острое",
    sweet: "не сладкое",
    pork: "без свинины",
    beef: "без говядины",
    lamb: "без баранины",
    meat: "без мяса",
    poultry: "без птицы",
    chicken: "без курицы",
    fish: "без рыбы",
    seafood: "без морепродуктов",
    milk: "без молочного",
    dairy: "без молочного",
    egg: "без яиц",
    eggs: "без яиц",
    gluten: "без глютена",
    mushrooms: "без грибов",
    mushroom: "без грибов",
    nuts: "без орехов",
    onion: "без лука",
    onions: "без лука",
    garlic: "без чеснока",
    legumes: "без бобовых",
    sugar: "без сахара",
    mayonnaise: "без майонеза",
    cheese: "без сыра",
    tomatoes: "без помидоров",
    tomato: "без помидоров",
  };
function XS(e, t) {
  return QS(e, t);
}
function QS(e, t) {
  let n = (u) =>
      (
        me(u)?.aliases[0] ||
        t.find((f) => f.id === u)?.name ||
        Oe[u] ||
        u
      ).toLowerCase(),
    a = e.desiredAdd.filter((u) => u.startsWith("dish:")),
    i = e.desiredAdd.filter((u) => !u.startsWith("dish:")),
    s = e.appliancesChanged
      ? (() => {
          let u = ["pan", "pot", "oven", "blender"],
            f = u.filter((p) => !e.appliances.includes(p));
          return !e.appliances.length ||
            !e.appliances.some((p) => p !== "blender")
            ? "без плиты и духовки"
            : f.length && f.length <= 2
              ? f.map((p) => GS[p] || "без: " + n(p)).join(", ")
              : null;
        })()
      : null,
    r = [
      a.length ? a.map((u) => Ds(u).toLowerCase()).join(" или ") : null,
      e.occasion ? jD[e.occasion] : null,
      e.moodChanged &&
      e.mood &&
      !(e.mood === "quick" && e.maxMinutesChanged && e.maxMinutes) &&
      !(e.mood === "sweet" && a.length)
        ? PD[e.mood] || (Oe[e.mood] || e.mood).toLowerCase()
        : null,
      e.maxMinutesChanged && e.maxMinutes
        ? "до " + e.maxMinutes + " минут"
        : null,
      e.servings ? "на " + e.servings + " " + Li(e.servings, !0) : null,
      e.vegetarian ? "без мяса" : null,
      e.strictPantry ? "без покупок" : null,
      e.nutrition?.maxKcal ? "до " + e.nutrition.maxKcal + " ккал" : null,
      e.nutrition?.minProtein ? "много белка" : null,
      i.length ? _i(i.map((u) => aa(n(u)))).replace(/^/, "с ") : null,
      e.availableAdd.length
        ? "есть дома: " + e.availableAdd.map(n).join(", ")
        : null,
      e.absentAdd.length ? "нет дома: " + e.absentAdd.map(n).join(", ") : null,
      e.excludedAdd.length
        ? [
            ...new Set(
              e.excludedAdd
                // «без лука» already covers red and green onion: show only the first of related products.
                .filter((u, k, all) => {
                  let w = (Oe[u] || n(u)).toLowerCase().split(" ").pop().slice(0, 3);
                  return !all.slice(0, k).some((x) => (Oe[x] || n(x)).toLowerCase().includes(w));
                })
                .map((u) => GS[u] || "без " + (Oe[u] || n(u)).toLowerCase()),
            ),
          ].join(", ")
        : null,
      e.excludedRemove.length
        ? "снова можно: " + e.excludedRemove.map(n).join(", ")
        : null,
      s,
    ].filter(Boolean);
  if (!r.length)
    return "Не совсем понял. Назовите продукты, время или настроение — например: «яйца и сыр, минут 15».";
  let o = r.length === 1;
  if (o && e.occasion && qS[e.occasion]) return qS[e.occasion];
  if (o && e.moodChanged && e.mood && VS[e.mood]) return VS[e.mood];
  if (o && e.availableAdd.length)
    return (
      "Из того, что есть (" +
      e.availableAdd.map(n).join(", ") +
      "), можно приготовить:"
    );
  if (o && e.desiredAdd.length)
    return i.length === e.desiredAdd.length && i.length <= 3
      ? Cr("С " + _i(i.map((u) => aa(n(u)))) + " можно приготовить:")
      : "Нашёл по запросу «" + e.desiredAdd.map(n).join(", ") + "»:";
  if (o && e.maxMinutesChanged && e.maxMinutes)
    return "Успеете за " + e.maxMinutes + " минут:";
  if (o && e.vegetarian) return "Без мяса — вот что предлагаю:";
  if (o && s) return Cr(s + " можно приготовить:");
  let l = r.join(", ");
  return Cr("Подобрал — " + l + ":");
}
function Ii(e) {
  return (
    !e.desiredAdd.length &&
    !e.desiredRemove.length &&
    !e.availableAdd.length &&
    !e.availableRemove.length &&
    !e.absentAdd.length &&
    !e.absentRemove.length &&
    !e.excludedAdd.length &&
    !e.excludedRemove.length &&
    !e.maxMinutesChanged &&
    e.servings === null &&
    !e.moodChanged &&
    !e.appliancesChanged &&
    e.strictPantry === null &&
    e.vegetarian === null &&
    !e.nutrition &&
    !("occasion" in e && e.occasion !== void 0)
  );
}
function Yp(e) {
  return /(друго[ейм]|други[ехм]|другую|ещ[её] вариант|ещ[её] что|покажи ещ|ещ[её] идеи|не то|не нравится|не подходит|следующ|что-то новое|иначе)/.test(
    _e(e),
  );
}
function Li(e, t = !1) {
  let n = e % 10,
    a = e % 100;
  return n === 1 && a !== 11
    ? t
      ? "порцию"
      : "порция"
    : n >= 2 && n <= 4 && (a < 12 || a > 14)
      ? "порции"
      : "порций";
}
var Nr = [
    {
      key: "rice",
      label: "Рис",
      icon: "🍚",
      phrase: "остался варёный рис",
      words: /(^|[^а-я])рис([аеуы]|ом)?([^а-я]|$)/,
      ids: ["cooked-rice", "rice"],
      best: /жарен\S* рис|рис с яйц|с рисом и кукуруз|соевом соусе с рисом|тефтел|голубцы ленив|перцы фарширов/,
      tip: "Варёный рис храните в холодильнике в закрытой посуде не дольше 1–2 дней и разогревайте до горячего.",
      intro: "Из вчерашнего риса получится:",
    },
    {
      key: "buckwheat",
      label: "Гречка",
      icon: "🥣",
      phrase: "осталась гречка",
      words: /греч/,
      ids: ["buckwheat"],
      best: /гречка с (яйц|гриб|говяж)/,
      tip: "Готовая гречка хранится 2–3 дня. Обжарьте её на сковороде — вкус будет как у свежей.",
      intro: "Из готовой гречки получится:",
    },
    {
      key: "pasta",
      label: "Макароны",
      icon: "🍝",
      phrase: "остались макароны",
      words: /макарон|спагет|вермишел|(^|[^а-я])паст[аыу]([^а-я]|$)/,
      ids: ["pasta"],
      best: /запеканка макарон|по-флотски|макароны с (сыр|сосиск)/,
      tip: "Варёные макароны храните до 2 дней. Перед обжаркой сбрызните их водой, чтобы не были сухими.",
      intro: "Из сваренных макарон получится:",
    },
    {
      key: "mash",
      label: "Пюре, картошка",
      icon: "🥔",
      phrase: "осталось картофельное пюре",
      words: /пюре|картош|картофел/,
      ids: ["potato"],
      best: /зраз|запеканка картоф|пирожки с картош|драник|картофельный суп/,
      tip: "Пюре и варёный картофель храните 1–2 дня. Из пюре получаются зразы, пирожки и запеканка.",
      intro: "Из пюре и варёной картошки получится:",
    },
    {
      key: "chicken",
      label: "Курица",
      icon: "🍗",
      phrase: "осталась готовая курица",
      words: /куриц|курятин|курочк|окорочок|окорочк/,
      ids: ["chicken-fillet", "chicken-thigh-fillet"],
      best: /оливье с куриц|салат с куриц|цезарь|шаурм|жульен/,
      tip: "Готовую курицу храните до 2 дней. Для салата её не нужно разогревать — просто нарежьте.",
      intro: "Из готовой курицы получится:",
    },
    {
      key: "bread",
      label: "Хлеб",
      icon: "🍞",
      phrase: "остался чёрствый хлеб",
      words: /хлеб|батон|булк|багет/,
      ids: ["white-bread"],
      best: /гренк|бутерброды горяч|котлеты домашн/,
      tip: "Подсохший хлеб — для гренок и горячих бутербродов. В котлеты его кладут размоченным в молоке.",
      intro: "Из подсохшего хлеба получится:",
    },
  ],
  HD =
    /(остал(ся|ась|ось|ись)|остатк|вчерашн|лишн(ий|яя|ее|ие|его|ей|юю)|ч[её]рств|подсох|куда (деть|девать|пристроить)|не доел|недоел|доесть)/,
  VD =
    /(минут|час[аов]?([^а-я]|$)|сыр(ая|ой|ое|ые|ого)|морозил|заморож|фарш|сырой)/;
function FS(e) {
  let t = _e(e);
  return !HD.test(t) || VD.test(t)
    ? null
    : (Nr.find((n) => n.words.test(t)) ?? null);
}
function JS(e, t, n = 4) {
  let a = F.filter(
      (r) =>
        t(r) && r.ingredients.some((o) => !o.optional && e.ids.includes(o.id)),
    ),
    i = a.filter((r) => e.best.test(r.title.toLowerCase())),
    s = a
      .filter((r) => !i.includes(r) && r.course !== "soup")
      .sort((r, o) => r.totalMinutes - o.totalMinutes);
  return [...i, ...s].slice(0, n);
}
var $S = [
    {
      id: "comfort",
      title: "Попроще, устал",
      phrase: "устал, хочу попроще",
      kind: "need",
    },
    {
      id: "quick",
      title: "Побыстрее",
      phrase: "что-нибудь побыстрее",
      kind: "need",
    },
    {
      id: "cozy",
      title: "Уютное, тёплое",
      phrase: "хочу что-то уютное",
      kind: "need",
    },
    {
      id: "light",
      title: "Лёгкое",
      phrase: "хочу что-то лёгкое",
      kind: "need",
    },
    {
      id: "hearty",
      title: "Сытное",
      phrase: "хочу что-нибудь сытное",
      kind: "need",
    },
    {
      id: "fresh",
      title: "Свежее, овощное",
      phrase: "хочу что-то свежее",
      kind: "need",
    },
    { id: "spicy", title: "Острое", phrase: "хочу острое", kind: "need" },
    { id: "sweet", title: "Сладкое", phrase: "хочу сладкое", kind: "need" },
    { id: "guests", title: "Для гостей", phrase: "придут гости", kind: "need" },
    { id: "kids", title: "Для ребёнка", phrase: "для ребёнка", kind: "need" },
    { id: "fasting", title: "Постное", phrase: "сейчас пост", kind: "need" },
    { id: "sick", title: "Когда болеешь", phrase: "простыл", kind: "need" },
    {
      id: "romantic",
      title: "Ужин на двоих",
      phrase: "романтический ужин на двоих",
      kind: "need",
    },
    {
      id: "batch",
      title: "Впрок, на несколько дней",
      phrase: "приготовить впрок на несколько дней",
      kind: "need",
    },
    { id: "soup", title: "Суп", phrase: "хочу суп", kind: "need" },
    { id: "salad", title: "Салат", phrase: "хочу салат", kind: "need" },
    { id: "breakfast", title: "Завтрак", phrase: "хочу завтрак", kind: "need" },
    { id: "baking", title: "Выпечка", phrase: "хочу выпечку", kind: "need" },
    { id: "meat", title: "Мясное", phrase: "хочу мясо", kind: "need" },
    { id: "fish", title: "Рыба", phrase: "хочу рыбу", kind: "need" },
    {
      id: "no_meat",
      title: "Без мяса",
      phrase: "без мяса и рыбы",
      kind: "need",
    },
    {
      id: "pantry",
      title: "Из того, что есть",
      phrase: "только из того, что есть дома",
      kind: "need",
    },
    { id: "greeting", title: "Приветствие", phrase: "привет", kind: "talk" },
    { id: "how", title: "Как дела", phrase: "как дела", kind: "talk" },
    { id: "who", title: "Кто ты", phrase: "кто ты", kind: "talk" },
    {
      id: "help",
      title: "Как пользоваться",
      phrase: "что ты умеешь",
      kind: "talk",
    },
    { id: "thanks", title: "Спасибо", phrase: "спасибо", kind: "talk" },
    { id: "bye", title: "Прощание", phrase: "пока", kind: "talk" },
    { id: "surprise", title: "Удиви меня", phrase: "удиви меня", kind: "talk" },
    {
      id: "more",
      title: "Покажи другое",
      phrase: "покажи другое",
      kind: "talk",
    },
    { id: "joke", title: "Шутка", phrase: "расскажи анекдот", kind: "talk" },
    { id: "praise", title: "Похвала", phrase: "класс", kind: "talk" },
    {
      id: "cooked",
      title: "Приготовил",
      phrase: "я приготовил, было вкусно",
      kind: "talk",
    },
    { id: "rude", title: "Недоволен", phrase: "тупой бот", kind: "talk" },
    { id: "offtopic", title: "Не про еду", phrase: "", kind: "other" },
    {
      id: "food",
      title: "Продукты или блюдо (понимают правила)",
      phrase: "",
      kind: "other",
    },
  ],
  l0 = (e) => $S.find((t) => t.id === e),
  H8 = $S.filter((e) => e.phrase);
var qD = [
  [
    "time",
    /(сколько|как долго|долго ли|время|по времени|минут)[^.?!]*(вар|готов|жар|запек|запеч|туш|печ|печ|выпек|кипят|отвар|томит)|(вар|готов|жар|запек|туш|пек|печ)\S*[^.?!]*(сколько|как долго|по времени)/,
  ],
  [
    "how",
    /(как|научи|подскажи|расскажи)\s+(\S+\s+)?(правильно\s+|быстро\s+|вкусно\s+)?(с?варить|отварить|приготовить|готовить|пожарить|жарить|запечь|запекать|потушить|тушить|почистить|чистить|нарезать|резать|замесить|сделать|промыть|замочить|взбить|испечь|печь|заварить|разогреть)|(^|\s)(с?вари(шь|те)?|отвари|пожарь|запеки|потуши)(\s|$)/,
  ],
  [
    "ratio",
    /(пропорци|сколько (нужно |надо |налить )?(воды|жидкости|молока)|на (один|1|одну) (стакан|часть))/,
  ],
  [
    "replace",
    /(чем (можно )?(за|под)мени|на что (можно )?замени|что (можно )?(положить|добавить|использовать) вместо|вместо|замена|заменитель|аналог|если нет|если не[тб]у|нет (\S+ )?(дома|под рукой)|закончил\S*,? (а|что))/,
  ],
  [
    "store",
    /(сколько (дней |времени )?(можно )?(хран|лежит|простоит|стоит в холодильник)|срок\S* хранени|как (правильно )?хранить|хранится|храниться|испорти|протух|можно ли (есть|кушать|доесть)|не испортится|в холодильнике (сколько|долго))/,
  ],
  ["freeze", /(заморозить|замораживать|заморозк|морозилк|морозильник)/],
  ["defrost", /(размороз|разморажив|оттаять|оттаивать)/],
  [
    "fix",
    /(^|[^а-я])(пересол|пересластил|переперчил|слишком (остр|солен|солён|сладк|жидк|густ|кисл)|подгорел|пригорел|прилипа|прилип|липнет|липкое|разваливаются|развалились|разваливается|рвутся|рвется|рвётся|не поднял|не поднимается|осел|осело|опал|опало|комочк|комк|жестк|жёстк|резинов|получил\S* сух|сухие|сухое|сухая|не загуст|убежал|горчит|горький|горькая|сырой внутри|сырая внутри|сырое внутри|не пропекся|не пропёкся|не пропеклась|не пропекл|растекаются|растекаются|расплываются|расползаются|не держ)/,
  ],
  [
    "done",
    /(^|[^а-я])(как (понять|узнать|определить|проверить)|готов[оаы]? ли|когда (будет )?готов|готовность|розов\S* внутри|кровь|сыр\S* внутри)/,
  ],
  [
    "portion",
    /(сколько[^.?!]*на (одного|1|человека|порцию|персону|двоих|троих|четверых|\d+ (человек|персон|порци))|на (одного|человека|порцию) сколько|норма на человека|порция на человека)/,
  ],
  [
    "measure",
    /(сколько (грамм|гр|г|мл|миллилитр|ложек|стаканов)|грамм\S* в|в граммах|в миллилитрах|в (столовой|чайной|ст|ч)\.? ложк|в стакане|в одном стакане|стакан\S* (муки|сахара|риса|гречки|молока|воды|крупы)|ложк\S* (муки|сахара|соли|масла|соды)|щепотк|сколько весит|вес (одного|одной|1))/,
  ],
  ["salt", /(сколько (нужно |надо )?соли|соли (на|в) (литр|кастрюл))/],
  [
    "safety",
    /(можно ли (есть|давать|кушать)|безопасно ли|опасно ли|не опасно|вредно ли|не вредно|отравиться|сальмонелл|мыть (ли )?(курицу|мясо|яйца))/,
  ],
];
function GD(e) {
  return qD.filter(([, t]) => t.test(e)).map(([t]) => t);
}
var KD = {
    egg: "яйц|яичк|яйк|всмятку|вкрутую|в мешочек",
    quail: "перепел",
    buckwheat: "гречк|гречн",
    rice: "(^|[^а-я])рис",
    pasta:
      "макарон|спагетти|паст[уаыое]|рожки|ракушк|перь[яе]|фузилли|пенне|лапш|вермишел",
    potato: "картош|картофел|пюре",
    chicken:
      "курин|курицу|курица|курицы|кура|куру|грудк|окорочк|бедр|голен|крылыш|крыль",
    beef: "говядин|говяж|телятин",
    pork: "свинин|свиной|свиные|свиная|корейк|шейк",
    mince: "фарш|котлет|тефтел|фрикадел",
    fish: "рыб|минта|горбуш|лосос|семг|сёмг|форел|хек|треск|скумбри|сельд|селедк|селёдк",
    beet: "свекл|свёкл|буряк",
    carrot: "морков",
    peas: "горох|горошек",
    lentil: "чечевиц",
    beans: "фасол",
    chickpea: "нут|нута|нутом",
    millet: "пшен",
    barley: "перлов|перловк",
    semolina: "манк|манн",
    oat: "овсян|геркулес|овсяные",
    bulgur: "булгур",
    couscous: "кускус|кус-кус",
    pelmeni: "пельмен|вареник|манты|хинкал",
    sausage: "сосиск|сардельк",
    shrimp: "кревет",
    squid: "кальмар",
    frozenveg: "замороженн\\S* овощ|овощн\\S* смес|мексиканск\\S* смес",
    corn: "кукуруз",
    broccoli: "брокколи|цветн\\S* капуст",
    cabbage: "капуст",
    mushroom: "гриб|шампиньон|вешенк",
    liver: "печен[ьи](?!е)|печёнк|печенк",
    pancake: "блин|блинчик|оладь|оладуш",
    syrniki: "сырник",
    omelette: "омлет|яичниц",
    cake: "пирог|кекс|шарлотк|манник|бисквит|торт|выпечк|корж",
    dough: "тест",
    broth: "бульон",
    soup: "суп|борщ|щи|солянк|рассольник|уха|окрошк|похлебк",
    salad: "салат|оливье|винегрет|шуб",
    mayo: "майонез",
    sourcream: "сметан",
    cream: "сливк|сливок",
    bakingpowder: "разрыхлител",
    soda: "сод[аыуе]",
    butter: "сливочн\\S* масл|масл\\S* сливочн",
    oil: "растительн\\S* масл|подсолнечн|оливков",
    milk: "молок|молоч",
    kefir: "кефир|простокваш|ряженк",
    crumbs: "панировк|сухар",
    vinegar: "уксус",
    tomatopaste: "томатн\\S* паст",
    starch: "крахмал",
    yeast: "дрожж",
    sugar: "сахар",
    honey: "м[её]д[ауо ]|м[её]д$",
    flour: "мук[аиу]|муки",
    garlic: "чеснок|чеснока",
    herbs: "зелен|укроп|петрушк|кинз|базилик",
    onion: "лук|луковиц",
    cottage: "творог|творож",
    cheese: "(^|[^а-я])сыр(?!ник)",
    meat: "мяс",
    cutlet: "котлет",
    stew: "тушен|гуляш|рагу|жаркое",
    cooked: "готов\\S* (еду|еда|блюд)|остатк|приготовленн",
    cans: "консерв|банк\\S* (открыт|после)|открыт\\S* банк",
    eggplant: "баклажан",
    cucumber: "огур",
    tomato: "помидор|томат(?!н)",
    pepper: "(^|[^а-я])перц|перец|остр",
    salty: "солен|солён|пересол",
    oven: "духовк|духовой",
  },
  WS = Object.fromEntries(
    Object.entries(KD).map(([e, t]) => [e, new RegExp(t)]),
  ),
  yt = (e, t) => ({ label: e, text: t }),
  eC = [
    {
      topic: "quail",
      ask: ["time", "how"],
      answer:
        "Перепелиные яйца — в кипящую воду: всмятку 1–2 минуты, вкрутую 4–5. Потом в холодную воду.",
    },
    {
      topic: "egg",
      ask: ["time", "how", "done"],
      answer:
        "Яйца опускайте в уже кипящую воду: всмятку — 3–4 минуты, «в мешочек» — 5–6, вкрутую — 8–10. Потом сразу в холодную воду, так легче чистить.",
      option: yt("Блюда с яйцами", "хочу что-нибудь с яйцами"),
    },
    {
      topic: "buckwheat",
      ask: ["time", "how", "ratio"],
      answer:
        "Гречка: на 1 стакан крупы 2 стакана воды. После закипания 15–20 минут под крышкой на слабом огне, потом дайте постоять ещё 10 минут.",
      option: yt("Блюда с гречкой", "хочу что-нибудь с гречкой"),
    },
    {
      topic: "rice",
      ask: ["time", "how", "ratio"],
      answer:
        "Рис промойте до прозрачной воды. Круглый или длинный: на 1 стакан риса 1,5–2 стакана воды, 15–20 минут на слабом огне под крышкой, потом 10 минут постоять. Бурый рис варится 30–40 минут.",
      option: yt("Блюда с рисом", "хочу что-нибудь с рисом"),
    },
    {
      topic: "pasta",
      ask: ["time", "how", "ratio", "salt"],
      answer:
        "Макароны варите в большом количестве кипящей подсоленной воды — около 1 литра на 100 г и примерно 10 г соли на литр — столько минут, сколько написано на упаковке, обычно 8–12. Попробуйте за минуту до конца: внутри должна остаться лёгкая упругость.",
      option: yt("Блюда с макаронами", "хочу макароны"),
    },
    {
      topic: "potato",
      ask: ["time", "how", "done"],
      answer:
        "Картофель целиком варится 20–25 минут после закипания, кусочками — 15–20, молодой — 15–20. Готов, когда нож входит легко. Солите воду сразу: примерно 1 ч. л. на литр.",
      option: yt("Блюда с картошкой", "хочу что-нибудь с картошкой"),
    },
    {
      topic: "chicken",
      ask: ["time", "how"],
      answer:
        "Куриное филе: варить 20–25 минут, жарить кусочками 7–10 минут, запекать целиком 25–30 минут при 180–190 °C. Бёдра и голени: варить 30–40 минут, запекать 40–50 при 190–200 °C. Целую курицу — варить 1–1,5 часа, запекать около 1 часа 20 минут при 190 °C. Готово, когда внутри нет розового и сок прозрачный.",
      option: yt("Блюда с курицей", "хочу курицу"),
    },
    {
      topic: "beef",
      ask: ["time", "how", "done"],
      answer:
        "Говядина варится долго: кусками для бульона 1,5–2,5 часа, тушится 1,5–2 часа под крышкой. Готова, когда вилка входит легко. Чтобы была мягче, режьте поперёк волокон.",
      option: yt("Блюда с говядиной", "хочу говядину"),
    },
    {
      topic: "pork",
      ask: ["time", "how", "done"],
      answer:
        "Свинина: варить куском 1–1,5 часа, тушить кусочками 40–60 минут, отбивные жарить по 3–4 минуты с каждой стороны. Готова, когда сок прозрачный, без розового.",
      option: yt("Блюда со свининой", "хочу свинину"),
    },
    {
      topic: "mince",
      ask: ["time", "how", "done"],
      answer:
        "Котлеты из фарша: обжарьте по 4–5 минут с каждой стороны на среднем огне, потом 10 минут под крышкой на слабом огне или 15 минут в духовке при 180 °C. Готовы, когда сок прозрачный. Тефтели в соусе тушат 20–30 минут.",
      option: yt("Блюда с фаршем", "хочу что-нибудь с фаршем"),
    },
    {
      topic: "liver",
      ask: ["time", "how", "fix"],
      answer:
        "Печень жарьте недолго: ломтики около 1 см — по 2–3 минуты с каждой стороны, пока сок не станет прозрачным. Если передержать, станет жёсткой. Соли в самом конце.",
    },
    {
      topic: "fish",
      ask: ["time", "how", "done"],
      answer:
        "Филе рыбы жарьте по 3–4 минуты с каждой стороны, запекайте 15–20 минут при 180–200 °C, в супе варится 10–15 минут. Готова, когда мякоть стала непрозрачной и легко делится на волокна.",
      option: yt("Блюда с рыбой", "хочу рыбу"),
    },
    {
      topic: "beet",
      ask: ["time", "how", "done"],
      answer:
        "Свёкла целиком варится 1–2 часа в зависимости от размера, мелкая — 40–60 минут. Быстрее и вкуснее запечь в фольге: около часа при 190–200 °C. Готова, когда нож входит легко.",
      option: yt("Блюда со свёклой", "хочу что-нибудь со свёклой"),
    },
    {
      topic: "carrot",
      ask: ["time", "how"],
      answer:
        "Морковь целиком варится 20–30 минут после закипания, кружочками — 10–15.",
    },
    {
      topic: "peas",
      ask: ["time", "how"],
      answer:
        "Колотый горох варится 1–1,5 часа без замачивания или 40–60 минут, если замочить на ночь. Солите в конце — так он лучше разварится.",
      option: yt("Гороховый суп", "хочу гороховый суп"),
    },
    {
      topic: "lentil",
      ask: ["time", "how", "ratio"],
      answer:
        "Красная чечевица варится 15–20 минут и разваривается — хороша для супов и пюре. Зелёная и коричневая — 30–40 минут. Замачивать не нужно; воды примерно в 2–3 раза больше, чем крупы.",
      option: yt("Блюда с чечевицей", "хочу что-нибудь с чечевицей"),
    },
    {
      topic: "beans",
      ask: ["time", "how"],
      answer:
        "Сухую фасоль замочите на 8–12 часов, потом слейте воду и варите 1–1,5 часа в свежей воде; первые 10 минут — при сильном кипении, это обязательно для красной фасоли. Солите в конце. Консервированную фасоль варить не нужно — достаточно прогреть.",
      option: yt("Блюда с фасолью", "хочу что-нибудь с фасолью"),
    },
    {
      topic: "chickpea",
      ask: ["time", "how"],
      answer:
        "Сухой нут замочите на 8–12 часов, слейте воду и варите 1–1,5 часа до мягкости. Консервированный нут уже готов: промойте и сразу используйте.",
      option: yt("Блюда с нутом", "хочу что-нибудь с нутом"),
    },
    {
      topic: "millet",
      ask: ["time", "how", "ratio"],
      answer:
        "Пшено хорошо промойте горячей водой — уйдёт горечь. Рассыпчатое: 1 часть пшена на 2–2,5 части воды, 20–25 минут. Молочная каша: на 1 часть пшена 3–4 части молока, 25–30 минут на слабом огне, помешивая.",
      option: yt("Каша", "хочу кашу"),
    },
    {
      topic: "barley",
      ask: ["time", "how", "ratio"],
      answer:
        "Перловку лучше замочить на несколько часов, тогда она варится 40–60 минут; без замачивания — до 1,5 часа. Воды примерно в 3 раза больше, чем крупы.",
    },
    {
      topic: "semolina",
      ask: ["time", "how", "ratio"],
      answer:
        "Манная каша: на 500 мл молока около 3 ст. л. манки. Всыпайте тонкой струйкой в кипящее молоко, всё время помешивая, — так не будет комочков. После закипания 2–3 минуты, потом дайте постоять под крышкой.",
      option: yt("Каша на завтрак", "хочу кашу"),
    },
    {
      topic: "oat",
      ask: ["time", "how", "ratio"],
      answer:
        "Обычные овсяные хлопья: на 1 часть хлопьев 2 части молока или воды, 5–10 минут на слабом огне — точное время на упаковке.",
      option: yt("Каша на завтрак", "хочу кашу"),
    },
    {
      topic: "bulgur",
      ask: ["time", "how", "ratio"],
      answer:
        "Булгур: на 1 часть крупы 2 части воды, 15 минут на слабом огне под крышкой, потом 5–10 минут постоять.",
    },
    {
      topic: "couscous",
      ask: ["time", "how", "ratio"],
      answer:
        "Кускус залейте кипятком 1 : 1, посолите, накройте и оставьте на 5 минут. Потом разрыхлите вилкой с ложкой масла.",
    },
    {
      topic: "pelmeni",
      ask: ["time", "how", "fix"],
      answer:
        "Пельмени и вареники кладите в кипящую подсоленную воду, помешайте, чтобы не прилипли. После всплытия ещё 3–5 минут или по упаковке.",
      option: yt("Что-нибудь быстрое", "что-нибудь быстрое"),
    },
    {
      topic: "sausage",
      ask: ["time", "how"],
      answer:
        "Сосиски: в кипящую воду на 3–5 минут, сардельки — 7–10. Если в натуральной оболочке, проколите её, чтобы не лопнула.",
    },
    {
      topic: "shrimp",
      ask: ["time", "how"],
      answer:
        "Варёно-мороженые креветки (розовые) достаточно опустить в кипяток на 1–2 минуты. Сырые серые — варить 2–3 минуты, пока не порозовеют. Дольше — станут резиновыми.",
    },
    {
      topic: "squid",
      ask: ["time", "how", "fix"],
      answer:
        "Кальмары опускайте в кипящую воду на 1–2 минуты, не дольше — иначе станут резиновыми. Если передержали, варите ещё 30–40 минут: снова станут мягкими.",
    },
    {
      topic: "frozenveg",
      ask: ["time", "how"],
      answer:
        "Замороженные овощи не размораживайте: сразу в кипящую воду на 5–7 минут или на сковороду с ложкой масла на 8–10 минут.",
    },
    {
      topic: "corn",
      ask: ["time", "how"],
      answer:
        "Молодая кукуруза в початках варится 20–30 минут, более зрелая — до часа. Солите после варки, иначе зёрна станут жёстче.",
    },
    {
      topic: "broccoli",
      ask: ["time", "how"],
      answer:
        "Брокколи и цветную капусту соцветиями варите 5–7 минут в подсоленной воде, на пару — 7–10. Потом сразу в холодную воду, чтобы сохранили цвет.",
    },
    {
      topic: "mushroom",
      ask: ["time", "how"],
      answer:
        "Шампиньоны жарьте на сильном огне 10–15 минут, пока не уйдёт вся жидкость и не появится румянец. Солить лучше в конце. Варить шампиньоны — 5–10 минут.",
      option: yt("Блюда с грибами", "хочу что-нибудь с грибами"),
    },
    {
      topic: "cabbage",
      ask: ["time", "how"],
      answer:
        "Капуста в супе варится 10–15 минут (свежая), тушёная капуста — 40–60 минут под крышкой. Квашеную в щах варят дольше — 30–40 минут.",
    },
    {
      topic: "pancake",
      ask: ["time", "how"],
      answer:
        "Блины жарьте на хорошо разогретой сковороде по 30–60 секунд с каждой стороны: переворачивайте, когда края подрумянились и поверхность стала матовой. Оладьи — по 2–3 минуты на среднем огне.",
      option: yt("Блины и оладьи", "хочу блины или оладьи"),
    },
    {
      topic: "syrniki",
      ask: ["time", "how"],
      answer:
        "Сырники жарьте на среднем огне по 3–4 минуты с каждой стороны до румянца. Можно потом довести 5 минут под крышкой или в духовке при 180 °C.",
      option: yt("Сырники", "хочу сырники"),
    },
    {
      topic: "omelette",
      ask: ["time", "how", "fix"],
      answer:
        "Омлет: на 1 яйцо 1–2 ст. л. молока, взбейте вилкой, вылейте на смазанную сковороду и готовьте 5–7 минут под крышкой на слабом огне. Крышку не открывайте — тогда будет пышным.",
      option: yt("Омлет или яичница", "хочу омлет"),
    },
    {
      topic: "cake",
      ask: ["time", "how", "done"],
      answer:
        "Шарлотку, манник и кексы обычно пекут при 180 °C 35–45 минут. Первые 25 минут духовку не открывайте. Готовность проверьте деревянной шпажкой: выходит сухой — готово.",
      option: yt("Выпечка", "хочу выпечку"),
    },
    {
      topic: "broth",
      ask: ["time", "how", "fix"],
      answer:
        "Бульон: курица — 40–60 минут (целая — 1–1,5 часа), говядина — 2–3 часа. Мясо кладите в холодную воду, снимайте пену перед закипанием и варите на самом слабом огне — тогда бульон будет прозрачным.",
    },
    {
      topic: "stew",
      ask: ["time", "how"],
      answer:
        "Тушёное мясо готовьте под крышкой на слабом огне: курица — 30–40 минут, свинина — 40–60, говядина — 1,5–2 часа. Жидкость должна едва булькать.",
    },
    {
      topic: "egg",
      ask: ["measure"],
      answer:
        "Среднее куриное яйцо (С1) весит 55–65 г, без скорлупы — около 50 г: белок 30–35 г, желток около 18 г.",
    },
    {
      topic: "flour",
      ask: ["measure"],
      answer:
        "Мука примерно: в столовой ложке 15–20 г без горки (около 25 г с горкой), в гранёном стакане 200 мл — около 130 г, в стакане 250 мл — около 160 г.",
    },
    {
      topic: "sugar",
      ask: ["measure"],
      answer:
        "Сахар примерно: в чайной ложке 5–7 г, в столовой 20–25 г, в гранёном стакане 200 мл — около 180 г, в стакане 250 мл — около 200 г.",
    },
    {
      topic: "rice",
      ask: ["measure", "portion"],
      answer:
        "Рис: в стакане 200 мл около 180 г. На одного человека на гарнир берут 60–80 г сухого риса — после варки получится 180–240 г.",
    },
    {
      topic: "buckwheat",
      ask: ["measure", "portion"],
      answer:
        "Гречка: в стакане 200 мл около 165 г. На одного человека на гарнир — 60–80 г сухой крупы.",
    },
    {
      topic: "butter",
      ask: ["measure"],
      answer:
        "Сливочное масло: в столовой ложке около 17–20 г, в чайной — около 5 г. Стандартная пачка — 180 или 200 г.",
    },
    {
      topic: "oil",
      ask: ["measure"],
      answer:
        "Растительное масло: в столовой ложке около 15–17 г (15 мл), в чайной — около 5 г.",
    },
    {
      topic: "garlic",
      ask: ["measure", "replace"],
      answer:
        "Один зубчик чеснока весит 4–6 г. Если нет свежего, 1 зубчик заменит примерно ¼–½ ч. л. сушёного.",
    },
    {
      topic: "onion",
      ask: ["measure"],
      answer: "Средняя луковица весит около 100 г (80–120 г).",
    },
    {
      topic: "potato",
      ask: ["measure", "portion"],
      answer:
        "Средняя картофелина весит 100–150 г. На одного человека на гарнир берут 200–250 г сырого картофеля.",
    },
    {
      topic: "carrot",
      ask: ["measure"],
      answer: "Средняя морковь весит 100–150 г.",
    },
    {
      ask: ["measure"],
      answer:
        "Примерно: в столовой ложке 15 мл (сахар 20–25 г, мука 15–20 г, соль 20–25 г без горки), в чайной — 5 мл (соль и сода 7–8 г, сахар 5–7 г). Гранёный стакан до ободка — 200 мл, чайный — 250 мл. Щепотка соли — около 0,5–1 г.",
    },
    {
      topic: "pasta",
      ask: ["portion"],
      answer:
        "На одного человека берут 80–100 г сухих макарон, если это основное блюдо, и 50–70 г на гарнир.",
    },
    {
      topic: "meat",
      ask: ["portion"],
      answer:
        "Мяса или курицы на одного человека — 150–200 г сырого продукта без костей.",
    },
    {
      topic: "chicken",
      ask: ["portion"],
      answer: "Курицы на одного человека — 150–200 г филе или 1–2 бедра.",
    },
    {
      topic: "fish",
      ask: ["portion"],
      answer: "Рыбы на одного человека — 150–200 г филе.",
    },
    {
      topic: "soup",
      ask: ["portion"],
      answer:
        "Порция супа — 300–350 мл. На 4 человек нужна кастрюля 2–2,5 литра.",
    },
    {
      topic: "pelmeni",
      ask: ["portion"],
      answer:
        "На одного человека обычно 200–250 г пельменей — это 15–20 штук среднего размера.",
    },
    {
      ask: ["portion"],
      answer:
        "На одного человека обычно: макарон 80–100 г, крупы 60–80 г, картофеля 200–250 г, мяса или рыбы 150–200 г, супа 300–350 мл. В карточке рецепта можно выбрать число порций — продукты пересчитаются сами.",
    },
    {
      topic: "pasta",
      ask: ["salt"],
      answer:
        "Для макарон около 10 г соли на литр воды — это примерно столовая ложка на 2 литра.",
    },
    {
      topic: "soup",
      ask: ["salt"],
      answer:
        "Суп солите постепенно: примерно 1 ч. л. на литр, а в конце попробуйте и досолите. Бульон для супа с крупами и картошкой можно посолить чуть смелее.",
    },
    {
      ask: ["salt"],
      answer:
        "Ориентир: в воду для макарон — около 10 г на литр, для картофеля и круп — около 1 ч. л. на литр, в суп — 1 ч. л. на литр с проверкой в конце. Лучше недосолить: досолить легче, чем исправить.",
    },
    {
      ask: ["ratio"],
      answer:
        "Крупы и вода по объёму: гречка 1 : 2, рис 1 : 1,5–2, пшено 1 : 2–2,5, перловка 1 : 3, булгур 1 : 2, кускус 1 : 1 (залить кипятком), овсянка 1 : 2.",
    },
    {
      topic: "egg",
      ask: ["replace"],
      answer:
        "В выпечке одно яйцо можно заменить половиной банана, 3 ст. л. яблочного пюре или 1 ст. л. молотого льна, смешанной с 3 ст. л. воды. В котлетах — 2 ст. л. молока и чуть больше хлеба или манки. В омлете замены нет :)",
    },
    {
      topic: "sourcream",
      ask: ["replace"],
      answer:
        "Сметану обычно можно заменить густым йогуртом без добавок, в горячих блюдах — сливками. В тесте подойдёт кефир, но тесто выйдет чуть жиже.",
    },
    {
      topic: "cream",
      ask: ["replace"],
      answer:
        "Для соуса сливки можно заменить молоком с кусочком сливочного масла (на 200 мл молока около 20 г масла) или сметаной, которую кладут уже не на сильном огне. Для взбивания такие замены не подойдут.",
    },
    {
      topic: "bakingpowder",
      ask: ["replace"],
      answer:
        "Вместо 1 ч. л. разрыхлителя — примерно ⅓ ч. л. соды плюс немного лимонного сока или уксуса. Если тесто на кефире, соду можно не гасить: кислота уже есть.",
    },
    {
      topic: "soda",
      ask: ["replace"],
      answer:
        "Соду можно заменить разрыхлителем: его нужно примерно в 3 раза больше (вместо ½ ч. л. соды — 1,5 ч. л. разрыхлителя).",
    },
    {
      topic: "butter",
      ask: ["replace"],
      answer:
        "В выпечке сливочное масло можно заменить растительным — его берут примерно на четверть меньше. Для жарки подойдёт любое масло. В креме замены нет.",
    },
    {
      topic: "milk",
      ask: ["replace"],
      answer:
        "В блинах и оладьях молоко можно заменить кефиром или водой (блины будут тоньше). В пюре — водой от картофеля с кусочком масла. Подойдёт и растительное молоко.",
    },
    {
      topic: "kefir",
      ask: ["replace"],
      answer:
        "Кефир можно заменить простоквашей, ряженкой, йогуртом, разбавленным водой, или молоком с 1 ст. л. лимонного сока на 250 мл — подождите 10 минут.",
    },
    {
      topic: "mayo",
      ask: ["replace"],
      answer:
        "Вместо майонеза в салате подойдёт сметана или густой йогурт с ложкой горчицы и каплей лимонного сока.",
    },
    {
      topic: "crumbs",
      ask: ["replace"],
      answer:
        "Вместо панировочных сухарей — мука, манка, перемолотые овсяные хлопья, кукурузные хлопья или измельчённые сухарики без вкуса.",
    },
    {
      topic: "vinegar",
      ask: ["replace"],
      answer:
        "Вместо 1 ст. л. уксуса 9 % возьмите примерно 1,5–2 ст. л. лимонного сока.",
    },
    {
      topic: "tomatopaste",
      ask: ["replace"],
      answer:
        "1 ст. л. томатной пасты заменят 3–4 ст. л. томатов в собственном соку или тёртых свежих помидоров, уваренных на сковороде. Кетчуп подойдёт, но он сладкий и с приправами.",
    },
    {
      topic: "starch",
      ask: ["replace"],
      answer:
        "Крахмал для загустения можно заменить мукой — её нужно примерно в 2 раза больше. Разведите в холодной воде и влейте в горячее, помешивая.",
    },
    {
      topic: "yeast",
      ask: ["replace", "measure"],
      answer:
        "Сухие и свежие дрожжи: 1 г сухих ≈ 3 г свежих. Пакетик 11 г сухих заменяет около 30–35 г свежих.",
    },
    {
      topic: "sugar",
      ask: ["replace"],
      answer:
        "Сахар в выпечке можно частично заменить мёдом: его берут примерно на четверть меньше и чуть уменьшают жидкость. Выпечка с мёдом быстрее румянится.",
    },
    {
      topic: "herbs",
      ask: ["replace"],
      answer:
        "Свежую зелень можно заменить сушёной: 1 ч. л. сушёной ≈ 1 ст. л. свежей. Добавляйте её раньше, чтобы раскрылся аромат.",
    },
    {
      topic: "cottage",
      ask: ["replace"],
      answer:
        "Творог в запеканке и сырниках заменить почти нечем. В начинке иногда берут рикотту или мягкий творожный сыр.",
    },
    {
      topic: "flour",
      ask: ["replace"],
      answer:
        "Для загустения соуса муку можно заменить крахмалом — его нужно вдвое меньше. В сырниках муку заменит манка, в котлетах — хлеб или овсяные хлопья.",
    },
    {
      topic: "semolina",
      ask: ["replace"],
      answer:
        "Манку в сырниках и запеканке можно заменить мукой (её нужно чуть меньше) или молотыми овсяными хлопьями.",
    },
    {
      topic: "meat",
      ask: ["replace"],
      answer:
        "Мясо в большинстве домашних блюд можно поменять на другое, но время меняется: курица готовится быстрее всего, свинина — средне, говядина — дольше. В постный вариант вместо мяса подойдут грибы, фасоль или нут.",
    },
    {
      topic: "soup",
      ask: ["store"],
      answer:
        "Суп хранится в холодильнике 2–3 дня, со сметаной или сливками — 1–2. Остудите его быстро (можно поставить кастрюлю в холодную воду) и не оставляйте на плите на ночь.",
    },
    {
      topic: "salad",
      ask: ["store"],
      answer:
        "Салат с майонезом или сметаной храните не дольше суток. Лучше держать нарезанные продукты отдельно (1–2 дня) и заправлять перед подачей.",
    },
    {
      topic: "rice",
      ask: ["store"],
      answer:
        "Варёный рис храните в холодильнике 1–2 дня. Остудите его быстро, не оставляйте надолго в тепле.",
    },
    {
      topic: "pasta",
      ask: ["store"],
      answer:
        "Варёные макароны хранятся в холодильнике 2–3 дня. Чтобы не слиплись, перемешайте с ложкой масла.",
    },
    {
      topic: "mince",
      ask: ["store"],
      answer:
        "Сырой фарш храните в холодильнике не больше суток или сразу заморозьте. Готовые котлеты — 2 дня в холодильнике.",
    },
    {
      topic: "chicken",
      ask: ["store"],
      answer:
        "Сырую курицу храните в холодильнике 1–2 дня, готовую — 2–3 дня. Дольше — только в морозилке.",
    },
    {
      topic: "fish",
      ask: ["store"],
      answer:
        "Свежую рыбу храните в холодильнике не больше суток, готовую — 1–2 дня.",
    },
    {
      topic: "egg",
      ask: ["store"],
      answer:
        "Сырые яйца хранят в холодильнике до даты на упаковке, обычно 3–4 недели. Варёные вкрутую в скорлупе — до недели, очищенные — 1–2 дня.",
    },
    {
      topic: "pancake",
      ask: ["store"],
      answer:
        "Блины хранятся в холодильнике 2–3 дня, с мясной начинкой — 1–2. Их отлично можно заморозить.",
    },
    {
      topic: "cake",
      ask: ["store"],
      answer:
        "Шарлотка и кексы без крема хранятся 2–3 дня под плёнкой при комнатной температуре или в холодильнике. Пироги с мясом и рыбой — 1–2 дня в холодильнике.",
    },
    {
      topic: "cans",
      ask: ["store"],
      answer:
        "Открытые консервы переложите из жестяной банки в стеклянную или пластиковую посуду и храните в холодильнике 1–2 дня. Томатную пасту в стекле — до недели.",
    },
    {
      ask: ["store"],
      answer:
        "Готовую еду обычно хранят в холодильнике 2–3 дня, с майонезом и рыбой — 1–2. В тепле — не больше 2 часов. Если запах или вид изменились — лучше выбросить. В карточке рецепта, который можно готовить впрок, срок хранения указан отдельно.",
    },
    {
      topic: "soup",
      ask: ["freeze"],
      answer:
        "Большинство супов можно заморозить на 2–3 месяца: бульоны, борщ, щи, гороховый. Хуже переносят заморозку супы с картошкой (становится водянистой) и со сливками. Размораживайте в холодильнике и доводите до кипения.",
    },
    {
      topic: "salad",
      ask: ["freeze"],
      answer:
        "Салаты с майонезом, свежими огурцами и помидорами замораживать нельзя: после разморозки они расслоятся и станут водянистыми.",
    },
    {
      topic: "egg",
      ask: ["freeze"],
      answer:
        "Варёные яйца замораживать не стоит — белок станет резиновым. Сырые можно заморозить без скорлупы, взбив, до 3 месяцев.",
    },
    {
      topic: "potato",
      ask: ["freeze"],
      answer:
        "Варёный картофель кусками после заморозки становится водянистым. Пюре и драники замораживаются нормально.",
    },
    {
      ask: ["freeze"],
      answer:
        "Хорошо замораживаются котлеты, тефтели, пельмени, блины, сырники, бульоны и большинство супов, тушёное мясо — на 2–3 месяца при −18 °C. Плохо — салаты с майонезом, свежие овощи, варёные яйца. Остудите блюдо, разложите порциями и подпишите дату.",
    },
    {
      ask: ["defrost"],
      answer:
        "Лучше всего размораживать в холодильнике: кусок мяса около 1 кг — за 12–24 часа. Быстрее — в закрытом пакете в холодной воде, меняя её каждые 30 минут, или в микроволновке в режиме разморозки и сразу готовить. Сырое мясо после разморозки повторно не замораживайте — только после приготовления.",
    },
    {
      topic: "chicken",
      ask: ["done"],
      answer:
        "Курица готова, когда сок при проколе прозрачный, а мясо у кости и в самой толстой части не розовое — внутри около 75 °C. Филе обычно готово через 20–25 минут варки или 7–10 минут жарки кусочками.",
    },
    {
      topic: "fish",
      ask: ["done"],
      answer:
        "Рыба готова, когда мякоть стала непрозрачной и легко делится вилкой на волокна. Филе на сковороде — 3–4 минуты с каждой стороны.",
    },
    {
      topic: "cake",
      ask: ["done"],
      answer:
        "Проткните выпечку в самом высоком месте деревянной шпажкой: если вышла сухой, без липкого теста, — готово. Ещё признак: края отходят от формы, а верх пружинит.",
    },
    {
      topic: "meat",
      ask: ["done"],
      answer:
        "Мясо готово, когда сок при проколе прозрачный, без розового. Курица и фарш — обязательно до полной готовности (внутри около 75 °C), свинина — около 70 °C.",
    },
    {
      topic: "potato",
      ask: ["done"],
      answer:
        "Картофель готов, когда нож или вилка входит легко, без сопротивления.",
    },
    {
      topic: "pasta",
      ask: ["done"],
      answer:
        "Попробуйте одну макаронину: снаружи мягкая, а в серединке лёгкая упругость — готово (это и есть «аль денте»). Если хочется мягче — ещё 1–2 минуты.",
    },
    {
      topic: "pancake",
      ask: ["done"],
      answer:
        "Блин пора переворачивать, когда края подрумянились и начали отходить, а сверху тесто перестало быть жидким.",
    },
    {
      ask: ["done"],
      answer:
        "Общие признаки: мясо и курица — прозрачный сок без розового; рыба — непрозрачная и легко делится на волокна; овощи и картофель — нож входит легко; выпечка — сухая деревянная шпажка.",
    },
    {
      topic: "salty",
      ask: ["fix"],
      answer:
        "Если пересолили суп — разбавьте водой или несолёным бульоном и добавьте ещё овощей или крупы, можно подать со сметаной. Если второе — подайте с несолёным гарниром или добавьте несолёных овощей. Картошка «впитывает соль» совсем немного — это миф.",
    },
    {
      topic: "pepper",
      ask: ["fix"],
      answer:
        "Если получилось слишком остро — добавьте что-то молочное (сметану, йогурт, сливки), немного сахара или увеличьте основу блюда: больше гарнира, овощей, бульона.",
    },
    {
      topic: "semolina",
      ask: ["fix"],
      answer:
        "Комочки в манной каше разбейте венчиком или погружным блендером. В следующий раз всыпайте манку тонкой струйкой, всё время помешивая.",
    },
    {
      topic: "rice",
      ask: ["fix"],
      answer:
        "Чтобы рис не слипался, промойте его до прозрачной воды и не мешайте во время варки. Если уже слипся, а нужен гарнир — промойте горячей водой и прогрейте на сковороде с маслом.",
    },
    {
      topic: "pancake",
      ask: ["fix"],
      answer:
        "Если блины рвутся или прилипают: сковорода должна быть хорошо разогрета и смазана, в тесто добавьте 1–2 ст. л. масла и дайте ему постоять 15–20 минут. Если тесто жидкое — добавьте ложку муки, если густое — немного молока.",
    },
    {
      topic: "syrniki",
      ask: ["fix"],
      answer:
        "Если сырники растекаются, творог слишком влажный: отожмите его через марлю или добавьте 1–2 ст. л. муки или манки и уберите массу на 15 минут в холодильник. Жарьте на среднем огне.",
    },
    {
      topic: "cutlet",
      ask: ["fix"],
      answer:
        "Чтобы котлеты не разваливались: добавьте в фарш яйцо и размоченный в молоке хлеб, хорошо вымесите и отбейте фарш о миску, подержите 15 минут в холодильнике. Переворачивайте, когда низ схватился корочкой.",
    },
    {
      topic: "meat",
      ask: ["fix"],
      answer:
        "Жёсткое мясо можно спасти долгим тушением: залейте водой или бульоном и тушите под крышкой на слабом огне ещё 30–60 минут. В следующий раз режьте поперёк волокон.",
    },
    {
      topic: "cake",
      ask: ["fix"],
      answer:
        "Если верх уже румяный, а внутри сыро — накройте форму фольгой, убавьте до 160 °C и допеките. Пирог мог осесть, если духовку открыли в первые 20–25 минут или он недопёкся; осевший кекс можно нарезать и подать с кремом или ягодами.",
    },
    {
      topic: "dough",
      ask: ["fix"],
      answer:
        "Если тесто липнет к рукам, смажьте руки растительным маслом вместо того, чтобы досыпать муку, и дайте тесту 10–15 минут отдохнуть под плёнкой. Дрожжевое тесто не поднялось — проверьте, что место тёплое и дрожжи не просрочены.",
    },
    {
      topic: "eggplant",
      ask: ["fix"],
      answer:
        "Чтобы баклажаны не горчили, нарежьте, посыпьте солью на 20 минут, потом промойте и обсушите. У современных сортов горечи почти нет.",
    },
    {
      topic: "soup",
      ask: ["fix"],
      answer:
        "Слишком густой суп разбавьте горячей водой или бульоном. Слишком жидкий — поварить без крышки, добавить крупы или картошки, или влить муку, разведённую в холодной воде.",
    },
    {
      ask: ["fix"],
      answer:
        "Слишком солёно — разбавьте основой (вода, бульон, несолёный гарнир). Слишком остро — добавьте сметану или йогурт. Слишком сладко — каплю лимонного сока и щепотку соли. Пригорело — не мешайте, сразу переложите верхнюю часть в чистую посуду.",
    },
    {
      topic: "onion",
      ask: ["how"],
      answer:
        "Чтобы не плакать от лука, охладите его в холодильнике, режьте очень острым ножом и смачивайте доску водой. Корешок отрезайте в последнюю очередь.",
    },
    {
      topic: "cabbage",
      ask: ["fix"],
      answer:
        "Капуста в салате станет мягче и сочнее, если перетереть её руками с солью и оставить на 10 минут.",
    },
    {
      topic: "chicken",
      ask: ["safety"],
      answer:
        "Сырую курицу мыть не нужно: брызги разносят бактерии по кухне. Достаточно обсушить бумажным полотенцем. Готовьте до полной готовности — без розового внутри.",
    },
    {
      topic: "egg",
      ask: ["safety"],
      answer:
        "Сырые яйца могут быть заражены сальмонеллой. Покупайте свежие, храните в холодильнике и мой непосредственно перед тем, как разбить. Детям, пожилым и беременным лучше давать яйца, сваренные до плотного желтка.",
    },
    {
      topic: "cooked",
      ask: ["safety", "store"],
      answer:
        "Готовую еду не оставляйте в тепле больше 2 часов — уберите в холодильник. Суп на плите «до утра» — плохая идея. Разогревайте один раз и до кипения.",
    },
    {
      ask: ["safety"],
      answer:
        "Главные правила: готовую еду убирать в холодильник в течение 2 часов, курицу и фарш доводить до полной готовности, сырое мясо резать на отдельной доске. Если продукт пахнет или выглядит странно — не рискуйте.",
    },
  ],
  tC =
    /(^|\s)(сколько|как|чем|почему|зачем|можно ли|можно|какие|какая|какой|какое|что делать|что будет|нужно ли|надо ли|стоит ли|правда ли|подскажи|скажи|расскажи|научи)(\s|$)/,
  aC =
    /(^|^привет\s+|^слушай\s+|^а\s+)(с?вари(шь|те)?|отвари|пожарь|запеки|потуши)\s/,
  YD =
    /(как|научи|подскажи|расскажи)\s+(\S+\s+)?(правильно\s+|быстро\s+|вкусно\s+)?(приготовить|готовить|сделать|испечь|печь)/;
function nl(e, t = /\?\s*$/.test(e)) {
  let n = e.toLowerCase().replace(/ё/g, "е"),
    a = GD(n);
  if (
    !a.length ||
    !(
      t ||
      tC.test(n) ||
      aC.test(n) ||
      a.some((o) =>
        ["fix", "ratio", "measure", "salt", "defrost", "portion"].includes(o),
      )
    ) ||
    (a.length === 1 && a[0] === "freeze" && !tC.test(n) && !t) ||
    (a.length === 1 && a[0] === "how" && YD.test(n))
  )
    return null;
  let s = Object.keys(WS)
    .map((o) => {
      let l = WS[o].exec(n);
      return l ? { t: o, at: l.index } : null;
    })
    .filter(Boolean);
  s.sort((o, l) => o.at - l.at);
  for (let o of [!0, !1])
    for (let l of a)
      for (let { t: u } of s) {
        let f = eC.find(
          (p) => p.topic === u && (o ? p.ask[0] === l : p.ask.includes(l)),
        );
        if (f) return nC(f, n);
      }
  if (a.every((o) => o === "how" || o === "time")) return null;
  let r = eC.find((o) => !o.topic && o.ask.some((l) => a.includes(l)));
  return r ? nC(r, n) : null;
}
function nC(e, t) {
  return {
    text:
      (aC.test(t) ? "Сам приготовить не смогу, но подскажу, как. " : "") +
      e.answer,
    option: e.option,
  };
}
var Ca = [
    { label: "Что-нибудь быстрое", text: "что-нибудь быстрое, минут 20" },
    { label: "Хочу суп", text: "хочу суп" },
    { label: "Из того, что есть", text: "только из того, что есть дома" },
    { label: "Удиви меня", text: "удиви меня" },
  ],
  iC = {
    breakfast: [
      { label: "Сырники или оладьи", text: "хочу сырники или оладьи" },
      { label: "Что-то из яиц", text: "хочу что-нибудь из яиц" },
      { label: "Каша", text: "хочу кашу" },
      { label: "Удиви меня", text: "удиви меня на завтрак" },
    ],
    lunch: [
      { label: "Суп", text: "хочу суп" },
      { label: "Что-то сытное", text: "хочу что-нибудь сытное" },
      { label: "Удиви меня", text: "удиви меня на обед" },
    ],
    dinner: [
      { label: "Лёгкий ужин", text: "хочу что-то лёгкое" },
      { label: "Быстро, до 30 минут", text: "что-нибудь до 30 минут" },
      { label: "Сытное", text: "хочу что-нибудь сытное" },
      { label: "Удиви меня", text: "удиви меня на ужин" },
    ],
    snack: [
      { label: "Что-то сладкое", text: "хочу сладкое" },
      { label: "Быстро, до 15 минут", text: "что-нибудь до 15 минут" },
    ],
  };
function Xp(e) {
  return e >= 5 && e < 11
    ? "breakfast"
    : e >= 11 && e < 16
      ? "lunch"
      : e >= 16 && e < 23
        ? "dinner"
        : "snack";
}
var XD = {
  breakfast: "завтрак",
  lunch: "обед",
  dinner: "ужин",
  snack: "перекус",
};
function c0(e) {
  if (/(завтрак|позавтракать|с утра|утром)/.test(e)) return "breakfast";
  if (/(обед|пообедать|в обед)/.test(e)) return "lunch";
  if (/(ужин|поужинать|вечером)/.test(e)) return "dinner";
  if (/(перекус|перекусить|ночью|на ночь)/.test(e)) return "snack";
}
var sC = [
    "Почему картошка никогда не опаздывает? Она всегда в мундире.",
    "Борщ — единственное блюдо, которое на второй день становится лучше, чем было задумано.",
    "Рецепт идеального ужина простой: найти его здесь, а посуду пусть моет тот, кто не готовил.",
    "Повар спрашивает у пельменя: «Ты всплыл?» Пельмень: «Нет, это я просто так лежу на поверхности».",
  ],
  Ut = (e, t) => t.test(e);
function u0(e, t = new Date()) {
  let n = _e(e)
    .replace(/[!?.,)(]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!n) return null;
  let a = t.getHours(),
    i = c0(n),
    s = Xp(a),
    r =
      a >= 5 && a < 12
        ? "Доброе утро"
        : a >= 12 && a < 18
          ? "Добрый день"
          : a >= 18 && a < 23
            ? "Добрый вечер"
            : "Доброй ночи",
    o = nl(n, /\?\s*$/.test(e));
  if (o)
    return {
      kind: "faq",
      reply: o.text,
      options: [
        ...(o.option ? [o.option] : []),
        { label: "Что приготовить?", text: "удиви меня" },
      ],
    };
  if (
    Ut(
      n,
      /(удиви|на твой вкус|на твое усмотрение|сам выбери|выбери сам|сама выбери|выбери за меня|что угодно|что-нибудь любое|любое блюдо|не знаю что (хочу|приготовить|поесть)|ничего не хочу|сам не знаю|сама не знаю|без разницы|мне все равно|все равно что|случайн|рандом|идеи|подкинь иде|посоветуй что)/,
    )
  )
    return { kind: "surprise", reply: "", surprise: { meal: i ?? s } };
  if (
    Ut(
      n,
      /^(что|чего) (бы )?(приготовить|сготовить|поесть|покушать|съесть|сварить)( (сегодня|сейчас|на (завтрак|обед|ужин)))?( бы)?$/,
    ) ||
    Ut(n, /^(что|чем) (на|бы на)? ?(завтрак|обед|ужин)$/) ||
    Ut(n, /^(что )?(на )?(завтрак|обед|ужин|перекус)$/)
  )
    return { kind: "surprise", reply: "", surprise: { meal: i ?? s } };
  if (
    i &&
    Ut(
      n,
      /^(покажи|подскажи|посоветуй|предложи|дай|давай|хочу|хочется|нужн\S*|есть)? ?(что-нибудь|что-то|чего-нибудь|идеи|варианты|какие-нибудь идеи|рецепт|блюдо)? ?(на|для|к) (завтрак|обед|ужин|перекус)\S*$/,
    )
  )
    return { kind: "surprise", reply: "", surprise: { meal: i } };
  if (Ut(n, /(анекдот|шутк|пошути|рассмеши)/))
    return {
      kind: "joke",
      reply:
        sC[t.getMinutes() % sC.length] +
        `

А теперь серьёзно: что будем готовить?`,
      options: Ca,
    };
  if (
    Ut(
      n,
      /(я )?(приготовил|приготовила|сготовил|сготовила|получилось|было вкусно|вкусно получилось|всем понравилось)/,
    )
  )
    return {
      kind: "cooked",
      reply:
        "Ура, приятного аппетита! Понравилось — сохраните рецепт сердечком, он будет в «Сохранённом». Подобрать что-нибудь на следующий раз?",
      options: Ca,
    };
  if (
    Ut(
      n,
      /^(я )?(так |очень |ужасно |сильно )?(голоден|голодна|голодный|голодная|проголодал\S*|(хочу|хочется|охота|хотим|хочу уже|хочу очень)( очень| сильно| так)? (есть|кушать|покушать|поесть|перекусить|еды|еду)|(есть|кушать|поесть|покушать) (хочу|хочется|охота)|жрать хочу|что (бы )?(поесть|покушать))( очень| ужасно| сильно| уже)?$/,
    )
  )
    return {
      kind: "hungry",
      reply:
        "Понял, без долгих раздумий — вот что побыстрее:",
      surprise: { meal: i ?? s },
    };
  let l = Ut(
      n,
      /^(привет\S*|прив|приветик|здравствуй\S*|здраствуй\S*|здрасте|здорово|хай|хеллоу|hello|hi|салют|йо|добр\S* (утро|день|вечер|ночи)|доброго (утра|дня|вечера)|ку|хелло|алло)(\s|$)/,
    ),
    u = Ut(
      n,
      /(как (у тебя )?(дела|делишки|жизнь|настроение|ты|поживаешь|сам|сама)|что нового|как оно)/,
    ),
    f = Ut(
      n,
      /(кто ты|ты кто|что ты такое|ты бот|ты робот|ты ии|ты нейросеть|ты человек|как тебя зовут|твое имя)/,
    ),
    p = Ut(
      n,
      /(что ты умеешь|что умеешь|как (тобой )?пользоваться|как это работает|помощь|помоги|help|что можно спросить|что делать|не понимаю как)/,
    ),
    m =
      Ut(
        n,
        /^(спасибо|спс|благодарю|пасиб|спасиб\S*|сенкс|thanks|спасибки|мерси)/,
      ) || Ut(n, /(спасибо|благодарю)$/),
    y =
      Ut(
        n,
        /^(пока( пока)?|пока-пока|всем пока|до свидания|до встречи|бывай|споки|спокойной ночи|всего доброго|увидимся|до завтра)( всем| тебе| спасибо)?$/,
      ) || Ut(n, /^(до свидания|спокойной ночи|всего доброго|до встречи)/),
    S = Ut(
      n,
      /^(класс|круто|супер|отлично|здорово получилось|молодец|красава|ты лучший|ты лучшая|топ|огонь|норм|нормально|хорошо|понятно|ясно|понял|поняла)$/,
    ),
    w = Ut(
      n,
      /^(да|ага|угу|давай|можно|конечно|ок|окей|ok|ладно|хочу|го|погнали|естественно)$/,
    ),
    v = Ut(n, /^(нет|неа|не надо|не хочу|не|не нужно|отмена)$/),
    b = Ut(
      n,
      /(дурак|тупой|тупая|глупый|бесполезн|ерунд|фигн|отстой|не работает|не понимаешь|бред)/,
    ),
    g = /^(привет|прив|хай|салют|йо|ку|хелло|hello|hi|здорово)/.test(n)
      ? "Привет"
      : r;
  if (m)
    return {
      kind: "thanks",
      reply: "Пожалуйста! Приятного аппетита. Захотите ещё идей — пишите.",
      prefix: "Пожалуйста!",
      options: [
        { label: "Покажи другое", text: "покажи другое" },
        { label: "Удиви меня", text: "удиви меня" },
      ],
    };
  if (y)
    return {
      kind: "bye",
      reply:
        a >= 18 || a < 5
          ? "Спокойной ночи! Заглядывайте, когда снова встанет вопрос «что приготовить»."
          : "Хорошего дня и вкусного " +
            (s === "breakfast"
              ? "завтрака"
              : s === "lunch"
                ? "обеда"
                : "ужина") +
            "! Заглядывайте, когда снова встанет вопрос «что приготовить».",
    };
  if (f)
    return {
      kind: "who",
      reply:
        "Я Шеф — кулинарный помощник. Подберу рецепт под то, что есть в холодильнике, сколько у вас времени и какое настроение. Рассказывайте!",
      options: Ca,
    };
  if (p)
    return {
      kind: "help",
      reply: `Пишите как другу, например:
• «есть курица и картошка, минут 40»
• «хочу суп без мяса»
• «устал, что-нибудь попроще»
• «гости через час, человек шесть»
• «на завтрак что-то сладкое»
Можно голосом — кнопка с микрофоном. Уточнять можно по ходу: «побыстрее», «без сыра», «покажите другое».`,
      options: Ca,
    };
  if (u)
    return {
      kind: "how",
      reply:
        (l ? g + "! " : "") +
        "У меня всё отлично: плита горячая, рецепты наготове. А у вас что сегодня в планах на " +
        XD[i ?? s] +
        "?",
      prefix: l ? g + "!" : void 0,
      options: iC[i ?? s],
    };
  if (l) {
    let x = i ?? s,
      N =
        x === "breakfast"
          ? "Подобрать что-нибудь на завтрак?"
          : x === "lunch"
            ? "Подобрать что-нибудь на обед?"
            : x === "dinner"
              ? "Что будем готовить на ужин?"
              : "Хочется перекусить?";
    return {
      kind: "greeting",
      reply:
        g +
        "! " +
        N +
        " Напишите, что есть дома или какое настроение.",
      prefix: g + "!",
      options: iC[x],
    };
  }
  return b
    ? {
        kind: "rude",
        reply:
          "Похоже, я не понял, что нужно. Давайте проще: назовите 2–3 продукта, которые есть дома, или сколько у вас времени — и я подберу рецепт.",
        options: Ca,
      }
    : S
      ? {
          kind: "praise",
          reply: "Рад помочь! Если хотите, подберу что-нибудь ещё.",
          options: [
            { label: "Покажи другое", text: "покажи другое" },
            { label: "Удиви меня", text: "удиви меня" },
          ],
        }
      : w
        ? {
            kind: "agree",
            reply:
              "Тогда расскажите чуть подробнее: что есть дома, сколько времени или чего хочется?",
            options: Ca,
          }
        : v
          ? {
              kind: "refuse",
              reply:
                "Хорошо. Если передумаете — просто напишите, чего хочется.",
              options: Ca,
            }
          : null;
}
var QD = [
  [
    "kcal",
    /(калори|ккал|кбжу|белк[аиу]|жир[аыо]в?|углевод|питательн|сколько в н[её]м|полезн)/,
  ],
  ["freeze", /(заморозить|замораживать|заморозк|в морозилк)/],
  [
    "store",
    /(сколько (дней )?(можно )?(хран|простоит|лежит)|хранится|храниться|как хранить|на сколько дней|до завтра|на завтра)/,
  ],
  [
    "kids",
    /(дет(ям|ей|и|ск)|реб[её]нк|малыш|сыну|дочк|дочер|школьник|в садик)/,
  ],
  ["lenten", /(постн|в пост|можно в пост|пощусь)/],
  [
    "vegetarian",
    /(вегетариан|есть ли (в н[её]м |там )?мяс|мясо есть|с мясом ли)/,
  ],
  ["spicy", /(остр[оаыйяе]|остренько|жгуч|перчит)/],
  [
    "allergens",
    /(аллерг|глютен|лактоз|непереносим|орех[иа]?\s|есть ли (в н[её]м |там )?(молок|яйц|орех|рыб))/,
  ],
  [
    "replace",
    /(чем (можно )?(за|под)мени|на что (можно )?замени|вместо|замена|если нет|если не[тб]у|можно (ли )?без|можно не (класть|добавлять))/,
  ],
  [
    "amount",
    /(сколько (нужно |надо |класть |положить |брать |идет |идёт )?(\S+)( нужно| надо| класть| положить)?\s*\??$|сколько (грамм|г|штук|ложек|стаканов) )/,
  ],
  [
    "ingredients",
    /(что (нужно|надо|понадобится|потребуется|купить)|какие (продукты|ингредиенты)|из чего|состав|ингредиент|список продуктов)/,
  ],
  [
    "servings",
    /(на сколько (человек|порций|персон|едоков)|сколько (порций|человек)|скольких|хватит ли|на (большую )?семью хватит|сколько получится|выход)/,
  ],
  [
    "cookware",
    /(посуд|в ч[её]м (готовить|печь|жарить|варить)|нужна ли (духовк|мультиварк|сковород|блендер)|без духовки|без блендера|мультиварк|какая форма|какую форму)/,
  ],
  [
    "difficulty",
    /(сложн|трудн|получится ли|справлюсь|для новичк|легко ли|просто ли)/,
  ],
  ["side", /(с ч[её]м (подавать|есть|едят|кушать)|какой гарнир|гарнир)/],
  ["budget", /(дорог|дешев|дешёв|бюджетн|по деньгам|сколько стоит)/],
  [
    "time",
    /(сколько (времени|минут|по времени|часов)|как долго|долго ли|долго (готов|делать|варить)|быстро ли|быстро (готов|делается)|за сколько|время (готовки|приготовления))/,
  ],
];
function p0(e) {
  let t = _e(e);
  return QD.filter(([, n]) => n.test(t)).map(([n]) => n);
}
function m0(e) {
  let t = _e(e);
  return /(^|\s)(его|ее|него|нее|неё|ним|ней|нем|нём|этот|эта|это|эту|этого|этой|эти|этих|они|их|них|он|она|оно|тут|там|который|какой из|какое из|какую из|какие из|кто из|из них|из этих|из этого|в нем|в нём|в ней|рецепт[еау]?)(\s|$|\?)/.test(
    t,
  );
}
var FD = [
  [/(быстре|быстрей|самый быстр|быстрее всего|меньше времени)/, "fast"],
  [
    /(легче по калори|меньше калори|менее калорийн|диетичн|полегче|самый л[её]гк|легче|легкое|л[её]гкий)/,
    "light",
  ],
  [/(сытне|посытне|калорийне|больше калори|самый сытн)/, "hearty"],
  [/(проще|попроще|самый прост|легче приготов|легче сделать)/, "easy"],
  [/(дешевле|подешевле|бюджетне|самый дешев)/, "cheap"],
];
function rC(e, t = F) {
  let n = pt(e)
      .filter((l) => !/^[,.;:!?-]$/.test(l))
      .map(Xe),
    a = $o(),
    i = new Set(Oi.map((l) => "dish:" + l.key)),
    s = (l) => n.some((u, f) => l.every((p, m) => n[f + m] === p)),
    r = a.entries
      .filter(
        (l) => l.key.startsWith("dish:r:") && l.words.length >= 2 && s(l.words),
      )
      .map((l) => l.key.slice(7));
  if (r.length) return t.filter((l) => r.includes(l.id));
  let o = a.entries
    .filter((l) => !l.key.startsWith("dish:r:") && !i.has(l.key) && s(l.words))
    .map((l) => l.key.slice(5));
  return o.length
    ? t.filter((l) => o.some((u) => a.titleStems.get(l.id)?.has(u))).slice(0, 6)
    : [];
}
var Ja = (e, t, n, a) => {
  let i = e % 10,
    s = e % 100;
  return i === 1 && s !== 11
    ? t
    : i >= 2 && i <= 4 && (s < 12 || s > 14)
      ? n
      : a;
};
function mu(e) {
  if (e < 60) return e + " " + Ja(e, "минута", "минуты", "минут");
  let t = Math.floor(e / 60),
    n = e % 60,
    a =
      t === 1 && n === 30
        ? "полтора часа"
        : t + " " + Ja(t, "час", "часа", "часов");
  return t === 1 && n === 30
    ? a
    : a + (n ? " " + n + " " + Ja(n, "минута", "минуты", "минут") : "");
}
var d0 = { easy: "простой", medium: "средней сложности", hard: "сложный" },
  JD = {
    pan: "сковорода",
    pot: "кастрюля",
    oven: "духовка",
    blender: "блендер",
    multicooker: "мультиварка",
    airfryer: "аэрогриль",
    microwave: "микроволновка",
  },
  al = (e) => (me(e)?.aliases[0] || me(e)?.name || e).toLowerCase();
function f0(e, t) {
  let n = new Set(pt(e).map(Xe));
  return (
    t.ingredients.find((a) =>
      [a.name, ...(me(a.id)?.aliases || [])].some((s) => {
        let r = pt(s).map(Xe);
        return r.length > 0 && r.every((o) => n.has(o));
      }),
    ) ||
    t.ingredients.find((a) =>
      pt(a.name)
        .map(Xe)
        .some((i) => i.length >= 4 && n.has(i)),
    )
  );
}
function Qp(e, t, n, a) {
  let i = "«" + t.title + "»";
  switch (e) {
    case "time": {
      let s = mu(t.totalMinutes),
        r =
          t.activeMinutes && t.activeMinutes < t.totalMinutes
            ? ", из них у плиты — " + mu(t.activeMinutes)
            : "";
      return { short: s, long: i + " готовится " + s + r + "." };
    }
    case "kcal": {
      let s = Yt(t).perServing,
        r =
          "≈ " +
          s.kcal +
          " ккал на порцию (белки " +
          s.protein +
          " г, жиры " +
          s.fat +
          " г, углеводы " +
          s.carbs +
          " г)";
      return {
        short: "≈ " + s.kcal + " ккал",
        long:
          "Порция " +
          i +
          " — " +
          r.replace(" на порцию", "") +
          ". Это примерный расчёт по продуктам.",
      };
    }
    case "servings": {
      let s = t.yields ? " (" + Up(t, n).replace("≈ ", "примерно ") + ")" : "";
      return {
        short: "на " + t.servings + " порц.",
        long:
          i +
          " рассчитан на " +
          t.servings +
          " " +
          Ja(t.servings, "порцию", "порции", "порций") +
          s +
          ". В карточке можно выбрать от " +
          t.minServings +
          " до " +
          t.maxServings +
          " — продукты пересчитаются сами.",
      };
    }
    case "freeze":
      return t.freezerDays
        ? {
            short: "можно, до " + t.freezerDays + " " + Ja(t.freezerDays, "дня", "дней", "дней"),
            long:
              i +
              " можно заморозить: хранится в морозилке до " +
              t.freezerDays +
              " " +
              Ja(t.freezerDays, "дня", "дней", "дней") +
              ". Размораживайте в холодильнике.",
          }
        : Ne(t) === "salad"
          ? {
              short: "не стоит",
              long:
                i +
                " замораживать не стоит: после разморозки салат станет водянистым.",
            }
          : {
              short: "не указано",
              long:
                "Для " +
                i +
                " заморозка в рецепте не указана — лучше съесть свежим, за " +
                (t.storageDays
                  ? t.storageDays +
                    " " +
                    Ja(t.storageDays, "день", "дня", "дней")
                  : "2–3 дня") +
                " в холодильнике.",
            };
    case "store": {
      let s = t.storageDays;
      return s !== void 0
        ? {
            short: s ? s + " " + Ja(s, "день", "дня", "дней") : "сразу",
            long: s
              ? i +
                " хранится в холодильнике " +
                s +
                " " +
                Ja(s, "день", "дня", "дней") +
                (t.freezerDays
                  ? ", в морозилке — до " + t.freezerDays + " дней"
                  : "") +
                "."
              : i + " лучше съесть сразу — он не для хранения.",
          }
        : Ne(t) === "salad" &&
            t.ingredients.some((r) =>
              /mayonnaise|sour-cream|plain-yogurt/.test(r.id),
            )
          ? {
              short: "до суток",
              long:
                "Салат " +
                i +
                " после заправки храните в холодильнике не дольше суток. Если нужно дольше — держите нарезку отдельно и заправляйте перед подачей.",
            }
          : {
              short: "2–3 дня",
              long:
                "Срок для " +
                i +
                " не указан; обычно готовая еда хранится в холодильнике 2–3 дня.",
            };
    }
    case "kids": {
      let s = t.tags.includes("spicy");
      return t.kids === !0 && !s
        ? {
            short: "подходит",
            long:
              i +
              " подходит детям постарше. Для малышей до 3 лет питание лучше согласовать с педиатром.",
          }
        : t.kids === !1 || s
          ? {
              short: "не лучший выбор",
              long:
                i +
                (s
                  ? " острое — детям лучше без перца или выбрать другое блюдо."
                  : " — не самый детский вариант."),
            }
          : {
              short: "скорее да",
              long:
                "Острого в " +
                i +
                " нет, так что детям обычно подходит. Учитывайте аллергии: " +
                (t.allergens.length
                  ? t.allergens
                      .map((r) => (Oe[r] || r).toLowerCase())
                      .join(", ")
                  : "основных аллергенов нет") +
                ". Для малышей до 3 лет — по согласованию с педиатром.",
            };
    }
    case "lenten": {
      if (Ar(t))
        return {
          short: "постное",
          long: i + " — постное: без мяса, рыбы, молочного и яиц.",
        };
      let s = t.ingredients
        .filter(
          (r) =>
            !r.optional &&
            (me(r.id)?.groups || []).some((o) =>
              [
                "meat",
                "poultry",
                "chicken",
                "fish",
                "seafood",
                "dairy",
                "eggs",
              ].includes(o),
            ),
        )
        .map((r) => al(r.id));
      return {
        short: "не постное",
        long:
          i + " не постное: в составе " + _i([...new Set(s)].slice(0, 4)) + ".",
      };
    }
    case "vegetarian": {
      let s = t.tags.includes("vegetarian");
      return {
        short: s ? "без мяса" : "с мясом или рыбой",
        long: s ? i + " — без мяса и рыбы." : i + " — с мясом или рыбой.",
      };
    }
    case "spicy": {
      let s = t.tags.includes("spicy");
      return {
        short: s ? "острое" : "не острое",
        long: s
          ? i + " острое. Перец можно положить меньше по вкусу."
          : i + " не острое.",
      };
    }
    case "allergens": {
      let s = t.allergens.map((r) => (Oe[r] || r).toLowerCase());
      return {
        short: s.length ? s.join(", ") : "нет основных",
        long: s.length
          ? "В рецепте " +
            i +
            " есть: " +
            s.join(", ") +
            ". Проверьте и состав конкретных упаковок."
          : "В рецепте " +
            i +
            " нет основных аллергенов (молочное, яйца, глютен, орехи, рыба, соя).",
      };
    }
    case "ingredients": {
      let s = t.ingredients.map((r) => {
        let o = Ui(r, t, Math.min(t.maxServings, Math.max(t.minServings, n)));
        return (
          "• " +
          r.name +
          " — " +
          du(o.amount) +
          " " +
          o.unit +
          (r.optional ? " (по желанию)" : "")
        );
      });
      return {
        short: t.ingredients.length + " продуктов",
        long:
          "Для " +
          i +
          " на " +
          Math.min(t.maxServings, Math.max(t.minServings, n)) +
          " " +
          Ja(n, "порцию", "порции", "порций") +
          `:
` +
          s.join(`
`),
      };
    }
    case "amount": {
      let s = f0(a, t);
      if (!s) return null;
      let r = Math.min(t.maxServings, Math.max(t.minServings, n)),
        o = Ui(s, t, r);
      return {
        short: du(o.amount) + " " + o.unit,
        long:
          "В рецепте " +
          i +
          " на " +
          r +
          " " +
          Ja(r, "порцию", "порции", "порций") +
          ": " +
          s.name.toLowerCase() +
          " — " +
          du(o.amount) +
          " " +
          o.unit +
          ".",
      };
    }
    case "replace": {
      let s = f0(a, t);
      return s
        ? s.swap?.length
          ? {
              short: s.swap.map(al).join(" или "),
              long:
                "Замена в рецепте " +
                i +
                ": " +
                al(s.id) +
                " → " +
                s.swap.map(al).join(" или ") +
                ".",
            }
          : s.optional
            ? {
                short: "можно без",
                long:
                  al(s.id).charAt(0).toUpperCase() +
                  al(s.id).slice(1) +
                  " в рецепте " +
                  i +
                  " по желанию — можно просто не класть.",
              }
            : null
        : null;
    }
    case "cookware": {
      let s = t.appliances.map((o) => JD[o] || o),
        r = t.cookware?.length ? " Посуда: " + t.cookware.join(", ") + "." : "";
      return {
        short: s.join(", ") || "без плиты",
        long:
          (s.length
            ? "Для " + i + " нужны: " + s.join(", ") + "."
            : i + " готовится без плиты и духовки.") + r,
      };
    }
    case "difficulty":
      return {
        short: d0[t.difficulty],
        long:
          i +
          " — " +
          d0[t.difficulty] +
          " рецепт: " +
          t.steps.length +
          " " +
          Ja(t.steps.length, "шаг", "шага", "шагов") +
          ", у плиты около " +
          mu(t.activeMinutes || t.totalMinutes) +
          "." +
          (t.difficulty === "easy" ? " Справитесь :)" : ""),
      };
    case "budget": {
      let s = t.budget ? Pb[t.budget] : null;
      return s
        ? { short: s.toLowerCase(), long: i + ": " + s.toLowerCase() + "." }
        : null;
    }
    case "side": {
      if (
        t.needsSide === !1 ||
        ["soup", "salad", "breakfast", "baking", "dessert"].includes(Ne(t))
      )
        return {
          short: "без гарнира",
          long: i + " — самостоятельное блюдо, гарнир не нужен.",
        };
      let s = F.filter((r) => Ne(r) === "side")
        .slice(0, 3)
        .map((r) => "«" + r.title + "»");
      return {
        short: "с гарниром",
        long:
          i +
          " хорошо подать с гарниром" +
          (s.length
            ? ": например, " + _i(s) + "."
            : " — картофельным пюре, рисом, гречкой или макаронами."),
      };
    }
  }
}
var Fp = (e) => ({
  label:
    "Открыть «" +
    (e.title.length > 28 ? e.title.slice(0, 26) + "…" : e.title) +
    "»",
  open: e.id,
});
function Jp(e, t, n) {
  if (!t.length) return null;
  let a = _e(e),
    i = p0(a);
  i.includes("amount") &&
    !t.some((l) => f0(a, l)) &&
    (i = i.filter((l) => l !== "amount")),
    i.includes("amount") &&
      i.includes("ingredients") &&
      (i = i.filter((l) => l !== "ingredients")),
    i.includes("replace") &&
      i.includes("amount") &&
      (i = i.filter((l) => l !== "amount"));
  let s = FD.find(([l]) => l.test(a));
  if (t.length > 1 && s && /(какой|какое|какую|что|кто|который)/.test(a)) {
    let l = {
        fast: (m) => m.totalMinutes,
        light: (m) => Yt(m).perServing.kcal,
        hearty: (m) => -Yt(m).perServing.kcal,
        easy: (m) =>
          ({ easy: 0, medium: 1, hard: 2 })[m.difficulty] * 100 +
          (m.activeMinutes || m.totalMinutes),
        cheap: (m) => ({ low: 0, medium: 1, high: 2 })[m.budget] ?? 1,
      }[s[1]],
      u = [...t].sort((m, y) => l(m) - l(y))[0],
      f = {
        fast: mu(u.totalMinutes),
        light: "≈ " + Yt(u).perServing.kcal + " ккал на порцию",
        hearty: "≈ " + Yt(u).perServing.kcal + " ккал на порцию",
        easy:
          d0[u.difficulty] +
          ", у плиты " +
          mu(u.activeMinutes || u.totalMinutes),
        cheap: u.budget ? Pb[u.budget].toLowerCase() : "обычные продукты",
      }[s[1]];
    return {
      text:
        {
          fast: "Быстрее всего",
          light: "Легче всего",
          hearty: "Сытнее всего",
          easy: "Проще всего",
          cheap: "Дешевле всего",
        }[s[1]] +
        " — «" +
        u.title +
        "»: " +
        f +
        ".",
      options: [Fp(u)],
    };
  }
  if (!i.length) return null;
  let r = i[0];
  if (t.length === 1) {
    let l = Qp(r, t[0], n, a);
    if (!l) return null;
    let u = i
      .slice(1, 3)
      .map((f) => Qp(f, t[0], n, a)?.long)
      .filter(Boolean);
    return {
      text: [l.long, ...u].join(`
`),
      options: [Fp(t[0])],
    };
  }
  if (r === "ingredients" || r === "amount" || r === "replace") {
    let l = Qp(r, t[0], n, a);
    return l ? { text: l.long, options: t.slice(0, 3).map(Fp) } : null;
  }
  let o = t
    .slice(0, 4)
    .map((l) => {
      let u = Qp(r, l, n, a);
      return u ? "• " + l.title + " — " + u.short : null;
    })
    .filter(Boolean);
  // About the oven, say the answer first, then the list.
  let hd = "";
  if (r === "cookware" && o.length) {
    let shown = t.slice(0, 4),
      ov = shown.filter((l) => l.appliances.includes("oven")).length;
    hd = ov === 0 ? "Духовка не нужна ни одному из них:\n" : ov === shown.length ? "Для всех нужна духовка:\n" : "Духовка нужна не всем:\n";
  }
  return o.length
    ? {
        text: hd + o.join(`
`),
        options: t.slice(0, 3).map(Fp),
      }
    : null;
}
var oe = (e, t, n, a, i, s, r) => ({
    name: e,
    re: t,
    ids: n,
    with: a,
    what: i,
    where: s,
    swap: r,
  }),
  $D = [
    oe(
      "Нут",
      /(^|[^а-я])нут(а|у|ом|е)?([^а-я]|$)/,
      ["canned-chickpea", "dried-chickpea"],
      "с нутом",
      "бобовые: круглые бежевые горошины с ореховым вкусом, похожи на крупный горох. Из нута делают хумус и фалафель, его добавляют в салаты, супы и рагу.",
      "сухой — в отделе круп и бобовых, готовый — в банках рядом с консервированной фасолью и горошком.",
      "фасолью или чечевицей; в салат — консервированной фасолью.",
    ),
    oe(
      "Булгур",
      /булгур/,
      ["bulgur"],
      "с булгуром",
      "крупа из пшеницы: зёрна сначала пропаривают, сушат и дробят. Варится 15–20 минут, получается рассыпчатым, вкус чуть ореховый. Подходит для гарнира, плова и салата табуле.",
      "в отделе круп, рядом с кускусом и рисом.",
      "кускусом, перловкой или рисом.",
    ),
    oe(
      "Киноа",
      /киноа|кинва|квиноа/,
      ["quinoa"],
      "с киноа",
      "мелкие зёрна растения из Южной Америки, готовятся как крупа за 15 минут. В киноа много белка, вкус мягкий, ореховый. Перед варкой её промывают, чтобы не горчила.",
      "в отделе круп или здорового питания.",
      "булгуром, кускусом или гречкой.",
    ),
    oe(
      "Кускус",
      /кус-?кус/,
      ["couscous"],
      "с кускусом",
      "это не отдельная крупа, а крошечные шарики из пшеничной муки (по сути, мелкая паста). Его не варят: заливают кипятком на 5 минут под крышкой. Подходит для гарнира и тёплых салатов.",
      "в отделе круп, рядом с булгуром.",
      "булгуром, мелкой вермишелью или рисом.",
    ),
    oe(
      "Перловка",
      /перлов|перловая крупа/,
      ["pearl-barley"],
      "с перловкой",
      "крупа из ячменя: зёрна очищены и отшлифованы. Варится долго, 40–60 минут (быстрее, если замочить на ночь). Её кладут в рассольник, супы и делают гарнир.",
      "в отделе круп.",
      "булгуром или рисом (в рассольнике — рисом).",
    ),
    oe(
      "Пшено",
      /(^|[^а-я])пшен(о|а|ом|ка|ки|ную|ной)?([^а-я]|$)/,
      ["millet"],
      "с пшеном",
      "жёлтая крупа из проса. Из пшена варят кашу на молоке (часто с тыквой) и кулеш. Перед варкой его промывают горячей водой — так уходит горечь.",
      "в отделе круп.",
      "рисом или кукурузной крупой.",
    ),
    oe(
      "Манка",
      /(^|[^а-я])манк|манн(ая|ой|ую) круп/,
      ["semolina"],
      "с манкой",
      "манная крупа — очень мелко дроблёная пшеница. Из неё варят манную кашу, добавляют в сырники и запеканки, загущают тесто.",
      "в отделе круп.",
      "в выпечке и сырниках — мукой (чуть меньше по объёму).",
    ),
    oe(
      "Чечевица",
      /чечевиц/,
      ["red-lentil", "brown-lentil"],
      "с чечевицей",
      "бобовые: маленькие плоские зёрна. Красная колотая разваривается за 15–20 минут — для супов-пюре и каш; коричневая и зелёная держат форму 25–35 минут — для гарнира и салатов. Замачивать не нужно.",
      "в отделе круп и бобовых.",
      "колотым горохом или нутом (варятся дольше).",
    ),
    oe(
      "Колотый горох",
      /колот\S* горох|горох колот/,
      ["split-pea"],
      "с горохом",
      "сушёный горох без оболочки, разделённый на половинки. Разваривается быстрее целого — для горохового супа и пюре.",
      "в отделе круп.",
      "красной чечевицей — суп будет готов быстрее.",
    ),
    oe(
      "Рис арборио",
      /арборио|рис для ризотто/,
      ["arborio-rice"],
      "с рисом арборио",
      "итальянский круглозёрный рис для ризотто: отдаёт крахмал, и блюдо становится сливочным.",
      "в отделе круп, иногда с пометкой «для ризотто».",
      "любым круглозёрным рисом (например, краснодарским).",
    ),
    oe(
      "Тесто фило",
      /(^|[^а-я])фил(о|ло)([^а-я]|$)/,
      ["phyllo-dough"],
      "с тестом фило",
      "очень тонкое, почти прозрачное тесто листами. Из него делают пахлаву, штрудель и греческие пироги. Пока работаете, накрывайте листы влажным полотенцем — сохнут за минуты.",
      "в морозилке, рядом со слоёным тестом.",
      "тонким лавашом или слоёным тестом (выпечка будет пышнее).",
    ),
    oe(
      "Лаваш",
      /лаваш/,
      ["lavash"],
      "с лавашом",
      "тонкая пресная лепёшка большими листами. В неё заворачивают шаурму и рулеты, из неё делают ленивые хачапури и закуски.",
      "в хлебном отделе.",
      "пшеничной тортильей.",
    ),
    oe(
      "Тортилья",
      /тортиль/,
      ["wheat-tortilla", "corn-tortilla"],
      "с тортильей",
      "мексиканская тонкая лепёшка из пшеничной или кукурузной муки — для буррито, кесадильи и тако.",
      "в хлебном отделе или в отделе «кухни мира».",
      "лавашом (его режут кругами по размеру).",
    ),
    oe(
      "Рисовая бумага",
      /рисов\S* бумаг/,
      ["rice-paper"],
      "с рисовой бумагой",
      "тонкие прозрачные листы из рисовой муки. Их на несколько секунд опускают в тёплую воду, они становятся мягкими, и в них заворачивают овощи и креветки — получаются спринг-роллы.",
      "в отделе «кухни мира» или азиатских продуктов.",
      void 0,
    ),
    oe(
      "Фунчоза",
      /фунчоз|стеклянн\S* лапш|крахмальн\S* лапш/,
      ["glass-noodles"],
      "с фунчозой",
      "прозрачная лапша из крахмала (бобового или из батата). Её не варят долго: 3–7 минут в кипятке. Для салатов и корейского чапче.",
      "в отделе «кухни мира», рядом с рисовой лапшой.",
      "рисовой лапшой.",
    ),
    oe(
      "Лапша рамен",
      /рамен/,
      ["ramen-noodles"],
      "с лапшой рамен",
      "пшеничная лапша для японского супа рамен, упругая и тонкая.",
      "в отделе «кухни мира».",
      "тонкой пшеничной лапшой или лапшой быстрого приготовления без приправ.",
    ),
    oe(
      "Савоярди",
      /савоярди|дамские пальчики/,
      ["savoiardi"],
      "с печеньем савоярди",
      "сухое лёгкое бисквитное печенье палочками («дамские пальчики») — основа тирамису.",
      "в отделе печенья или кондитерских изделий.",
      "сухим бисквитом или печеньем «Юбилейное» (вкус будет другим).",
    ),
    oe(
      "Тахини",
      /тахини|кунжутн\S* паст/,
      ["tahini"],
      "с тахини",
      "густая паста из молотого обжаренного кунжута. Главная часть хумуса, её добавляют в соусы и заправки.",
      "в отделе «кухни мира» или здорового питания, иногда рядом с ореховыми пастами.",
      "арахисовой пастой без сахара (вкус будет другим, но похожим).",
    ),
    oe(
      "Хумус",
      /хумус/,
      ["tahini"],
      "с нутом",
      "восточная закуска: пюре из варёного нута с тахини, лимонным соком и чесноком. Его едят с лепёшками и овощами.",
      "готовый — в отделе салатов и закусок.",
      void 0,
    ),
    oe(
      "Мисо",
      /(^|[^а-я])мисо/,
      ["miso-paste"],
      "с мисо",
      "японская паста из ферментированных соевых бобов (иногда с рисом). Солёная, с глубоким вкусом — для мисо-супа, маринадов и соусов. Кипятить её не нужно: кладут в конце.",
      "в отделе «кухни мира».",
      "соевым соусом (меньше по количеству).",
    ),
    oe(
      "Кочудян",
      /кочуд|кочхуджан|гочуджан|гочуцзян/,
      ["gochujang"],
      "с кочудяном",
      "корейская острая паста из перца, клейкого риса и сои. Сладковато-острая — для пибимпапа, токпокки и маринадов.",
      "в отделе «кухни мира» или в азиатских магазинах.",
      "смесью: паприка + немного чили + мёд + соевый соус.",
    ),
    oe(
      "Рыбный соус",
      /рыбн\S* соус/,
      ["fish-sauce"],
      "с рыбным соусом",
      "тайский и вьетнамский соус из ферментированной рыбы. Пахнет резко, но в блюде даёт глубокий солёный вкус. Нужно совсем немного.",
      "в отделе «кухни мира».",
      "соевым соусом.",
    ),
    oe(
      "Устричный соус",
      /устричн\S* соус/,
      ["oyster-sauce"],
      "с устричным соусом",
      "густой тёмный китайский соус, сладковато-солёный. Для жареного риса, лапши и овощей вок.",
      "в отделе «кухни мира», рядом с соевым соусом.",
      "соевым соусом с щепоткой сахара.",
    ),
    oe(
      "Тёмный соевый соус",
      /темн\S* соев/,
      ["dark-soy-sauce"],
      "с соевым соусом",
      "более густой и менее солёный соевый соус, в основном для цвета и карамельного вкуса.",
      "рядом с обычным соевым соусом.",
      "обычным соевым соусом с капелькой мёда.",
    ),
    oe(
      "Кунжутное масло",
      /кунжутн\S* масл/,
      ["toasted-sesame-oil"],
      "с кунжутным маслом",
      "масло из обжаренного кунжута с сильным ароматом. На нём не жарят — добавляют несколько капель в готовое блюдо или заправку.",
      "в отделе масел или «кухни мира».",
      "растительным маслом с щепоткой поджаренного кунжута.",
    ),
    oe(
      "Рисовый уксус",
      /рисов\S* уксус/,
      ["rice-vinegar"],
      "с рисовым уксусом",
      "мягкий, слегка сладковатый уксус. Нужен для риса к суши и азиатских салатов.",
      "в отделе «кухни мира» или рядом с уксусами.",
      "яблочным уксусом, разбавленным водой пополам, с щепоткой сахара.",
    ),
    oe(
      "Тамаринд",
      /тамаринд/,
      ["tamarind-paste"],
      "с тамариндом",
      "кисло-сладкая паста из плодов тропического дерева. Её кладут в пад-тай и индийские блюда.",
      "в азиатских магазинах и в отделе «кухни мира».",
      "лимонным соком с ложкой коричневого сахара.",
    ),
    oe(
      "Кокосовое молоко",
      /кокосов\S* молок/,
      ["canned-coconut-milk"],
      "с кокосовым молоком",
      "не сок кокоса, а отжим тёртой мякоти с водой — густой и жирный. Для карри, супов том-ям и десертов.",
      "в банках в отделе «кухни мира» или консервов.",
      "сливками 10–20% (без кокосового вкуса).",
    ),
    oe(
      "Зира",
      /(^|[^а-я])зир(а|ы|у|ой)([^а-я]|$)|кумин|римский тмин/,
      ["cumin"],
      "с зирой",
      "семена с тёплым пряным ароматом. Главная специя плова, её кладут в мясо, бобовые и восточные блюда.",
      "в отделе специй.",
      "молотым кориандром (аромат другой) или щепоткой карри.",
    ),
    oe(
      "Кориандр",
      /кориандр/,
      ["coriander"],
      "с кориандром",
      "семена кинзы, молотые или целые. В отличие от свежей зелени пахнут мягко, цитрусово. Для бородинского хлеба, маринадов и мяса.",
      "в отделе специй.",
      "щепоткой зиры.",
    ),
    oe(
      "Кинза",
      /кинз/,
      ["cilantro"],
      "с кинзой",
      "свежая зелень кориандра с ярким запахом. Её любят в кавказской, азиатской и мексиканской кухне.",
      "в овощном отделе, рядом с укропом и петрушкой.",
      "петрушкой.",
    ),
    oe(
      "Гарам масала",
      /гарам/,
      ["garam-masala"],
      "с гарам масалой",
      "индийская смесь пряностей: корица, кардамон, гвоздика, перец, кумин. Добавляется в конце готовки карри.",
      "в отделе специй.",
      "карри без острого перца.",
    ),
    oe(
      "Карри",
      /(^|[^а-я])карри([^а-я]|$)/,
      ["curry-powder"],
      "с карри",
      "смесь пряностей на основе куркумы (жёлтого цвета), иногда острая. Так же называют и сами блюда — густые рагу в соусе с этими специями.",
      "в отделе специй.",
      "куркумой с щепоткой зиры и паприки.",
    ),
    oe(
      "Куркума",
      /куркум/,
      ["turmeric"],
      "с куркумой",
      "ярко-жёлтая молотая специя из корня. Даёт цвет рису, супам и карри, вкус мягкий, землистый.",
      "в отделе специй.",
      "щепоткой карри.",
    ),
    oe(
      "Сумах",
      /сумах/,
      ["sumac"],
      "с сумахом",
      "бордовая кисловатая специя из ягод. Посыпают лук к шашлыку, салаты и мясо.",
      "в отделе специй или на рынке.",
      "лимонной цедрой и каплей лимонного сока.",
    ),
    oe(
      "Бадьян",
      /бадьян|звездчат\S* анис/,
      ["star-anise"],
      "с бадьяном",
      "звёздочки с ароматом аниса. Для глинтвейна, компотов, азиатских бульонов. Хватает одной звёздочки на кастрюлю.",
      "в отделе специй.",
      "щепоткой корицы.",
    ),
    oe(
      "Шафран",
      /шафран/,
      ["saffron"],
      "с шафраном",
      "нити цветка крокуса — самая дорогая специя. Даёт золотой цвет и тонкий аромат плову, паэлье и выпечке. Нужно несколько нитей, замоченных в тёплой воде.",
      "в отделе специй (продаётся по граммам).",
      "куркумой — только ради цвета.",
    ),
    oe(
      "Мускатный орех",
      /мускат/,
      ["ground-nutmeg"],
      "с мускатным орехом",
      "пряность с тёплым сладковатым ароматом. Щепотку кладут в соус бешамель, пюре и выпечку.",
      "в отделе специй.",
      void 0,
    ),
    oe(
      "Орегано",
      /орегано|душиц/,
      ["dried-oregano"],
      "с орегано",
      "душица — сушёная трава для пиццы, томатных соусов и греческих салатов.",
      "в отделе специй.",
      "сушёным базиликом или «итальянскими травами».",
    ),
    oe(
      "Тимьян",
      /тимьян|чабрец/,
      ["dried-thyme"],
      "с тимьяном",
      "чабрец — трава с тёплым ароматом. Для мяса, птицы, картофеля и супов.",
      "в отделе специй, свежий — в овощном.",
      "орегано или «прованскими травами».",
    ),
    oe(
      "Паприка",
      /паприк/,
      ["paprika"],
      "с паприкой",
      "молотый сладкий красный перец, не острый. Даёт цвет и сладковатый вкус гуляшу, курице, картофелю.",
      "в отделе специй.",
      "молотым красным перцем (осторожно — острее).",
    ),
    oe(
      "Базилик",
      /базилик/,
      ["fresh-basil"],
      "с базиликом",
      "ароматная зелень для итальянских блюд и соуса песто. Бывает зелёный и фиолетовый.",
      "в овощном отделе, сушёный — в отделе специй.",
      "петрушкой с щепоткой сушёного базилика.",
    ),
    oe(
      "Маскарпоне",
      /маскарпон/,
      ["mascarpone"],
      "с маскарпоне",
      "итальянский очень нежный и жирный сливочный сыр. Основа крема для тирамису и чизкейков.",
      "в отделе сыров или молочном.",
      "сливочным творожным сыром, взбитым с ложкой сливок 33%.",
    ),
    oe(
      "Фета",
      /(^|[^а-я])фет(а|ы|у|ой)([^а-я]|$)|брынз/,
      ["feta-cheese"],
      "с фетой",
      "солёный рассольный сыр из Греции, крошится. Для греческого салата и запеканок.",
      "в отделе сыров (часто в рассоле).",
      "брынзой или адыгейским сыром с щепоткой соли.",
    ),
    oe(
      "Моцарелла",
      /моцарел/,
      ["mozzarella"],
      "с моцареллой",
      "мягкий итальянский сыр, тянется при запекании. Шарики в рассоле — для салата капрезе, плотный брусок — для пиццы.",
      "в отделе сыров.",
      "любым мягким сыром, который хорошо плавится.",
    ),
    oe(
      "Адыгейский сыр",
      /адыгейск/,
      ["adyghe-cheese"],
      "с адыгейским сыром",
      "мягкий несолёный сыр, не плавится при жарке. Его жарят ломтиками, кладут в салаты и выпечку.",
      "в отделе сыров.",
      "брынзой (солонее) или плотным творогом.",
    ),
    oe(
      "Сливочный сыр",
      /сливочн\S* сыр|творожн\S* сыр|креметт|филадельфи/,
      ["cream-cheese"],
      "со сливочным сыром",
      "мягкий творожный сыр в баночках (типа «Хохланд», «Креметте»). Для чизкейков, кремов и роллов.",
      "в молочном отделе или с сырами.",
      "творогом, протёртым с ложкой сметаны.",
    ),
    oe(
      "Авокадо",
      /авокадо/,
      ["avocado"],
      "с авокадо",
      "плод с маслянистой мякотью и большой косточкой. Спелый слегка продавливается пальцем. Для гуакамоле, тостов и салатов.",
      "в овощном отделе (если твёрдый — 2–3 дня дозреет при комнатной температуре).",
      void 0,
    ),
    oe(
      "Сельдерей черешковый",
      /сельдере/,
      ["celery-stalk"],
      "с сельдереем",
      "длинные сочные стебли с ярким ароматом. Нарезают в супы, рагу и салаты.",
      "в овощном отделе.",
      "корнем сельдерея или просто больше морковью и луком.",
    ),
    oe(
      "Салат романо",
      /роман(о|ен)|ромэн/,
      ["romaine-lettuce"],
      "с салатом романо",
      "хрустящий салат с длинными листьями — классика для «Цезаря».",
      "в овощном отделе, рядом с другими салатами.",
      "айсбергом или пекинской капустой.",
    ),
    oe(
      "Щавель",
      /щавел/,
      ["sorrel"],
      "со щавелем",
      "кислые зелёные листья. Из них варят зелёные щи и делают начинку для пирожков.",
      "в овощном отделе весной и летом, замороженный — в морозилке.",
      "шпинатом с лимонным соком.",
    ),
    oe(
      "Имбирь",
      /имбир/,
      ["ginger"],
      "с имбирём",
      "пряный корень с жгучим свежим вкусом. Его трут в маринады, азиатские блюда и чай.",
      "в овощном отделе.",
      "щепоткой молотого имбиря из отдела специй.",
    ),
    oe(
      "Каперсы",
      /каперс/,
      ["capers"],
      "с каперсами",
      "маринованные бутоны кустарника, солёные и кисловатые. Для соусов, рыбы и солянки.",
      "в отделе маринадов и консервов.",
      "мелко нарезанными солёными огурцами.",
    ),
    oe(
      "Маслины",
      /маслин|оливк/,
      ["black-olive"],
      "с маслинами",
      "это одни и те же плоды оливкового дерева: зелёные — оливки, тёмные — маслины. Для салатов, солянки и пиццы.",
      "в отделе консервов и маринадов.",
      void 0,
    ),
    oe(
      "Анчоусы",
      /анчоус/,
      ["anchovies-in-oil"],
      "с анчоусами",
      "маленькие солёные рыбки в масле. Их кладут в «Цезарь» и соусы — дают солёный глубокий вкус.",
      "в рыбном отделе или с рыбными консервами.",
      "сельдью или килькой пряного посола (совсем немного).",
    ),
    oe(
      "Сурими",
      /сурими|крабов\S* палоч/,
      ["crab-sticks"],
      "с крабовыми палочками",
      "крабовые палочки делают из сурими — фарша белой рыбы. Краба в них нет.",
      "в рыбном отделе или в холодильнике с полуфабрикатами.",
      void 0,
    ),
    oe(
      "Тофу",
      /(^|[^а-я])тофу/,
      ["tofu"],
      "с тофу",
      "соевый «творог»: плотные белые кубики почти без вкуса, но впитывают соус. Много белка, подходит в пост.",
      "в отделе здорового питания или рядом с сырами.",
      "адыгейским сыром (не в пост).",
    ),
    oe(
      "Нори",
      /(^|[^а-я])нори([^а-я]|$)/,
      ["nori"],
      "с нори",
      "тонкие листы прессованных водорослей для роллов, онигири и супов.",
      "в отделе «кухни мира».",
      void 0,
    ),
    oe(
      "Курага",
      /кураг/,
      ["dried-apricot"],
      "с курагой",
      "сушёные абрикосы без косточек. Для выпечки, каш, плова и компотов.",
      "в отделе сухофруктов.",
      "черносливом или изюмом.",
    ),
    oe(
      "Сода",
      /(^|[^а-я])сод(а|ы|у|ой)([^а-я]|$)|разрыхлител/,
      ["baking-soda"],
      "с содой",
      "пищевая сода разрыхляет тесто, но только вместе с кислым — кефиром, сметаной, лимонным соком. Разрыхлитель — это сода, уже смешанная с кислотой.",
      "в отделе бакалеи, рядом с мукой.",
      "разрыхлителем: на 1/2 ч. л. соды — 2 ч. л. разрыхлителя.",
    ),
    oe(
      "Ванильный сахар",
      /ванил/,
      ["vanilla-sugar"],
      "с ванильным сахаром",
      "сахар с ванилином для аромата выпечки и кремов. Ванилин сильнее: его нужно на кончике ножа.",
      "в отделе бакалеи, рядом с разрыхлителем.",
      "щепоткой ванилина или ложкой ванильного экстракта.",
    ),
    oe(
      "Цукаты",
      /цукат/,
      [],
      "с цукатами",
      "засахаренные кусочки фруктов и цедры для куличей и кексов.",
      "в отделе бакалеи или сухофруктов.",
      "изюмом или курагой.",
    ),
  ],
  WD =
    /(^|\s)(что (это )?(такое|за|значит|означает)|чем является|кто так(ой|ая)|из чего (его |ее |их )?(делают|сделан|делается|состоит)|как (он |она |оно )?выглядит|на что похож|какой (он )?на вкус|какая (она )?на вкус|какое (оно )?на вкус|это (крупа|овощ|мясо|рыба|фрукт|орех|специя|приправа|сыр|трава|злак|соус|бобовые|паста|крупы)\??$|это что( такое)?\??$|это\?$|одно и то же|в ч[её]м разница|чем (он |она |они )?отлича|разница между)/,
  e_ =
    /(где (купить|найти|взять|искать|продают|продается|брать|достать)|в каком отделе|продают ли|продается ли)/,
  t_ =
    /(чем (можно )?(за|под)мени|на что (можно )?замени|что (можно )?(положить|добавить|использовать) вместо|вместо|замена|заменитель|аналог)/,
  n_ =
    /(приготов|сделать|поесть|покушать|сварить|испечь|хочу|хочется|давай|подбери|посоветуй|рецепт)/;
function oC(e) {
  let t = _e(e)
    .replace(/[«»"!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (n_.test(t) && !/что такое/.test(t)) return [];
  let n = [];
  return (
    WD.test(t) && n.push("what"),
    e_.test(t) && n.push("where"),
    t_.test(t) && n.push("swap"),
    n
  );
}
function lC(e) {
  let t = _e(e);
  return $D.find((n) => n.re.test(t));
}
function cC(e, t) {
  let n = [];
  return (
    (t.includes("what") || (!e.where && !e.swap)) &&
      n.push(e.name + " — " + e.what),
    (t.includes("where") || t.includes("what")) &&
      e.where &&
      n.push("Где купить: " + e.where),
    e.swap && t.length === 1 && t[0] === "swap"
      ? n.push(e.name + " можно заменить " + e.swap)
      : e.swap &&
        (t.includes("swap") || t.includes("what")) &&
        n.push("Чем заменить: " + e.swap),
    t.includes("swap") &&
      !e.swap &&
      n.push(
        "Точной замены у этого продукта нет: вкус блюда без него изменится. Лучше выбрать другой рецепт.",
      ),
    n.join(`

`)
  );
}
function uC(e) {
  let t = _e(e)
    .replace(/[?!.,«»"]/g, " ")
    .match(/что (это )?(такое|за)\s+(\S+(\s\S+)?)\s*$/);
  return t ? t[3].trim() : null;
}
var a_ = [
    "борщ",
    "щи",
    "плов",
    "котлет",
    "блин",
    "блинчик",
    "оладь",
    "оладушк",
    "сырник",
    "голубц",
    "пельмен",
    "вареник",
    "солянк",
    "рассольник",
    "окрошк",
    "уха",
    "харчо",
    "лагман",
    "шурп",
    "манты",
    "хинкал",
    "оливье",
    "винегрет",
    "шарлотк",
    "драник",
    "тефтел",
    "фрикадел",
    "гуляш",
    "бефстроганов",
    "шакшук",
    "манник",
    "хачапури",
    "чахохбили",
    "азу",
    "курник",
    "лобио",
    "шаурм",
    "беляш",
    "чебурек",
    "зебр",
    "медовик",
  ],
  dC = (e) => pt(e).find((t) => !/^[,.;:!?]$/.test(t)) || "";
function fC(e) {
  let t = _e(dC(e)),
    n = Xe(t);
  return a_.find((a) => n === a || (t.startsWith(a) && a.length >= 4)) || null;
}
function gn(e) {
  if (e.dish) return "d:" + e.dish;
  let t = fC(e.title);
  if (!t) return "r:" + e.id;
  let n = mC().byStem.get(t);
  return n ? "d:" + n : "k:" + t;
}
var i_ = (e) => e.charAt(0).toUpperCase() + e.slice(1);
function pC(e) {
  let t = e.title.trim().split(/\s+/)[0] || e.title;
  return i_(t.replace(/[,.]$/, ""));
}
function il(e) {
  return e.variant
    ? e.variant
    : e.title
        .trim()
        .split(/\s+/)
        .slice(1)
        .join(" ")
        .replace(/^[,.\-–—]\s*/, "") || "классический";
}
var Mr = null;
function mC() {
  if (Mr?.version === bt && Mr.source === F) return Mr;
  let e = new Map();
  for (let t of F) {
    if (!t.dish) continue;
    let n = fC(t.title);
    n && !e.has(n) && e.set(n, t.dish);
  }
  Mr = { version: bt, source: F, groups: new Map(), byStem: e };
  for (let t of F) {
    let n = gn(t);
    Mr.groups.set(n, [...(Mr.groups.get(n) || []), t]);
  }
  return Mr;
}
var s_ = () => mC().groups;
function $p(e) {
  return s_().get(gn(e)) || [e];
}
function Us(e) {
  return Xe(_e(dC(e.title)));
}
function sl(e) {
  let t = e % 10,
    n = e % 100;
  return (
    e +
    " " +
    (t === 1 && n !== 11
      ? "вариант"
      : t >= 2 && t <= 4 && (n < 12 || n > 14)
        ? "варианта"
        : "вариантов")
  );
}
var yC = [
  {
    label: "Побыстрее, до 20 минут",
    text: "что-нибудь побыстрее, до 20 минут",
  },
  { label: "Что-то сытное", text: "хочу что-нибудь сытное" },
  { label: "Лёгкое", text: "хочу что-то лёгкое" },
  { label: "Суп", text: "хочу суп" },
  { label: "Сладкое", text: "хочу сладкое" },
  { label: "Из того, что есть дома", text: "только из того, что есть дома" },
];
function tn(e) {
  return (
    Oe[e] ||
    me(e)?.aliases[0] ||
    za.find((t) => t.id === e)?.name ||
    e
  ).toLowerCase();
}
// A product as said in a chat sentence: «фарш», not «свино-говяжий фарш»; «тунец», not «консервированный тунец».
function chatName(e) {
  let t = tn(e);
  if (!t.includes(" ")) return t;
  let n = me(e)?.aliases.find((a) => !a.includes(" "));
  if (n) return n.toLowerCase();
  let a = t.split(" ").filter((w) => !/(ый|ий|ой|ая|яя|ое|ее|ые|ие|ого|его)$/.test(w));
  return a.length === 1 ? a[0] : t;
}
// «за 40 минут», «за 21 минуту»; past an hour «за 1 ч 30 мин».
function forMinutes(e) {
  return "за " + (e < 60 ? e + " " + Jb(e, "минуту", "минуты", "минут") : mn(e));
}
function Wp(e) {
  return [...new Set(e.flatMap((t) => t.results?.map((n) => n.id) || []))];
}
function gu(e, t) {
  return t === "time"
    ? { ...e, maxMinutes: null }
    : t.startsWith("time:")
      ? { ...e, maxMinutes: Number(t.slice(5)) || null }
      : t === "appliances:all"
        ? { ...e, appliances: ["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"] }
        : t === "strict"
          ? { ...e, strictPantry: !1 }
          : t === "mood"
            ? { ...e, mood: null }
            : t === "kcal"
              ? { ...e, maxKcal: null }
              : t === "occasion"
                ? { ...e, occasion: null }
                : t === "protein"
                  ? { ...e, minProtein: null }
                  : t.startsWith("desired:")
                    ? {
                        ...e,
                        desired: e.desired.filter((n) => n !== t.slice(8)),
                      }
                    : t.startsWith("servings:")
                      ? { ...e, servings: Number(t.slice(9)) || e.servings }
                      : t.startsWith("unexclude:")
                        ? {
                            ...e,
                            excluded: e.excluded.filter(
                              (n) => n !== t.slice(10),
                            ),
                          }
                        : e;
}
function tm(e, t, n = F) {
  let a = [];
  e.maxMinutes !== null && a.push(["time", "Без ограничения по времени"]),
    e.strictPantry && a.push(["strict", "Можно докупить продукты"]);
  for (let s of e.desired)
    a.push([
      "desired:" + s,
      s.startsWith("dish:") ? "Не только " + tn(s) : "Не обязательно: " + tn(s),
    ]);
  e.mood && a.push(["mood", "Любое настроение"]),
    e.maxKcal && a.push(["kcal", "Без ограничения по калориям"]),
    e.occasion &&
      a.push([
        "occasion",
        {
          kids: "Не только детские блюда",
          guests: "Не обязательно праздничное",
          date: "Не обязательно праздничное",
        }[e.occasion],
      ]),
    e.minProtein && a.push(["protein", "Белка сколько угодно"]);
  let i = n
    .filter(
      (s) =>
        s.maxServings < e.servings &&
        Qe([s], { ...e, servings: s.maxServings }, t).length > 0,
    )
    .map((s) => s.maxServings);
  if (i.length) {
    let s = Math.max(...i);
    a.push(["servings:" + s, "На " + s + " " + Li(s, !0)]);
  }
  return a
    .map(([s, r]) => ({ key: s, label: r, n: Qe(n, gu(e, s), t).length }))
    .filter((s) => s.n > 0)
    .slice(0, 3)
    .map((s) => ({ label: s.label, relax: s.key }));
}
var r_ = {
    breakfast: (e) => Zt(e).includes("breakfast") || nt(e, "dish:breakfast"),
    lunch: (e) => Zt(e).includes("lunch") && ["main", "soup"].includes(Ne(e)),
    dinner: (e) => Zt(e).includes("dinner") && ["main", "soup"].includes(Ne(e)),
    snack: (e) =>
      e.totalMinutes <= 25 || ["snack", "baking", "dessert"].includes(Ne(e)),
  },
  o_ = {
    breakfast: "Как вам такое на завтрак?",
    lunch: "Как вам такое на обед?",
    dinner: "Как вам такое на ужин?",
    snack: "Чем быстро перекусить:",
  };
function em(e, t, n, a, i) {
  let s = Qe(
      F.filter((f) => !a.includes(f.id)),
      e,
      t,
      1 / 0,
    ),
    r = n ? s.filter((f) => r_[n](f.recipe)) : s,
    o = r.length >= 3 ? r : s,
    l = i >>> 0 || 1,
    u = () => (
      (l ^= l << 13),
      (l >>>= 0),
      (l ^= l >> 17),
      (l ^= l << 5),
      (l >>>= 0),
      l / 4294967296
    );
  return o
    .map((f) => ({ c: f, k: u() }))
    .sort((f, p) => f.k - p.k)
    .slice(0, 3)
    .map(({ c: f }) => f);
}
var l_ = 0.6,
  c_ = 0.35,
  u_ = new Set(["kids", "guests", "romantic"]),
  d_ = new Set([
    "comfort",
    "quick",
    "cozy",
    "light",
    "hearty",
    "fresh",
    "spicy",
    "sweet",
    "fasting",
    "sick",
    "batch",
  ]);
function f_(e, t) {
  let n = (a, i) => [...new Set([...a, ...i])];
  return {
    ...e,
    desiredAdd: n(e.desiredAdd, t.desiredAdd),
    excludedAdd: n(e.excludedAdd, t.excludedAdd),
    availableAdd: n(e.availableAdd, t.availableAdd),
    absentAdd: n(e.absentAdd, t.absentAdd),
    mood: e.moodChanged ? e.mood : t.mood,
    moodChanged: e.moodChanged || t.moodChanged,
    servings: e.servings ?? t.servings,
    vegetarian: e.vegetarian ?? t.vegetarian,
    strictPantry: e.strictPantry ?? t.strictPantry,
    maxMinutes: e.maxMinutesChanged ? e.maxMinutes : t.maxMinutes,
    maxMinutesChanged: e.maxMinutesChanged || t.maxMinutesChanged,
    ...(e.nutrition || t.nutrition
      ? { nutrition: { ...t.nutrition, ...e.nutrition } }
      : {}),
  };
}
function bC(e) {
  let t = p_(e);
  return {
    ...t,
    text: Cr(t.text),
    ...(t.options
      ? {
          options: t.options.map((n) => ({
            ...n,
            label: Cr(n.label),
            ...(n.text ? { text: Cr(n.text) } : {}),
          })),
        }
      : {}),
  };
}
function p_(e) {
  let t = v_(e);
  if (t) return t;
  let n = e.guess,
    a = n ? l0(n.label) : void 0;
  if (!n || !a || !e.local || x_(e.message)) return Er(e);
  let i = n.source === "taught" || n.prob >= l_;
  if (Ii(e.patch)) {
    if (i && a.id === "offtopic")
      return {
        conditions: e.conditions,
        text: "С этим не помогу — я разбираюсь только в еде. Зато могу подобрать рецепт под ваше настроение, продукты или время.",
        results: [],
        options: Ca,
        kind: "talk",
      };
    if (
      (i &&
        gC.has(a.id) &&
        /(хочу|хочется|хотим|давай|приготов|сделай|подбери|посоветуй)/.test(
          _e(e.message),
        )) ||
      (u_.has(a.id) && !("occasion" in e.patch))
    )
      return Er(e);
    if (a.phrase && i) {
      let s = a.id === "surprise" ? c0(_e(e.message)) : void 0,
        r =
          a.phrase +
          (s
            ? " на " +
              {
                breakfast: "завтрак",
                lunch: "обед",
                dinner: "ужин",
                snack: "перекус",
              }[s]
            : ""),
        o = tl(r, e.conditions, za);
      return Er({ ...e, message: r, patch: o, reply: o.reply });
    }
    if (a.phrase && n.prob >= c_ && !gC.has(a.id)) {
      let s = n.second && n.second.prob >= 0.15 ? l0(n.second.label) : void 0,
        r = [
          { label: a.title, text: a.phrase },
          ...(s?.phrase && s.id !== a.id
            ? [{ label: s.title, text: s.phrase }]
            : []),
          ...yC.slice(0, 2),
        ];
      return {
        conditions: e.conditions,
        text:
          "Правильно понимаю: «" +
          a.title +
          "»? Выберите вариант или напишите по-другому.",
        results: [],
        options: r,
        kind: "unclear",
      };
    }
    return Er(e);
  }
  if (i && d_.has(a.id)) {
    let s = tl(a.phrase, e.conditions, za),
      r = f_(e.patch, s);
    return Er({ ...e, patch: r, reply: XS(r, za) });
  }
  return Er(e);
}
var gC = new Set([
    "greeting",
    "how",
    "who",
    "help",
    "thanks",
    "bye",
    "joke",
    "praise",
    "cooked",
    "rude",
  ]),
  m_ =
    /(^|[^а-я])(ху[йяеёию]|пизд|бля(д|т|$|\s)|еба[нлтш]|ёба|ебу|еби|заеба|наеба|уеба|муда[кч]|пид[оа]р|залуп|сука|суки)/;
function g_(e) {
  for (let t = e.length - 1; t >= 0; t--) {
    let n = e[t];
    if (n.role === "assistant" && n.results?.length)
      return n.results.map((a) => F.find((i) => i.id === a.id)).filter(Boolean);
    if (t < e.length - 12) break;
  }
  return [];
}
var h_ = [
  [/^(первый|первую|первая|1)$/, 0],
  [/^(второй|вторую|вторая|2)$/, 1],
  [/^(третий|третью|третья|3)$/, 2],
  [/^(последний|последнюю|последняя)$/, -1],
];
function y_(e) {
  let t = e
    .replace(/[.!?,]/g, "")
    .trim()
    .match(
      /^(а\s+)?(давай|открой|покажи|хочу|возьму|беру|выбираю|выберу|буду|можно|включи|давай-ка)?\s*(\S+)(\s+(рецепт|вариант|блюдо))?(\s+(давай|пожалуйста|открой|покажи))?$/,
    );
  if (!t) return null;
  let n = h_.find(([a]) => a.test(t[3]));
  return n ? n[1] : null;
}
var b_ =
  /\?|(^|\s)(сколько|скольк\S*|как|каков\S*|чем|можно|какой|какая|какое|какие|который|которое|есть ли|нужн[аоы]? ли|нужен ли|надо ли|подойд[её]т|подходит|долго|сложно|хранится|получится|за сколько|из чего|с чем|из них|из этих|это|а)(\s|$|\?)/;
function v_(e) {
  let t = _e(e.message).trim(),
    n = { conditions: e.conditions, results: [] };
  if (m_.test(t))
    return {
      ...n,
      text: "Давайте без крепких слов. Лучше скажите, что хочется поесть, — подберу рецепт.",
      options: Ca,
      kind: "talk",
    };
  let a = FS(t);
  if (a) {
    let x = e.preferences,
      N = { ...rn(x), servings: e.conditions.servings },
      _ = JS(a, (B) => Qe([B], N, x).length > 0);
    if (_.length)
      return {
        ...n,
        text:
          a.tip +
          `

` +
          a.intro,
        results: _.map((B) => ({
          recipe: B,
          reason: "Из остатков: " + a.label.toLowerCase(),
          available: [],
          missing: [],
          unknown: [],
          toBuy: [],
        })),
        options: Nr.filter((B) => B.key !== a.key)
          .slice(0, 3)
          .map((B) => ({
            label: "Остатки: " + B.label.toLowerCase(),
            text: B.phrase,
          })),
        kind: "found",
      };
  }
  let i = g_(e.conversation),
    s = i.length ? y_(t) : null;
  if (s !== null) {
    let x = s < 0 ? i[i.length - 1] : i[s];
    if (x)
      return {
        ...n,
        text: "Открываю «" + x.title + "».",
        options: [{ label: "Покажи другое", text: "покажи другое" }],
        kind: "talk",
        open: x.id,
      };
  }
  let r = k_(e, i);
  if (r) return r;
  if (!b_.test(t)) return null;
  let o = p0(t),
    l =
      /(какой|какое|какую|что|который|которое) из|из (них|этих|них)|(какой|какое|что|который)[^.?!]*(быстре|проще|легче|сытне|дешевле|полегче|попроще)/.test(
        t,
      );
  if (!o.length && !l) return null;
  let u = rC(t),
    f = e.patch,
    p = !f.desiredAdd.length && !f.availableAdd.length && !f.absentAdd.length,
    m = o.some((x) => x === "amount" || x === "replace" || x === "ingredients"),
    y =
      /(чем (накормить|покормить|порадовать|угостить|удивить|побаловать)|что (бы )?(приготовить|сделать|поесть|покушать|сварить|испечь)|подбери|посоветуй|предложи|найди|покажи|хочу|хочется|давай|нужно что|нужен рецепт)/.test(
        t,
      ),
    S =
      o.length > 0 &&
      o.every((x) =>
        ["kids", "lenten", "vegetarian", "spicy", "allergens"].includes(x),
      ),
    w = !y && (!S || /\?/.test(e.message)),
    v = t.match(
      /(^|\s)(перв(ого|ом|ый|ому|ая|ую|ой)|втор(ого|ом|ой|ому|ая|ую)|трет(ьего|ьем|ий|ьему|ья|ью)|последн(его|ем|ий|ему|яя|юю))(\s|$|\?)/,
    ),
    b =
      v && i.length && o.length
        ? i[
            v[2].startsWith("перв")
              ? 0
              : v[2].startsWith("втор")
                ? 1
                : v[2].startsWith("трет")
                  ? 2
                  : i.length - 1
          ]
        : void 0,
    g = b ? [b] : u;
  if (
    (!g.length &&
      e.focus &&
      !l &&
      (m0(t) || ((p || m) && !y)) &&
      (g = [e.focus]),
    !g.length && (m0(t) || (p && w)) && (g = i),
    g.length)
  ) {
    let x = Jp(t, g, e.focusServings ?? e.conditions.servings);
    if (x) return { ...n, text: x.text, options: x.options, kind: "talk" };
  }
  if (o[0] === "kcal") {
    let x = [...e.patch.desiredAdd, ...e.patch.availableAdd].find(
        (_) => !_.startsWith("dish:"),
      ),
      N = x ? me(Sr[x]?.ids[0] ?? x) : void 0;
    if (N) {
      let _ = N.per100g;
      return {
        ...n,
        text:
          "В 100 г продукта «" +
          (N.aliases[0] || N.name).toLowerCase() +
          "» ≈ " +
          _.kcal +
          " ккал: белки " +
          _.protein +
          " г, жиры " +
          _.fat +
          " г, углеводы " +
          _.carbs +
          " г.",
        options: [
          {
            label: "Блюда с " + aa((N.aliases[0] || N.name).toLowerCase()),
            text:
              "хочу что-нибудь с " + aa((N.aliases[0] || N.name).toLowerCase()),
          },
        ],
        kind: "talk",
      };
    }
  }
  return null;
}
function k_(e, t) {
  let n = oC(e.message);
  if (!n.length) return null;
  let a = { conditions: e.conditions, results: [] },
    i = !n.includes("what") && !n.includes("where"),
    s = lC(e.message);
  if (i) {
    let f = [...(e.focus ? [e.focus] : []), ...t];
    if (
      !s ||
      nl(e.message) ||
      f.some((p) => p.ingredients.some((m) => s.ids.includes(m.id)))
    )
      return null;
  }
  let r = { label: "Что приготовить?", text: "что приготовить" };
  if (s) {
    let f = F.some((p) => p.ingredients.some((m) => s.ids.includes(m.id)));
    return {
      ...a,
      text: cC(s, n),
      options: [
        ...(f
          ? [{ label: "Блюда " + s.with, text: "хочу что-нибудь " + s.with }]
          : []),
        r,
      ],
      kind: "talk",
    };
  }
  if (!n.includes("what")) return null;
  let o = e.patch.desiredAdd.find((f) => f.startsWith("dish:"));
  if (o) {
    let f = F.filter((p) => nt(p, o)).slice(0, 3);
    if (f.length) {
      let p = f[0],
        m = tn(o);
      return {
        ...a,
        text:
          m.charAt(0).toUpperCase() +
          m.slice(1) +
          " — " +
          (p.summary.charAt(0).toLowerCase() + p.summary.slice(1)) +
          (f.length > 1 ? " Вот рецепты:" : " Вот рецепт:"),
        results: f.map((y) => ({
          recipe: y,
          reason: "",
          available: [],
          missing: [],
          unknown: [],
          toBuy: [],
        })),
        options: [r],
        kind: "found",
      };
    }
  }
  let l = [...e.patch.desiredAdd, ...e.patch.availableAdd].find(
    (f) => !f.startsWith("dish:"),
  );
  if (l) {
    let f = tn(l);
    return {
      ...a,
      text:
        "«" +
        f.charAt(0).toUpperCase() +
        f.slice(1) +
        "» — продукт из моих рецептов, подробного описания пока нет. Могу показать блюда с ним.",
      options: [
        { label: "Блюда с " + aa(f), text: "хочу что-нибудь с " + aa(f) },
        r,
      ],
      kind: "talk",
    };
  }
  let u = uC(e.message);
  return u && u.split(" ").length <= 2
    ? {
        ...a,
        text:
          "Про «" +
          u +
          "» пока ничего не знаю: такого продукта нет в моих рецептах. Спросите про продукт из рецепта, например «что такое булгур», или скажите, что хочется приготовить.",
        options: Ca,
        kind: "talk",
      }
    : null;
}
function x_(e) {
  return !!u0(e) || Yp(e);
}
function Er(e) {
  let { message: t, local: n, preferences: a, conversation: i } = e,
    s = e.conditions,
    r = Yp(t),
    o = e.now ?? new Date(),
    l = u0(t, o);
  if (l?.kind === "faq")
    return {
      conditions: s,
      text: l.reply,
      results: [],
      options: l.options,
      kind: "talk",
    };
  let u =
    l?.surprise &&
    Ii({
      ...e.patch,
      desiredAdd: e.patch.desiredAdd.filter((k) => k !== "dish:breakfast"),
      desiredRemove: [],
    });
  // «пока» is a goodbye even though it looks like the dish «поке».
  if (l && (Ii(e.patch) || u || l.kind === "bye") && !r) {
    if (l.surprise) {
      let k =
          l.kind === "hungry" && s.maxMinutes === null
            ? { ...s, maxMinutes: 30 }
            : s,
        U = em(k, a, l.surprise.meal, Wp(i).slice(-9), e.seed ?? o.getTime()),
        Y = "";
      if (
        (!U.length &&
          k !== s &&
          (U = em(
            s,
            a,
            l.surprise.meal,
            Wp(i).slice(-9),
            e.seed ?? o.getTime(),
          )),
        !U.length)
      ) {
        let G = {
          ...s,
          desired: [],
          available: [],
          absent: [],
          maxMinutes: null,
          mood: null,
          strictPantry: !1,
          servings: Math.min(s.servings, 4),
        };
        (U = em(G, a, l.surprise.meal, Wp(i).slice(-9), e.seed ?? o.getTime())),
          (Y =
            "С прошлыми условиями ничего не находилось, поэтому выбрал из всех рецептов. ");
      }
      return U.length
        ? {
            conditions: s,
            text:
              Y +
              (l.kind === "hungry" ? l.reply : o_[l.surprise.meal ?? "dinner"]),
            results: U,
            options: [
              {
                label: "Ещё идеи",
                text:
                  "удиви меня" +
                  (l.surprise.meal
                    ? " на " +
                      {
                        breakfast: "завтрак",
                        lunch: "обед",
                        dinner: "ужин",
                        snack: "перекус",
                      }[l.surprise.meal]
                    : ""),
              },
              { label: "Побыстрее", text: "что-нибудь побыстрее" },
            ],
            kind: "found",
          }
        : {
            conditions: s,
            text: "С текущими условиями ничего не находится. Начнём заново?",
            results: [],
            options: [{ label: "Начать заново", text: "начнём заново" }],
            kind: "none",
          };
    }
    return {
      conditions: s,
      text: l.reply,
      results: [],
      options: l.options,
      kind: "talk",
    };
  }
  let f = l?.prefix ? l.prefix + " " : "",
    p = n && Ii(e.patch) && !r ? R_(t) : null;
  if (p) {
    let k = {
        ...s,
        desired: [],
        available: [],
        absent: [],
        maxMinutes: null,
        mood: null,
        strictPantry: !1,
      },
      U = em(k, a, Xp(o.getHours()), [], e.seed ?? o.getTime());
    return {
      conditions: s,
      text:
        "«" +
        A_(p) +
        "» — такого рецепта пока нет в моей книге, я отмечу, что его ищут. А пока вот что можно приготовить:",
      results: U,
      options: [{ label: "Ещё идеи", text: "удиви меня" }],
      kind: "near",
    };
  }
  if (n && Ii(e.patch) && !r) {
    let k = pt(t).filter((Y) => /[а-яa-z]/.test(Y)).length <= 2,
      U =
        e.voice && k
          ? "Кажется, я не расслышал. Повторите, пожалуйста, или выберите вариант:"
          : k
            ? "Хм, не понял. Напишите продукты или чего хочется — или выберите:"
            : "Не до конца понял. Что сейчас важнее? Можно просто назвать продукты, которые есть дома.";
    return {
      conditions: s,
      text: U,
      results: [],
      options: [...yC.slice(0, 5), Ca[3]],
      kind: "unclear",
    };
  }
  if (
    e.patch.strictPantry &&
    !s.available.length &&
    !e.patch.availableAdd.length
  )
    return {
      conditions: pu(s, e.patch),
      text:
        f +
        "Хорошо, подберу только из того, что есть дома. Перечислите продукты — например: «яйца, сыр, помидоры, макароны». Или отметьте их списком:",
      results: [],
      options: [{ label: "Отметить продукты", action: "pantry" }],
      kind: "talk",
    };
  let m = (k) =>
      [...s.excluded, ...a.excluded].find(
        (U) => !U.startsWith("dish:") && Os(k, U),
      ),
    y = e.patch.desiredAdd.filter((k) => !k.startsWith("dish:") && m(k)),
    S = {
      ...e.patch,
      desiredAdd: e.patch.desiredAdd.filter((k) => !y.includes(k)),
    },
    w = pu(s, S),
    v = "",
    b = [];
  if (y.length) {
    let k = y[0],
      U = m(k);
    s.excluded.includes(U)
      ? ((v =
          "«" + tn(U) + "» сейчас в исключениях, поэтому подбираю без этого. "),
        b.push({ label: "Вернуть: " + tn(U), relax: "unexclude:" + U }))
      : (v =
          "«" +
          tn(U) +
          "» исключено в ваших предпочтениях, поэтому подбираю без этого. Изменить можно в «Профиле» → «Предпочтения в еде». ");
  }
  let g = r ? Wp(i) : [],
    x = o.getHours(),
    N =
      w.desired.some((k) => k.startsWith("dish:")) || w.mood === "sweet"
        ? void 0
        : x >= 5 && x < 11
          ? "breakfast"
          : x >= 11 && x < 16
            ? "lunch"
            : x >= 16 && x < 23
              ? "dinner"
              : void 0,
    _ = S.availableAdd.length
      ? S.availableAdd
      : r || S.strictPantry
        ? w.available.filter((k) => !r0.has(k))
        : [],
    B = (k) =>
      !_.length || k.ingredients.some((U) => _.some((Y) => ia(U.id, Y))),
    R = Qe(
      F.filter((k) => !g.includes(k.id) && B(k)),
      w,
      a,
      3,
      { meal: N },
    );
  if (!R.length && _.length && !F.some(B)) {
    let k = Qe(
      F.filter((U) => !g.includes(U.id)),
      w,
      a,
      3,
      { meal: N },
    );
    return {
      conditions: w,
      text:
        f +
        "Рецептов, где есть " +
        _.map(tn).join(" или ") +
        ", пока нет в моей книге. Вот что подходит под остальные условия:",
      results: k,
      options: [{ label: "Начать заново", text: "начнём заново" }],
      kind: "near",
    };
  }
  if (!R.length && !(r && Qe(F, w, a).length > 0)) {
    let k = F.filter((Y) => !g.includes(Y.id) && B(Y)),
      U = S_(w, a, k, N);
    if (U) {
      let Y = tm(w, a, k).filter((G) => G.relax !== U.key);
      return {
        conditions: w,
        text: f + v + U.text,
        results: U.results,
        options: [
          ...b,
          ...Y.slice(0, 2),
          { label: "Начать заново", text: "начнём заново" },
        ],
        kind: "near",
      };
    }
  }
  if (!R.length) {
    let k = r && Qe(F, w, a).length > 0,
      U = tm(w, a, r ? F.filter((Q) => !g.includes(Q.id)) : F),
      Y = k
        ? "Других вариантов под эти условия нет: я показал всё, что подходит."
        : (n && !Ii(S) && !/:$/.test(e.reply)
            ? e.reply +
              `

`
            : "") + "С этими условиями рецептов пока нет.",
      G = U.length
        ? " Найдётся, если ослабить одно условие:"
        : k
          ? " Можно изменить условия или начать заново."
          : " Даже без части условий ничего не находится; исключения я не трогаю.";
    return {
      conditions: w,
      text: f + v + Y + G,
      results: [],
      options: [
        ...b,
        ...U,
        ...(U.length
          ? []
          : [{ label: "Начать заново", text: "начнём заново" }]),
      ],
      kind: "none",
    };
  }
  let T = w.desired
    .filter(
      (k) => k.startsWith("dish:") && !vC.has(k) && !k.startsWith("dish:r:"),
    )
    .map((k) => k.slice(5));
  if (T.length) {
    let k = (U) =>
      pt(U.title)
        .map((Y) => Xe(Y))
        .some((Y) => T.includes(Y))
        ? 1
        : 0;
    R.sort((U, Y) => k(Y.recipe) - k(U.recipe));
  }
  let C =
      r && Ii(S)
        ? "Вот ещё варианты:"
        : e.reply || "Вот что предлагаю:",
    M = _.filter((k) => !r0.has(k) && !k.startsWith("dish:")),
    Z = (k) => M.every((U) => k.ingredients.some((Y) => ia(Y.id, U)));
  if (M.length >= 2 && !R.some((k) => Z(k.recipe))) {
    // «Блюда сразу с курицей, картофелем и сметаной за 40 минут нет.» The time and the products are said in it,
    // so the «Подобрал — до 40 минут, есть дома: …» line is not repeated; anything else it noted stays in front.
    let kept = (e.reply && /^Подобрал — /.test(e.reply)
      ? e.reply.replace(/^Подобрал — /, "").replace(/ Поправить можно.*$/, "").replace(/:\s*$/, "")
          .replace(/(^|, )до \d+ минут/, "").replace(/(^|, )есть дома: .*?(?=, (?:нет дома|без |снова можно)|$)/, "")
          .replace(/^, /, "").trim()
      : "");
    C =
      (kept ? "Учёл: " + kept + ". " : "") +
      Cr("Блюда сразу с " + _i(M.map((Y) => aa(chatName(Y)))) + (w.maxMinutes !== null ? " " + forMinutes(w.maxMinutes) : "") + " нет. Вот что получится из части продуктов:");
    let k = F.filter((U) => !g.includes(U.id) && Z(U));
    if (w.maxMinutes !== null) {
      let U = Qe(k, { ...w, maxMinutes: null }, a, 1)[0];
      U &&
        b.push({
          label: (() => {
            let m = Math.ceil(U.recipe.totalMinutes / 10) * 10;
            return "Всё вместе — за " + (m < 100 ? m + " мин" : mn(m));
          })(),
          relax: "time:" + Math.ceil(U.recipe.totalMinutes / 10) * 10,
        });
    }
    w.appliances.length < 4 &&
      Qe(k, { ...w, appliances: ["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"] }, a, 1)
        .length &&
      b.push({ label: "Если можно в духовке", relax: "appliances:all" });
  }
  let V = w_(w, a, R);
  if (V)
    return {
      conditions: w,
      text:
        f +
        v +
        (C && /^Подобрал — .+, /.test(C)
          ? C.replace(/ Поправить можно.*$/, "") +
            `

`
          : "") +
        V.text,
      results: R,
      options: [...b, ...V.options],
      kind: "found",
    };
  if (b.length < 4) {
    let k = [{ label: "Покажи другое", text: "покажи другое" }];
    w.mood !== "comfort" &&
      k.push({ label: "Ещё проще", text: "что-нибудь попроще" }),
      (w.maxMinutes === null || w.maxMinutes > 20) &&
        k.push({ label: "Побыстрее", text: "что-нибудь побыстрее" }),
      w.available.length &&
        !w.strictPantry &&
        Qe(F, { ...w, strictPantry: !0 }, a, 1).length &&
        k.push({ label: "Без покупок", text: "только из того что есть" }),
      a.goal === "protein" &&
        !w.minProtein &&
        Qe(F, { ...w, minProtein: 30 }, a, 1).length &&
        k.splice(1, 0, { label: "Много белка", text: "где много белка" }),
      (a.goal === "lose" || a.goal === "keep") &&
        !w.maxKcal &&
        Qe(F, { ...w, maxKcal: 400 }, a, 1).length &&
        k.splice(1, 0, { label: "До 400 ккал", text: "до 400 ккал" }),
      (b = [...b, ...k].slice(0, 5));
  }
  return {
    conditions: w,
    text: f + v + C,
    results: R,
    options: b.length ? b : void 0,
    kind: "found",
  };
}
var vC = new Set(Oi.map((e) => "dish:" + e.key));
function w_(e, t, n) {
  let a = e.desired.filter(
    (f) =>
      f.startsWith("dish:") &&
      !vC.has(f) &&
      f !== "dish:oven" &&
      f !== "dish:multicooker" &&
      f !== "dish:airfryer" &&
      f !== "dish:microwave" &&
      f !== "dish:freezer" &&
      !f.startsWith("dish:r:"),
  );
  if (!a.length || !n.length) return null;
  let i = $p(n[0].recipe);
  if (i.length < 2) return null;
  let s = { ...e, desired: e.desired.filter((f) => !a.includes(f)) },
    r = Qe(i, s, t, 1 / 0).map((f) => f.recipe),
    o = pC(n[0].recipe),
    l =
      r.length === i.length
        ? o +
          " — " +
          sl(i.length) +
          ". Выберите, какой хочется, или посмотрите подходящие:"
        : r.length === 1
          ? o +
            " — " +
            sl(i.length) +
            ", под ваши условия подходит один — «" +
            r[0].title +
            "»:"
          : o +
            " — " +
            sl(i.length) +
            ", под ваши условия подходят " +
            r.length +
            ":",
    u = r
      .slice(0, 6)
      .map((f) => ({
        label: il(f).charAt(0).toUpperCase() + il(f).slice(1),
        text: "хочу " + f.title.toLowerCase(),
      }));
  return {
    text: l,
    options:
      u.length > 1 ? u : [{ label: "Покажи другое", text: "покажи другое" }],
  };
}
var hC = {
  яйцо: "яиц",
  яйца: "яиц",
  картофель: "картофеля",
  картошка: "картошки",
  курица: "курицы",
  молоко: "молока",
  рис: "риса",
  лук: "лука",
  морковь: "моркови",
  сыр: "сыра",
  мука: "муки",
  гречка: "гречки",
  макароны: "макарон",
  фарш: "фарша",
  помидоры: "помидоров",
  капуста: "капусты",
  творог: "творога",
  кефир: "кефира",
  сметана: "сметаны",
  хлеб: "хлеба",
  колбаса: "колбасы",
  сосиски: "сосисок",
  грибы: "грибов",
  шампиньоны: "шампиньонов",
  свекла: "свёклы",
  свёкла: "свёклы",
  огурцы: "огурцов",
  огурец: "огурцов",
  "репчатый лук": "лука",
  "куриное филе": "курицы",
  "свино-говяжий фарш": "свино-говяжьего фарша",
  "говяжий фарш": "говяжьего фарша",
  "филе минтая": "минтая",
  "колбаса варёная": "колбасы",
  свинина: "свинины",
  говядина: "говядины",
  печень: "печени",
  тушёнка: "тушёнки",
  пельмени: "пельменей",
  "сосиски молочные": "сосисок",
  "консервированный тунец": "тунца",
  горбуша: "горбуши",
  селёдка: "селёдки",
  перловка: "перловки",
  пшено: "пшена",
  овсянка: "овсянки",
  кабачок: "кабачков",
  баклажан: "баклажанов",
  тыква: "тыквы",
  фасоль: "фасоли",
  нут: "нута",
  чечевица: "чечевицы",
};
function T_(e) {
  let t = e.toLowerCase();
  return (
    hC[t] ||
    hC[t.replace(/ё/g, "е")] ||
    (t.endsWith(" фарш")
      ? t.replace(/ий фарш$/, "ьего фарша").replace(/ фарш$/, " фарша")
      : t)
  );
}
function S_(e, t, n, a) {
  let i = (S, w = 3) => Qe(n, S, t, w, { meal: a }),
    s = (S) => tn(S),
    r = e.desired.filter((S) => !S.startsWith("dish:")),
    o = e.desired.filter((S) => S.startsWith("dish:")),
    l = [],
    u =
      e.desired.length === 1 &&
      e.maxMinutes === null &&
      !e.mood &&
      !e.strictPantry,
    f = e.maxMinutes;
  if (f !== null) {
    let S = i({ ...e, maxMinutes: null }, 1 / 0).map(
      (w) => w.recipe.totalMinutes,
    );
    if (S.length) {
      let w = Math.min(...S),
        // «25 мин у плиты, потом ждать 12 ч» when most of the time is waiting, like on the recipe cards.
        fast = i({ ...e, maxMinutes: null }, 1 / 0).find((v) => v.recipe.totalMinutes === w)?.recipe,
        act = fast?.activeMinutes || 0,
        wait = w - act,
        when = act && wait >= 60
          ? act + " мин у плиты, потом ждать " + (wait >= 180 ? Math.round(wait / 60) + " ч" : mn(wait))
          : forMinutes(w);
      l.push({
        key: "time",
        cost: w <= f * 1.5 ? 1 : 3,
        cond: { ...e, maxMinutes: w },
        text: () => (forMinutes(f).replace(/^за/, "За")) + " ничего не успеть. Самое быстрое — " + when + ":",
      });
    }
  }
  let p = e.mood;
  p &&
    l.push({
      key: "mood",
      cost: p === "sweet" ? 6 : 1.5,
      cond: { ...e, mood: null },
      text: () =>
        "Под «" +
        (Oe[p] || p).toLowerCase() +
        "» с этими условиями ничего нет. Вот что подходит под остальное:",
    });
  for (let S of r) {
    let w = r.filter((v) => v !== S);
    l.push({
      key: "desired:" + S,
      cost: r.length > 1 ? 2 : 4,
      cond: { ...e, desired: e.desired.filter((v) => v !== S) },
      text: () =>
        r.length > 1
          ? "Рецепта, где есть сразу " +
            r.map(s).join(" и ") +
            ", пока нет. Вот с " +
            w.map((v) => aa(s(v))).join(" и ") +
            ":"
          : u
            ? "Рецептов с " +
              aa(s(S)) +
              " пока нет в моей книге. Вот другие идеи:"
            : "Рецептов с " +
              aa(s(S)) +
              " под эти условия пока нет. Вот что подходит под остальное:",
    });
  }
  e.strictPantry &&
    l.push({
      key: "strict",
      cost: 2,
      cond: { ...e, strictPantry: !1 },
      text: () =>
        "Без покупок" +
        (e.available.length
          ? " — только из " +
            _i(e.available.slice(0, 4).map((S) => T_(s(S)))) +
            (e.available.length > 4 ? " и ещё " + (e.available.length - 4) : "")
          : "") +
        " — точного рецепта нет. Вот где докупить нужно меньше всего:",
    });
  let m = n.filter((S) => S.maxServings < e.servings).map((S) => S.maxServings);
  if (m.length) {
    let S = Math.max(...m);
    l.push({
      key: "servings:" + S,
      cost: 2,
      cond: { ...e, servings: S },
      text: () =>
        "На " +
        e.servings +
        " " +
        Li(e.servings, !0) +
        " рецептов нет, ближе всего — на " +
        S +
        ". Можно приготовить две порции:",
    });
  }
  for (let S of o)
    l.push({
      key: "desired:" + S,
      cost: 5,
      cond: { ...e, desired: e.desired.filter((w) => w !== S) },
      text: () =>
        "«" +
        tn(S).charAt(0).toUpperCase() +
        tn(S).slice(1) +
        "» под эти условия не нашлось. Вот что подходит под остальное:",
    });
  let y = l
    .map((S) => ({ ...S, results: i(S.cond) }))
    .filter((S) => S.results.length)
    .sort((S, w) => S.cost - w.cost);
  if (y.length) {
    let S = y.filter(
      (v) => v.key.startsWith("desired:") && v.cost === y[0].cost,
    );
    if (S.length > 1 && S.every((v) => v.key.startsWith("desired:dish:"))) {
      let v = new Set(),
        b = [];
      for (let g = 0; g < 3; g++)
        for (let x of S) {
          let N = x.results[g];
          N &&
            !v.has(N.recipe.id) &&
            b.length < 4 &&
            (v.add(N.recipe.id), b.push(N));
        }
      return {
        key: S[0].key,
        text: "Вот и " + o.map(tn).join(", и ") + ":",
        results: b,
      };
    }
    if (S.length > 1) {
      let v = new Set(),
        b = [];
      for (let g = 0; b.length < 3 && g < 3; g++)
        for (let x of S) {
          let N = x.results[g];
          N &&
            !v.has(N.recipe.id) &&
            b.length < 3 &&
            (v.add(N.recipe.id), b.push(N));
        }
      return {
        key: S[0].key,
        text:
          "Рецепта, где есть сразу " +
          r.map(s).join(" и ") +
          ", пока нет. Вот с " +
          r.map((g) => aa(s(g))).join(" или с ") +
          ":",
        results: b,
      };
    }
    let w = y[0];
    return { key: w.key, text: w.text(w.results), results: w.results };
  }
  for (let S = 0; S < l.length; S++)
    for (let w = S + 1; w < l.length; w++) {
      let v = l[S],
        b = l[w],
        g = i(gu(gu(e, v.key), b.key));
      if (g.length)
        return {
          key: v.key,
          text: "Точно под все условия ничего нет. Вот самое близкое — без двух из них:",
          results: g,
        };
    }
  return null;
}
var C_ =
  /^(что|чего|чем|как|есть|кушать|поесть|покушать|еду|еды|вкусн|сладк|остр|л[её]гк|сытн|горяч|быстр|прост|нормальн|домашн|мяс|рыб|ещ[её]|уже|сейчас|сегодня|завтра|тебя|тебе|спать|пить|домой|туда|сюда|чай|кофе|воды|воду)/;
function A_(e) {
  let t = e.split(" "),
    a = [
      t[0]
        .replace(/([^аеиоуыэюя])у$/, "$1а")
        .replace(/ью$/, "ья")
        .replace(/ю$/, "я"),
      ...t.slice(1),
    ].join(" ");
  return a.charAt(0).toUpperCase() + a.slice(1);
}
function R_(e) {
  let t = _e(e)
    .replace(/[!?.,]+/g, " ")
    .trim()
    .match(
      /^(я\s+)?(очень\s+)?(хочу|хочется|хотим|давай|сделай|приготовь|испеки|пожарь|свари|научи готовить|рецепт|как (приготовить|сделать|готовить))\s+([а-я-]{3,})(\s+[а-я-]{3,})?$/,
    );
  if (!t) return null;
  let n = [t[5], t[6]?.trim()].filter(Boolean);
  return n.some((a) => C_.test(a) || /-(то|нибудь|либо)$/.test(a)) ||
    /(ого|его|ому|ему|ое|ее|ый|ий|ая|яя|енькое|енького)$/.test(n[0])
    ? null
    : n.join(" ");
}
var Bn = D.array(D.string().min(1).max(64)).max(80),
  g0 = D.object({
    maxMinutes: D.number().int().min(5).max(180).nullable(),
    servings: D.number().int().min(1).max(12),
    mood: D.enum([
      "cozy",
      "light",
      "hearty",
      "quick",
      "comfort",
      "fresh",
      "spicy",
      "sweet",
    ]).nullable(),
    desired: Bn,
    available: Bn,
    absent: Bn,
    excluded: Bn,
    appliances: D.array(D.enum(["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"])).max(7),
    strictPantry: D.boolean(),
    vegetarian: D.boolean(),
    maxKcal: D.number().int().min(100).max(2e3).nullable().optional(),
    minProtein: D.number().int().min(5).max(100).nullable().optional(),
    occasion: D.enum(["kids", "guests", "date"]).nullable().optional(),
  }).strict(),
  h0 = D.object({
    excluded: Bn,
    appliances: D.array(D.enum(["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"])).max(7),
    vegetarian: D.boolean(),
    servings: D.number().int().min(1).max(12).optional(),
    basics: Bn.optional(),
    goal: D.enum(["tasty", "light", "lose", "protein", "keep"]).optional(),
    skill: D.enum(["learn", "confident", "pro"]).optional(),
    weekdayMinutes: D.number().int().min(10).max(120).nullable().optional(),
    kids: D.boolean().optional(),
  }).strict(),
  TU = D.object({
    operationId: D.string().uuid(),
    message: D.string().trim().min(1).max(2e3),
    conditions: g0,
    preferences: h0,
    history: D.array(
      D.object({
        role: D.enum(["user", "assistant"]),
        text: D.string().max(2e3),
      }),
    ).max(10),
  }).strict(),
  kC = D.object({
    desiredAdd: Bn,
    desiredRemove: Bn,
    availableAdd: Bn,
    availableRemove: Bn,
    absentAdd: Bn,
    absentRemove: Bn,
    excludedAdd: Bn,
    excludedRemove: Bn,
    maxMinutes: D.number().int().min(5).max(180).nullable(),
    maxMinutesChanged: D.boolean(),
    servings: D.number().int().min(1).max(12).nullable(),
    mood: D.enum([
      "cozy",
      "light",
      "hearty",
      "quick",
      "comfort",
      "fresh",
      "spicy",
      "sweet",
    ]).nullable(),
    moodChanged: D.boolean(),
    appliances: D.array(D.enum(["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"])).max(7),
    appliancesChanged: D.boolean(),
    strictPantry: D.boolean().nullable(),
    vegetarian: D.boolean().nullable(),
    reply: D.string().max(350),
  }).strict();
var N_ = (e) =>
    e.getFullYear() +
    "-" +
    String(e.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(e.getDate()).padStart(2, "0"),
  im = "https://treas.su/cook/";
function Bi() {
  return typeof window > "u" ? null : window.CookNative || null;
}
var mt = () => !!Bi(),
  hu = () => (mt() ? im : ""),
  sm = "cook-back",
  rm = "cook-open",
  sa = (e) => {
    e?.catch?.(() => {});
  },
  xC = !1;
function CC() {
  let e = Bi();
  !e ||
    xC ||
    ((xC = !0),
    document.documentElement.classList.add("is-app"),
    M_(),
    D_(e.Cook),
    __(e.Cook),
    O_(e.Cook),
    z_(e.Cook),
    Z_(e.App),
    sa(
      e.LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (t) => {
          let n = t.notification.extra?.tab;
          window.dispatchEvent(new CustomEvent(rm, { detail: { tab: n } }));
        },
      ),
    ),
    sa(om()));
}
function M_() {
  let e = window.fetch.bind(window);
  window.fetch = (t, n) => {
    if (
      !(
        typeof t == "string" ? t : t instanceof URL ? t.href : t.url
      ).startsWith(im)
    )
      return e(t, n);
    let i = new Headers(
      n?.headers || (t instanceof Request ? t.headers : void 0),
    );
    i.set("X-Cook-App", "android");
    let s = n?.signal ?? (t instanceof Request ? t.signal : void 0);
    return s?.aborted
      ? Promise.reject(new DOMException("Aborted", "AbortError"))
      : new Promise((r, o) => {
          let l = () => {
              f(), o(new DOMException("Aborted", "AbortError"));
            },
            u = setTimeout(() => {
              f(), o(new TypeError("Сервер не ответил вовремя"));
            }, 45e3),
            f = () => {
              clearTimeout(u), s?.removeEventListener("abort", l);
            };
          s?.addEventListener("abort", l, { once: !0 }),
            e(t, { ...n, headers: i }).then(
              (p) => {
                f(), r(p);
              },
              (p) => {
                f(), o(p);
              },
            );
        });
  };
}
var wC = (e, t) => ({ 0: { transcript: e }, length: 1, isFinal: t }),
  $a = null,
  y0 = null,
  b0 = class {
    constructor(t) {
      this.lang = "ru-RU";
      this.continuous = !1;
      this.interimResults = !1;
      this.maxAlternatives = 1;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.onstart = null;
      this.ended = !1;
      this.cook = t;
    }
    start() {
      $a && $a !== this && $a.finish(),
        ($a = this),
        (this.ended = !1),
        y0 ??
          (y0 = this.cook
            .speechAvailable()
            .then((t) => t.available)
            .catch(() => !1)),
        y0
          .then((t) => {
            if (!($a !== this || this.ended)) {
              if (!t) {
                (y0 = null), this.fail("service-not-allowed");
                return;
              }
              return this.cook.speechStart({ lang: this.lang || "ru-RU" });
            }
          })
          .catch((t) => this.fail(E_(t)));
    }
    stop() {
      $a === this && sa(this.cook.speechStop());
    }
    abort() {
      $a === this && (sa(this.cook.speechAbort()), this.fail("aborted"));
    }
    handle(t) {
      this.ended ||
        (t.type === "start"
          ? this.onstart?.()
          : t.type === "partial"
            ? this.interimResults &&
              t.text &&
              this.onresult?.({ resultIndex: 0, results: [wC(t.text, !1)] })
            : t.type === "final"
              ? t.text &&
                this.onresult?.({ resultIndex: 0, results: [wC(t.text, !0)] })
              : t.type === "error"
                ? this.onerror?.({ error: t.error || "service-not-allowed" })
                : t.type === "end" && this.finish());
    }
    fail(t) {
      this.ended || (this.onerror?.({ error: t }), this.finish());
    }
    finish() {
      this.ended ||
        ((this.ended = !0), $a === this && ($a = null), this.onend?.());
    }
  };
function E_(e) {
  let t =
    e && typeof e == "object" && "code" in e
      ? String(e.code)
      : e instanceof Error
        ? e.message
        : "";
  return [
    "not-allowed",
    "network",
    "audio-capture",
    "no-speech",
    "busy",
  ].includes(t)
    ? t
    : "service-not-allowed";
}
function D_(e) {
  sa(e.addListener("speech", (n) => $a?.handle(n)));
  let t = function () {
    return new b0(e);
  };
  for (let n of ["SpeechRecognition", "webkitSpeechRecognition"])
    Object.defineProperty(window, n, {
      value: t,
      configurable: !0,
      writable: !0,
    });
}
var v0 = class {
  constructor(t = "") {
    this.lang = "ru-RU";
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.onend = null;
    this.onerror = null;
    this.onstart = null;
    this.text = t;
  }
};
function __(e) {
  let t = 0,
    n = null;
  sa(
    e.addListener("tts", (s) => {
      if (!n || n.id !== s.id) return;
      let r = n.u;
      (n = null),
        (i.speaking = !1),
        (s.type === "end" ? r.onend : r.onerror || r.onend)?.();
    }),
  );
  let a = {
      name: "Голос телефона",
      lang: "ru-RU",
      default: !0,
      localService: !0,
      voiceURI: "android",
    },
    i = {
      speaking: !1,
      pending: !1,
      paused: !1,
      onvoiceschanged: null,
      getVoices: () => [a],
      addEventListener() {},
      removeEventListener() {},
      pause() {},
      resume() {},
      speak(s) {
        let r = String(++t);
        (n = { id: r, u: s }),
          (i.speaking = !0),
          s.onstart?.(),
          e
            .speak({
              text: s.text,
              lang: s.lang || "ru-RU",
              rate: s.rate || 1,
              id: r,
            // The voice chosen in Профиль (app/voice): its id travels as voiceURI.
            voice: s.voice && s.voice.voiceURI !== "android" ? s.voice.voiceURI : void 0,
            })
            .catch(() => {
              n?.id === r &&
                ((n = null), (i.speaking = !1), (s.onerror || s.onend)?.());
            });
      },
      cancel() {
        (n = null), (i.speaking = !1), sa(e.ttsStop());
      },
    };
  Object.defineProperty(window, "speechSynthesis", {
    value: i,
    configurable: !0,
    writable: !0,
  }),
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: v0,
      configurable: !0,
      writable: !0,
    });
}
function O_(e) {
  let t = 0;
  Object.defineProperty(navigator, "wakeLock", {
    value: {
      request: async () => {
        t++, await e.keepAwake({ on: !0 });
        let a = !1;
        return {
          type: "screen",
          get released() {
            return a;
          },
          addEventListener() {},
          removeEventListener() {},
          release: async () => {
            a ||
              ((a = !0),
              (t = Math.max(0, t - 1)),
              t || (await e.keepAwake({ on: !1 })));
          },
        };
      },
    },
    configurable: !0,
  }),
    Object.defineProperty(navigator, "vibrate", {
      value: (a) => {
        let i = (Array.isArray(a) ? a : [a]).map((s) =>
          Math.max(0, Math.min(5e3, Math.round(Number(s) || 0))),
        );
        return sa(e.vibrate({ pattern: i })), !0;
      },
      configurable: !0,
      writable: !0,
    });
}
var TC = (e) =>
  /^(https?:|mailto:|tel:|tg:|vk:|whatsapp:|market:|rustore:)/i.test(e) &&
  !e.startsWith(location.origin);
function z_(e) {
  Object.defineProperty(navigator, "share", {
    value: (n) => e.share({ title: n?.title, text: n?.text, url: n?.url }),
    configurable: !0,
    writable: !0,
  });
  let t = window.open.bind(window);
  (window.open = (n, ...a) => {
    let i = String(n ?? "");
    return TC(i) ? (sa(e.openUrl({ url: i })), null) : t(n, ...a);
  }),
    document.addEventListener(
      "click",
      (n) => {
        let a = n.target?.closest?.("a[href]");
        !a ||
          n.defaultPrevented ||
          a.hasAttribute("download") ||
          (TC(a.href) && (n.preventDefault(), sa(e.openUrl({ url: a.href }))));
      },
      !0,
    );
}
function Z_(e) {
  sa(
    e.addListener("backButton", () => {
      let t = document.querySelectorAll("[role=dialog]"),
        n = t[t.length - 1];
      if (n) {
        n.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            bubbles: !0,
            cancelable: !0,
          }),
        );
        return;
      }
      let a = new CustomEvent(sm, { cancelable: !0 });
      window.dispatchEvent(a) && sa(e.minimizeApp());
    }),
  );
}
var AC = 7001,
  nm = 8e3,
  U_ = 8099,
  I_ = 8099,
  am = { smallIcon: "ic_stat_cook", iconColor: "#B7432F" },
  SC = null;
function om() {
  let e = Bi();
  return e
    ? (SC ??
        (SC = Promise.all([
          e.LocalNotifications.createChannel({
            id: "cook-timer",
            name: "Таймер готовки",
            description: "Сигнал, когда закончился таймер шага",
            importance: 5,
            visibility: 1,
            sound: "timer.wav",
            vibration: !0,
            lights: !0,
            lightColor: "#B7432F",
          }),
          e.LocalNotifications.createChannel({
            id: "cook-reminders",
            name: "Напоминания",
            description: "Что приготовить сегодня и меню на неделю",
            importance: 3,
            visibility: 1,
            vibration: !0,
          }),
        ])
          .then(() => {})
          .catch(() => {})),
      SC)
    : Promise.resolve();
}
async function yu(e) {
  let t = Bi();
  if (!t) return !1;
  try {
    let n = (await t.LocalNotifications.checkPermissions()).display;
    return (
      n !== "granted" &&
        n !== "denied" &&
        e &&
        (n = (await t.LocalNotifications.requestPermissions()).display),
      n === "granted"
    );
  } catch {
    return !1;
  }
}
async function RC(e, t, n) {
  let a = Bi();
  if (!a || e <= Date.now() + 500 || !(await yu(!1))) return !1;
  await om();
  try {
    return (
      await a.LocalNotifications.schedule({
        notifications: [
          {
            id: AC,
            title: t,
            body: n,
            channelId: "cook-timer",
            sound: "timer.wav",
            ...am,
            schedule: { at: new Date(e), allowWhileIdle: !0 },
            extra: { tab: "cooking" },
          },
        ],
      }),
      !0
    );
  } catch {
    return !1;
  }
}
function NC() {
  let e = Bi();
  e && sa(e.LocalNotifications.cancel({ notifications: [{ id: AC }] }));
}
var L_ = [
    "Не знаете, что приготовить? Идея дня уже ждёт.",
    "Скажите, что есть дома, — подберу блюдо за минуту.",
    "Загляните: для вас есть идея на сегодня.",
  ],
  B_ = 18;
function P_(e, t, n = new Date()) {
  let a = [],
    i = "Что приготовить?";
  if (e.daily) {
    let [s, r] = e.daily.split(":").map(Number);
    for (let o = 0; o < 30; o++) {
      let l = new Date(n.getFullYear(), n.getMonth(), n.getDate() + o, s, r);
      if (l.getTime() <= n.getTime() + 3e4) continue;
      let u = t.find((f) => f.date === N_(l))?.body || L_[l.getDate() % 3];
      a.push({
        id: nm + o,
        title: i,
        body: u,
        channelId: "cook-reminders",
        ...am,
        schedule: { at: l, allowWhileIdle: !0 },
        extra: { tab: "chat" },
      });
    }
  }
  if (e.weekly) {
    let s = 0;
    for (let r = 0; r < 35 && s < 4; r++) {
      let o = new Date(n.getFullYear(), n.getMonth(), n.getDate() + r, B_, 0);
      o.getDay() !== 0 ||
        o.getTime() <= n.getTime() + 3e4 ||
        (a.push({
          id: nm + 40 + s,
          title: "Меню на неделю",
          body: "Составим меню на следующую неделю? Это займёт минуту, а список покупок соберётся сам.",
          channelId: "cook-reminders",
          ...am,
          schedule: { at: o, allowWhileIdle: !0 },
          extra: { tab: "menu" },
        }),
        s++);
    }
  }
  return a;
}
var MC = () => Array.from({ length: U_ - nm }, (e, t) => ({ id: nm + t }));
async function k0(e, t, n) {
  let a = Bi();
  if (
    !a ||
    (await a.LocalNotifications.cancel({ notifications: MC() }).catch(() => {}),
    !e.daily && !e.weekly)
  )
    return;
  if (!(await yu(n)))
    throw new Error(
      "Уведомления для приложения выключены. Включите их: «Настройки» телефона → «Приложения» → «Что приготовить?» → «Уведомления».",
    );
  await om();
  let i = P_(e, t);
  i.length && (await a.LocalNotifications.schedule({ notifications: i }));
}
async function EC() {
  let e = Bi();
  e &&
    (await e.LocalNotifications.cancel({ notifications: MC() }).catch(
      () => {},
    ));
}
async function DC() {
  let e = Bi();
  if (e) {
    if (!(await yu(!0)))
      throw new Error("Уведомления для приложения выключены.");
    await om(),
      await e.LocalNotifications.schedule({
        notifications: [
          {
            id: I_,
            title: "Что приготовить?",
            body: "Готово! Так будут выглядеть напоминания.",
            channelId: "cook-reminders",
            ...am,
            schedule: { at: new Date(Date.now() + 3e3), allowWhileIdle: !0 },
          },
        ],
      });
  }
}
function wt(e) {
  return hu() + "api/index.php?r=" + encodeURIComponent(e);
}
var _C = [
    {
      id: "side-mash",
      title: "Картофельное пюре",
      short: "Пюре",
      minutes: 35,
      active: 15,
      appliances: ["pot"],
      tags: ["kids"],
      allergens: ["milk"],
      items: [
        ["potato", 500, "г"],
        ["butter", 20, "г"],
        ["milk", 100, "мл"],
        ["salt", 3, "г"],
      ],
      steps: [
        [
          "Почистите картофель, нарежьте крупными кусками, залейте холодной водой и поставьте на огонь.",
        ],
        ["После закипания посолите и варите картофель до мягкости.", 1200],
        [
          "Слейте воду, добавьте масло и горячее молоко и разомните толкушкой до гладкости.",
        ],
      ],
    },
    {
      id: "side-buckwheat",
      title: "Гречка рассыпчатая",
      short: "Гречка",
      minutes: 25,
      active: 5,
      appliances: ["pot"],
      tags: ["kids"],
      allergens: [],
      items: [
        ["buckwheat", 150, "г"],
        ["water", 300, "мл"],
        ["butter", 15, "г", !0],
        ["salt", 3, "г"],
      ],
      steps: [
        [
          "Промойте гречку, залейте водой (на 1 часть крупы 2 части воды), посолите и доведите до кипения.",
        ],
        ["Убавьте огонь до слабого, накройте крышкой и варите гречку.", 900],
        [
          "Снимите с огня, добавьте масло и дайте гречке постоять под крышкой.",
          300,
        ],
      ],
    },
    {
      id: "side-rice",
      title: "Рис отварной",
      short: "Рис",
      minutes: 25,
      active: 5,
      appliances: ["pot"],
      tags: ["kids"],
      allergens: [],
      items: [
        ["rice", 150, "г"],
        ["water", 300, "мл"],
        ["salt", 3, "г"],
        ["butter", 10, "г", !0],
      ],
      steps: [
        [
          "Промойте рис до прозрачной воды, залейте водой (1 : 2), посолите и доведите до кипения.",
        ],
        ["Убавьте огонь, накройте крышкой и варите рис, не помешивая.", 1080],
        [
          "Снимите с огня, добавьте масло и дайте постоять под крышкой 5 минут.",
        ],
      ],
    },
    {
      id: "side-pasta",
      title: "Макароны отварные",
      short: "Макароны",
      minutes: 15,
      active: 5,
      appliances: ["pot"],
      tags: ["kids"],
      allergens: ["gluten"],
      items: [
        ["pasta", 180, "г"],
        ["water", 2e3, "мл"],
        ["salt", 10, "г"],
        ["butter", 15, "г", !0],
      ],
      steps: [
        ["Вскипятите воду, посолите и всыпьте макароны."],
        [
          "Варите макароны по времени на упаковке, обычно 8–10 минут, иногда помешивая.",
          540,
        ],
        ["Откиньте макароны на дуршлаг и перемешайте с маслом."],
      ],
    },
    {
      id: "side-salad",
      title: "Салат из свежих овощей",
      short: "Свежие овощи",
      minutes: 10,
      active: 10,
      appliances: [],
      tags: ["light", "fresh"],
      allergens: [],
      items: [
        ["cucumber", 150, "г"],
        ["tomato", 200, "г"],
        ["dill", 5, "г", !0],
        ["vegetable-oil", 15, "мл"],
        ["salt", 2, "г"],
      ],
      steps: [
        ["Нарежьте огурцы и помидоры, посолите."],
        ["Заправьте маслом и посыпьте укропом прямо перед подачей."],
      ],
    },
    {
      id: "side-cabbage",
      title: "Капуста тушёная",
      short: "Тушёная капуста",
      minutes: 40,
      active: 10,
      appliances: ["pan"],
      tags: [],
      allergens: [],
      items: [
        ["cabbage", 400, "г"],
        ["carrot", 80, "г"],
        ["onion", 60, "г"],
        ["tomato-paste", 20, "г", !0],
        ["vegetable-oil", 20, "мл"],
        ["salt", 4, "г"],
      ],
      steps: [
        [
          "Нашинкуйте капусту, натрите морковь, нарежьте лук. Обжарьте лук и морковь на масле 5 минут.",
        ],
        [
          "Добавьте капусту, посолите, влейте немного воды и тушите под крышкой, помешивая.",
          1800,
        ],
        [
          "В конце добавьте томатную пасту, перемешайте и прогрейте ещё 3 минуты.",
        ],
      ],
    },
  ],
  j_ = 2;
function H_(e) {
  return {
    id: e.id,
    title: e.title,
    summary: "Гарнир",
    servings: j_,
    minServings: 1,
    maxServings: 12,
    totalMinutes: e.minutes,
    activeMinutes: e.active,
    difficulty: "easy",
    ingredients: e.items.map(([t, n, a, i]) => ({
      id: t,
      name: _s(t, me(t)?.name || t),
      amount: n,
      unit: a,
      optional: !!i,
    })),
    appliances: e.appliances,
    tags: e.tags,
    allergens: e.allergens,
    steps: e.steps.map(([t, n]) =>
      n ? { text: t, timerSeconds: n } : { text: t },
    ),
    tips: [],
    editorialStatus: "published",
    version: "1",
    course: "side",
  };
}
var x0 = _C.map(H_),
  OC = (e) => _C.find((t) => t.id === e)?.short || "";
function zC(e) {
  return e.needsSide === !0;
}
function ZC(e, t = []) {
  let n = (e.mainIngredient || "") + " " + e.title.toLowerCase(),
    a = /(рыб|минтай|горбуш|лосос|треск|судак|fish|salmon|pollock)/.test(n)
      ? ["side-rice", "side-mash", "side-salad", "side-buckwheat"]
      : /(печен|liver)/.test(n)
        ? ["side-mash", "side-buckwheat", "side-pasta", "side-salad"]
        : /(гуляш|бефстроган|подлив|соус|тефтел|фрикадел)/.test(n)
          ? ["side-mash", "side-buckwheat", "side-rice", "side-pasta"]
          : /(свин|буженин|отбивн|шницел|колбас|сосис)/.test(n)
            ? ["side-mash", "side-cabbage", "side-buckwheat", "side-salad"]
            : ["side-mash", "side-buckwheat", "side-pasta", "side-salad"],
    i = (s) =>
      !s.ingredients.some((r) => !r.optional && t.some((o) => Os(r.id, o))) &&
      !s.allergens.some((r) => t.includes(r));
  return a
    .map((s) => x0.find((r) => r.id === s))
    .filter(Boolean)
    .filter(i)
    .slice(0, 4);
}
function UC(e, t) {
  let n = e.servings / t.servings,
    a = t.ingredients.map((l) => ({
      ...l,
      amount: Math.round(l.amount * n * 100) / 100,
    })),
    i = [...e.ingredients.map((l) => ({ ...l }))];
  for (let l of a) {
    let u = i.find((f) => f.id === l.id && f.unit === l.unit);
    u ? (u.amount = Math.round((u.amount + l.amount) * 100) / 100) : i.push(l);
  }
  let s = "Гарнир («" + t.title.toLowerCase() + "»): ",
    r = t.steps.map((l) => ({
      ...l,
      text: s + l.text.charAt(0).toLowerCase() + l.text.slice(1),
    })),
    o =
      t.totalMinutes >= e.totalMinutes || e.steps.length < 2
        ? [...r, ...e.steps]
        : [...e.steps.slice(0, -1), ...r, e.steps[e.steps.length - 1]];
  return {
    ...e,
    ingredients: i,
    steps: o,
    appliances: [...new Set([...e.appliances, ...t.appliances])],
    allergens: [...new Set([...e.allergens, ...t.allergens])],
    totalMinutes: Math.max(e.totalMinutes, t.totalMinutes),
    activeMinutes: e.activeMinutes + t.activeMinutes,
  };
}
var w0 = D.object({
    id: D.string(),
    title: D.string(),
    summary: D.string(),
    servings: D.number().int().min(1).max(12),
    minServings: D.number().int().min(1).max(12),
    maxServings: D.number().int().min(1).max(12),
    totalMinutes: D.number().positive(),
    activeMinutes: D.number().nonnegative(),
    difficulty: D.enum(["easy", "medium", "hard"]),
    ingredients: D.array(
      D.object({
        id: D.string(),
        name: D.string(),
        amount: D.number().positive(),
        unit: D.string(),
        optional: D.boolean(),
      }).passthrough(),
    )
      .min(1)
      .max(50),
    appliances: D.array(D.string()),
    tags: D.array(D.string()),
    allergens: D.array(D.string()),
    steps: D.array(
      D.object({
        text: D.string(),
        timerSeconds: D.number().positive().optional(),
      }).passthrough(),
    )
      .min(1)
      .max(30),
    tips: D.array(D.string()),
    editorialStatus: D.string(),
    version: D.string(),
    storageDays: D.number().int().min(0).max(14).optional(),
    cuisine: D.string().max(40).optional(),
    aliases: D.array(D.string().max(60)).max(10).optional(),
  }).passthrough(),
  V_ = D.object({
    key: D.string(),
    ingredientId: D.string(),
    name: D.string().max(120),
    amount: D.number().positive(),
    unit: D.string().max(40),
    checked: D.boolean(),
    recipes: D.array(D.string().max(120)).max(20).optional(),
    // How much of the amount each recipe asked for (recipe id → amount in this row's unit): «Для блюд» in «Покупки».
    parts: D.record(D.string().max(80), D.number().nonnegative()).optional(),
  }),
  q_ = D.object({
    role: D.enum(["user", "assistant"]),
    text: D.string().max(2e3),
    results: D.array(
      D.object({
        id: D.string().max(80),
        reason: D.string().max(300),
        note: D.string().max(300).optional(),
      }),
    )
      .max(5)
      .optional(),
    options: D.array(
      D.object({
        label: D.string().max(80),
        text: D.string().max(200).optional(),
        relax: D.string().max(80).optional(),
        open: D.string().max(80).optional(),
        action: D.enum(["pantry"]).optional(),
      }),
    )
      .max(6)
      .optional(),
    chips: D.array(D.string().max(60)).max(10).optional(),
  }),
  G_ = D.object({
    operationId: D.string().uuid(),
    recipeId: D.string(),
    value: D.enum(vS),
    createdAt: D.number(),
  }),
  K_ = D.object({
    recipe: w0,
    servings: D.number().int().min(1).max(12),
    step: D.number().int().nonnegative(),
    timerEnd: D.number().nullable(),
    timerStep: D.number().int().nullable(),
    startedAt: D.number(),
    done: D.boolean(),
  }).refine(
    (e) =>
      e.step < e.recipe.steps.length &&
      e.servings >= e.recipe.minServings &&
      e.servings <= e.recipe.maxServings,
  ),
  bu = 300,
  Y_ = 150,
  X_ = 500,
  T0 = D.object({
    id: D.string().min(1).max(40),
    recipeId: D.string().min(1).max(80),
    title: D.string().min(1).max(200),
    at: D.number().int().positive(),
    menu: D.boolean().optional(),
    voice: D.boolean().optional(),
  }),
  lm = 200,
  S0 = D.object({
    id: D.string().min(1).max(80),
    at: D.number().int().positive(),
    until: D.number().int().positive().nullable(),
  }),
  Q_ = D.object({
    token: D.string().regex(/^[0-9a-f]{32}$/),
    day: D.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    createdAt: D.number(),
    options: D.array(
      D.object({ id: D.string().max(80), title: D.string().max(200) }),
    )
      .min(2)
      .max(4),
  });
// «Семейная книга»: the person's own recipes (free text), checked like everything else that is saved or synced.
function MyR(e) {
  if (!Array.isArray(e)) return [];
  let str = (v, n) => (typeof v == "string" ? v.slice(0, n) : "");
  return e
    .filter((r) => r && typeof r == "object" && typeof r.id == "string" && /^[a-z0-9-]{4,40}$/.test(r.id) && typeof r.title == "string" && r.title.trim())
    .slice(-200)
    .map((r) => ({
      id: r.id,
      title: str(r.title, 120).trim(),
      from: str(r.from, 80),
      people: Number.isInteger(r.people) && r.people > 0 && r.people <= 50 ? r.people : null,
      minutes: Number.isInteger(r.minutes) && r.minutes > 0 && r.minutes <= 2880 ? r.minutes : null,
      ingredients: str(r.ingredients, 4000),
      steps: str(r.steps, 8000),
      note: str(r.note, 1000),
      at: typeof r.at == "number" ? r.at : 0,
    }));
}
function C0(e) {
  let t = {};
  if (!e || typeof e != "object" || Array.isArray(e)) return t;
  for (let [n, a] of Object.entries(e).slice(-Y_))
    n.length <= 80 &&
      typeof a == "string" &&
      a.trim() &&
      (t[n] = a.slice(0, X_));
  return t;
}
function vu(e) {
  let t = structuredClone(Es);
  if (!e || typeof e != "object") return t;
  let n = e,
    a = (o, l, u) =>
      Array.isArray(n[o])
        ? n[o].slice(0, u).flatMap((f) => {
            let p = l.safeParse(f);
            return p.success ? [p.data] : [];
          })
        : [];
  (t.favorites = a("favorites", w0, 300)),
    (t.recent = a("recent", w0, 20)),
    (t.shopping = a("shopping", V_, 300)),
    (t.conversation = a("conversation", q_, 20)),
    (t.feedbackQueue = a("feedbackQueue", G_, 30)),
    (t.engaged = n.engaged === !0),
    (t.installDismissed = n.installDismissed === !0),
    (t.voiceUsed = n.voiceUsed === !0),
    (t.readAloud = n.readAloud === !0),
    (t.syncBase =
      n.syncBase && typeof n.syncBase == "object" ? n.syncBase : null),
    (t.largeText = n.largeText === !0),
    (t.onboarding =
      n.onboarding === "done" || n.onboarding === "skipped"
        ? n.onboarding
        : "new");
  {
    let o = n.taste && typeof n.taste == "object" ? n.taste : {},
      l = (u, f) =>
        Array.isArray(u)
          ? [
              ...new Set(
                u.filter((p) => typeof p == "string" && p.length <= 60),
              ),
            ].slice(-f)
          : [];
    t.taste = {
      liked: l(o.liked, 60),
      tooHard: l(o.tooHard, 60),
      disliked: l(o.disliked, 60),
      notNow: Array.isArray(o.notNow)
        ? o.notNow
            .filter(
              (u) => !!u && typeof u.id == "string" && typeof u.at == "number",
            )
            .slice(-30)
        : [],
    };
  }
  (t.noticeOk = n.noticeOk === !0),
    (t.fridge = a("fridge", S0, lm)),
    (t.polls = a("polls", Q_, 5)),
    (t.voter =
      typeof n.voter == "string" && /^[a-f0-9-]{36}$/.test(n.voter)
        ? n.voter
        : "");
  {
    let o = n.menuPlan;
    if (o && typeof o == "object") {
      let l = Array.isArray(o.meals)
        ? ["breakfast", "lunch", "dinner"].filter((u) => o.meals.includes(u))
        : [];
      t.menuPlan = {
        meals: l.length ? l : ["dinner"],
        quickWeekdays: o.quickWeekdays !== !1,
        cookAhead: o.cookAhead !== !1,
      };
    }
  }
  {
    let o = n.tasteTest;
    o &&
      typeof o == "object" &&
      (t.tasteTest = {
        portrait: typeof o.portrait == "string" ? o.portrait.slice(0, 300) : "",
        title: typeof o.title == "string" ? o.title.slice(0, 80) : "",
        at: typeof o.at == "number" ? o.at : 0,
        dismissed: o.dismissed === !0,
      });
  }
  (t.joined = Array.isArray(n.joined)
    ? n.joined
        .filter((o) => typeof o == "string" && /^\d{4}-\d{2}$/.test(o))
        .slice(-24)
    : []),
    (t.book = a("book", T0, 2e3).slice(-bu)),
    (t.notes = C0(n.notes)),
    (t.myRecipes = MyR(n.myRecipes)),
    (t.rewards = n.rewards !== !1),
    (t.seenBadges = Array.isArray(n.seenBadges)
      ? n.seenBadges
          .filter((o) => typeof o == "string" && o.length <= 30)
          .slice(0, 40)
      : []);
  {
    let o = n.reminders && typeof n.reminders == "object" ? n.reminders : {};
    t.reminders = {
      daily:
        typeof o.daily == "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(o.daily)
          ? o.daily
          : null,
      weekly: o.weekly === !0,
    };
  }
  {
    let o = n.today && typeof n.today == "object" ? n.today : {};
    t.today = {
      date:
        typeof o.date == "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date)
          ? o.date
          : "",
      skip: Array.isArray(o.skip)
        ? o.skip
            .filter((l) => typeof l == "string" && l.length <= 80)
            .slice(-40)
        : [],
    };
  }
  t.menu = Array.isArray(n.menu)
    ? n.menu
        .filter(
          (o) =>
            !!o &&
            typeof o == "object" &&
            typeof o.date == "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
            Array.isArray(o.items),
        )
        .slice(0, 31)
        .map((o) => ({
          date: o.date,
          items: o.items
            .filter(
              (l) =>
                !!l &&
                typeof l == "object" &&
                typeof l.recipeId == "string" &&
                Number.isInteger(l.servings) &&
                l.servings >= 1 &&
                l.servings <= 12,
            )
            .slice(0, 6)
            .map((l) => {
              let u = l;
              return {
                recipeId: l.recipeId.slice(0, 60),
                servings: l.servings,
                ...(u.meal === "breakfast" ||
                u.meal === "lunch" ||
                u.meal === "dinner"
                  ? { meal: u.meal }
                  : {}),
                ...(u.leftover === !0 ? { leftover: !0 } : {}),
              };
            }),
        }))
    : [];
  let i = g0.safeParse(n.conditions),
    s = h0.safeParse(n.preferences),
    r = K_.safeParse(n.cooking);
  return (
    i.success && (t.conditions = i.data),
    s.success && (t.preferences = s.data),
    r.success && (t.cooking = r.data),
    t
  );
}
var F_ = "cook-mood-v1",
  Dr = "state";
function A0() {
  return new Promise((e, t) => {
    let n = indexedDB.open(F_, 1);
    (n.onupgradeneeded = () => n.result.createObjectStore(Dr)),
      (n.onerror = () => t(n.error)),
      (n.onsuccess = () => e(n.result));
  });
}
async function cm() {
  let e = await A0();
  return new Promise((t, n) => {
    let a = e.transaction(Dr, "readonly"),
      i = a.objectStore(Dr).get("guest");
    (i.onsuccess = () => t(vu(i.result))),
      (i.onerror = () => n(i.error)),
      (a.oncomplete = () => e.close());
  });
}
async function um(e) {
  let t = await A0();
  return new Promise((n, a) => {
    let i = t.transaction(Dr, "readwrite");
    i.objectStore(Dr).put(e, "guest"),
      (i.oncomplete = () => {
        t.close(), n();
      }),
      (i.onerror = () => {
        t.close(), a(i.error);
      });
  });
}
async function IC() {
  let e = await A0();
  return new Promise((t, n) => {
    let a = e.transaction(Dr, "readwrite");
    a.objectStore(Dr).clear(),
      (a.oncomplete = () => {
        e.close(), t();
      }),
      (a.onerror = () => n(a.error));
  });
}

export {
  MyR,
  bS,
  zp,
  GE,
  vS,
  Es,
  kS,
  xS,
  wS,
  TS,
  SS,
  Pb,
  KE,
  YE,
  XE,
  QE,
  FE,
  JE,
  jb,
  wr,
  $E,
  WE,
  AS,
  CS,
  Hb,
  Oa,
  eD,
  tD,
  nD,
  Vb,
  F,
  za,
  bt,
  qb,
  me,
  Za,
  Gb,
  Kb,
  Qa,
  Oe,
  Sr,
  _e,
  iD,
  Xe,
  pt,
  sD,
  RS,
  rD,
  Fa,
  cu,
  Yb,
  Xb,
  NS,
  MS,
  ES,
  oD,
  aa,
  _i,
  Cr,
  Oi,
  DS,
  lD,
  cD,
  Zp,
  uD,
  uu,
  $o,
  Ds,
  nt,
  Ne,
  dD,
  _S,
  zi,
  Qb,
  Zt,
  fD,
  Ar,
  Up,
  mn,
  Ip,
  OS,
  Yt,
  pD,
  zS,
  Fb,
  Jb,
  ZS,
  Wo,
  $b,
  Zi,
  mD,
  Rr,
  Lp,
  gD,
  t0,
  hD,
  n0,
  Bp,
  We,
  Wb,
  Pp,
  jp,
  _s,
  e0,
  yD,
  US,
  bD,
  vD,
  a0,
  kD,
  i0,
  xD,
  wD,
  Os,
  ia,
  Hp,
  TD,
  IS,
  LS,
  el,
  r0,
  zs,
  SD,
  CD,
  Qe,
  Ui,
  du,
  AD,
  Zs,
  RD,
  s0,
  fu,
  Vp,
  pu,
  qp,
  rn,
  Gp,
  ND,
  MD,
  ED,
  DD,
  BS,
  PS,
  KS,
  _D,
  YS,
  jS,
  HS,
  OD,
  o0,
  zD,
  ZD,
  UD,
  ID,
  LD,
  BD,
  Kp,
  tl,
  VS,
  qS,
  PD,
  jD,
  GS,
  XS,
  QS,
  Ii,
  Yp,
  Li,
  Nr,
  HD,
  VD,
  FS,
  JS,
  $S,
  l0,
  H8,
  qD,
  GD,
  KD,
  WS,
  yt,
  eC,
  tC,
  aC,
  YD,
  nl,
  nC,
  Ca,
  iC,
  Xp,
  XD,
  c0,
  sC,
  Ut,
  u0,
  QD,
  p0,
  m0,
  FD,
  rC,
  Ja,
  mu,
  d0,
  JD,
  al,
  f0,
  Qp,
  Fp,
  Jp,
  oe,
  $D,
  WD,
  e_,
  t_,
  n_,
  oC,
  lC,
  cC,
  uC,
  a_,
  dC,
  fC,
  gn,
  i_,
  pC,
  il,
  Mr,
  mC,
  s_,
  $p,
  Us,
  sl,
  yC,
  tn,
  Wp,
  gu,
  tm,
  r_,
  o_,
  em,
  l_,
  c_,
  u_,
  d_,
  f_,
  bC,
  p_,
  gC,
  m_,
  g_,
  h_,
  y_,
  b_,
  v_,
  k_,
  x_,
  Er,
  vC,
  w_,
  hC,
  T_,
  S_,
  C_,
  A_,
  R_,
  Bn,
  g0,
  h0,
  TU,
  kC,
  N_,
  im,
  Bi,
  mt,
  hu,
  sm,
  rm,
  sa,
  xC,
  CC,
  M_,
  wC,
  $a,
  y0,
  b0,
  E_,
  D_,
  v0,
  __,
  O_,
  TC,
  z_,
  Z_,
  AC,
  nm,
  U_,
  I_,
  am,
  SC,
  om,
  yu,
  RC,
  NC,
  L_,
  B_,
  P_,
  MC,
  k0,
  EC,
  DC,
  wt,
  _C,
  j_,
  H_,
  x0,
  OC,
  zC,
  ZC,
  UC,
  w0,
  V_,
  q_,
  G_,
  K_,
  bu,
  Y_,
  X_,
  T0,
  lm,
  S0,
  Q_,
  C0,
  vu,
  F_,
  Dr,
  A0,
  cm,
  um,
  IC,
};
