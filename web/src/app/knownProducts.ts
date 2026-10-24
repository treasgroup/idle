// What people write in a list and shops print on a receipt, said plainly — for «Мои продукты» (a list, a receipt) and
// «Покупки» (a typed list). The fuzzy search read «яйца» as egg white, «огурцы» as pickled ones, «куриные бёдра» as
// hearts, «масло» as sesame oil, «сок» as lime juice, «ФИЛЕ ГРУДКИ ЦБ» as pollock and «ТОМАТЫ ЧЕРРИ» as canned.
const KNOWN: [RegExp, string[]][] = [
  [/перепел/, ["quail-egg"]],
  [/^(?!.*(?:белок|белк|желт|лапш)).*(?<![а-я])(?:яйц|яйк|яичк)/, ["egg"]],
  [/бородин|ржан/, ["rye-bread"]],
  [/огур\S*.*(?:солен|малосол|маринов|консерв|корнишон)|(?:солен|малосол|маринов|консерв)\S*.*огур|корнишон/, ["pickled-cucumber"]],
  [/огур/, ["cucumber"]],
  [/индейк/, ["turkey-fillet"]],
  [/бедр/, ["chicken-thigh-fillet"]],
  [/голен/, ["chicken-drumsticks"]],
  [/крыл/, ["chicken-wings"]],
  [/(?:грудк|филе)(?!.*копч).*(?:кур|цб|цыпл|бройл)|(?:кур|цб|цыпл|бройл)\S*.*(?:грудк|филе)(?!.*копч)|^филе грудки$/, ["chicken-fillet"]],
  [/черри|(?<![а-я])(?:томат|помидор)(?!.*(?:паст|соус|собствен|вялен|зелен|консерв|кетчуп))/, ["tomato"]],
  [/масло\S*\s+слив|слив\S*\s+масло|^масло$/, ["butter"]],
  [/масло\S*\s+(?:подсолн|растит|рафин)|(?:подсолн|растит)\S*\s+масло/, ["vegetable-oil"]],
  [/батон|нарезн/, ["white-bread"]],
  [/^луковиц/, ["onion"]],
  [/^зелень$/, ["dill", "parsley"]],
  [/^сок$/, []],
];

/** The products the words mean (lowercase, «е» for «ё»); [] — a word to keep as written («сок»: which one is not said); undefined — not known here. */
export function knownProduct(line: string): string[] | undefined {
  return KNOWN.find(([re]) => re.test(line))?.[1];
}
