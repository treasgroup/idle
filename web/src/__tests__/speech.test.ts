import { describe, expect, it } from "vitest";
import { speechText } from "../app/speech";

describe("text for reading aloud", () => {
  it("units in full words that agree with the number", () => {
    expect(speechText("Добавьте 2 ст. л. сметаны и 1 ч. л. соли.")).toBe("Добавьте 2 столовые ложки сметаны и 1 чайная ложка соли.");
    expect(speechText("Варите 5 мин.")).toBe("Варите 5 минут.");
    expect(speechText("Влейте 200 мл молока и 1,5 л воды.")).toBe("Влейте 200 миллилитров молока и 1,5 литра воды.");
    expect(speechText("Возьмите 300 г муки.")).toBe("Возьмите 300 граммов муки.");
    expect(speechText("Духовка 180 °C, 1 ч.")).toBe("Духовка 180 градусов, 1 час.");
    expect(speechText("2 шт. яиц")).toBe("2 штуки яиц");
  });
  it("ranges as people say them", () => {
    expect(speechText("Жарьте 3–4 минуты.")).toBe("Жарьте 3 или 4 минуты.");
    expect(speechText("Пеките при 180–200 °C.")).toBe("Пеките при 180 или 200 градусов.");
  });
  it("no symbols read as words", () => {
    expect(speechText("Обжарьте лук (до прозрачности) — 5 мин. Посолите.")).toBe("Обжарьте лук до прозрачности, 5 минут. Посолите.");
    expect(speechText("«Секрет»: ½ стакана")).toBe("Секрет: половина стакана");
  });
  it("leaves plain words alone", () => {
    expect(speechText("Посолите и перемешайте, глядя на огонь.")).toBe("Посолите и перемешайте, глядя на огонь.");
    expect(speechText("Готовьте до мягкости, гриль не нужен.")).toBe("Готовьте до мягкости, гриль не нужен.");
  });
});
