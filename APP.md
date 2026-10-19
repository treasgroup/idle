# Android-приложение: что нужно при сборке

Сайт уже умеет работать внутри Android-приложения (оболочка на Capacitor, объект `window.CookNative`):
голос, озвучка шагов, экран не гаснет, вибрация, «Поделиться», таймер и напоминания системными
уведомлениями, кнопка «Назад», внешние ссылки — в браузере телефона. Ниже — что сделать в самом приложении.

## 1. Какие файлы класть в приложение

Приложение открывает **свою копию сайта** (из файлов внутри приложения), а за рецептами, Шефом и
синхронизацией ходит на `https://treas.su/cook/`. Поэтому оно открывается сразу и без интернета.

1. Собрать сайт: `cd web && npm run build` (или взять готовую папку `server/` из архива).
2. В папку веб-файлов приложения (`android/app/src/main/assets/public` — то, что Capacitor называет `webDir`)
   положить из `server/`:
   `index.html`, `boot.js`, `favicon.svg`, `logo-round.svg`, `manifest.webmanifest`, папки
   `assets/`, `fonts/`, `icons/`, `mascot/`, `ocr/`, а также `intent-model.json`.
   Папки `api/`, `admin/`, `bot/`, `data/`, `photos/` и файлы `*.php` в приложение **не нужны** — они на сервере.
3. `npx cap sync android`, собрать и подписать как обычно.

Важно: новая версия сайта попадает в приложение **только с новой сборкой приложения**. Рецепты, фото и
ответы Шефа обновляются сами (они с сервера).

## 2. Ссылки из мессенджеров открываются в приложении

Когда человеку присылают рецепт или «Семейную книгу», ссылка должна открыть приложение, а не браузер.
Сайт эту ссылку уже понимает (`app/appLinks.ts`); нужно сказать Android, что приложение открывает такие адреса.

**В `AndroidManifest.xml`**, внутри `<activity ... MainActivity>`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="treas.su" android:pathPrefix="/cook" />
</intent-filter>
```

**На хостинге** — файл `https://treas.su/.well-known/assetlinks.json` (в корне сайта, не в папке cook):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": { "namespace": "android_app", "package_name": "ВАШ.ПАКЕТ.ПРИЛОЖЕНИЯ",
              "sha256_cert_fingerprints": ["ОТПЕЧАТОК:SHA256:КЛЮЧА:ПОДПИСИ"] }
}]
```

Отпечаток берётся из ключа подписи: `keytool -list -v -keystore ваш.keystore` → строка SHA256.
Если приложение подписывает RuStore/Google — отпечаток их ключа указан в консоли магазина.

## 3. Размер текста

На некоторых телефонах шрифт увеличивается дважды: настройками телефона и нашим «Размером текста».
В `MainActivity.java` после запуска:

```java
@Override
public void onStart() {
  super.onStart();
  getBridge().getWebView().getSettings().setTextZoom(100);
}
```

Тогда крупный шрифт включается только нашей настройкой «Размер текста» (Профиль → Удобство), и экраны не разъезжаются.

## 4. Разрешения

В `AndroidManifest.xml` нужны только эти:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />      <!-- голосовой ввод -->
<uses-permission android:name="android.permission.CAMERA" />            <!-- штрихкод -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" /> <!-- таймер и напоминания -->
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" /> <!-- таймер точно в срок -->
```

Сайт спрашивает каждое разрешение только в момент, когда оно нужно: микрофон — при нажатии на микрофон,
камеру — при сканировании, уведомления — при первом таймере или включении напоминаний.

## 5. Проверка перед отправкой в магазин

- Без интернета: приложение открывается, рецепты видны, план и покупки работают.
- «Назад»: закрывает окошко → рецепт → возвращает на Главную → и только с Главной сворачивает приложение.
- Ссылка на рецепт, присланная в мессенджере, открывает приложение сразу на этом рецепте.
- Таймер при погашенном экране звонит системным уведомлением.
- «Заказать с доставкой», Telegram, документы открываются в браузере телефона.

## 6. Виджет «Рецепт дня» (с версии 2.0.2)

Файлы — в папке `android-extras/` этого репозитория (их кладут поверх проекта приложения):
`TodayWidget.java` и `TodayWidgetSmall.java` (2×2), `res/layout/widget_today*.xml`, `res/xml/widget_today*_info.xml`, `res/drawable/widget_bg.xml`,
`res/drawable/widget_shade.xml`, `res/values/widget_strings.xml` и `<receiver android:name=".TodayWidget">` в `AndroidManifest.xml`.

Виджет раз в 3 часа спрашивает `https://treas.su/cook/api/index.php?r=today` (блюдо дня с фото — одно для всех,
новое каждый день) и хранит последнее, поэтому без интернета показывает вчерашнее. Нажатие открывает рецепт в приложении
по обычной ссылке `https://treas.su/cook/recipe/<id>`.
