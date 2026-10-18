export const translations = {
  en: {
    title: 'Board Snapshot Exporter', badge: 'Compatibility prototype',
    intro: 'Checks Trello integration and local files. Full snapshot export and restore are not implemented yet.',
    language: 'Language', scope: 'Selected test board',
    missingScope: 'The connector must specify the selected test board.',
    filesTitle: 'Local file checks', download: 'Download sample JSON',
    choose: 'Choose a synthetic test file', scan: 'Read selected file in chunks',
    fileNote: 'The selected file stays on this device. It is not uploaded.',
    apiTitle: 'Trello API check', connect: 'Authorize with Trello',
    inspect: 'Read test board metadata',
    accessNote: 'Trello Power-Up OAuth grants board read/write access within a workspace. This prototype screen only reads the selected board; API writes are disabled.',
    standalone: 'Local file checks are available here. API authorization requires opening this page through the registered Power-Up inside Trello.',
    report: 'Save diagnostic report', results: 'Diagnostic results',
    cancel: 'Cancel current check', idle: 'Ready', working: 'Working…',
    started: 'Check started', cancelled: 'Check cancelled',
    downloaded: 'Sample JSON download requested. Confirm that the file was saved.',
    selected: 'File selected', scanned: 'File read completed',
    connected: 'Authorization completed', inspected: 'Selected board verified through the REST API',
    reported: 'Diagnostic report download requested',
    failed: 'The check could not be completed',
    callback: 'Completing Trello authorization…', callbackDone: 'Authorization returned to the Power-Up. You can close this window.',
    callbackFailed: 'Authorization could not be completed. Return to the Power-Up and retry.',
    sdkUnavailable: 'The Trello SDK is unavailable.',
  },
  ru: {
    title: 'Board Snapshot Exporter', badge: 'Прототип проверки совместимости',
    intro: 'Проверяем интеграцию с Trello и локальные файлы. Полный экспорт снимков и восстановление пока не реализованы.',
    language: 'Язык', scope: 'Выбранная тестовая доска',
    missingScope: 'В URL коннектора должна быть указана выбранная тестовая доска.',
    filesTitle: 'Проверка локальных файлов', download: 'Скачать пример JSON',
    choose: 'Выбрать синтетический тестовый файл', scan: 'Прочитать выбранный файл частями',
    fileNote: 'Выбранный файл остаётся на устройстве и никуда не загружается.',
    apiTitle: 'Проверка Trello API', connect: 'Авторизоваться в Trello',
    inspect: 'Прочитать сведения о тестовой доске',
    accessNote: 'OAuth для Power-Up предоставляет чтение и запись досок в пределах рабочего пространства. Этот экран только читает выбранную доску; запись через API отключена.',
    standalone: 'Здесь доступны проверки локальных файлов. Для авторизации через API откройте экран из зарегистрированного Power-Up внутри Trello.',
    report: 'Сохранить отчёт диагностики', results: 'Результаты проверки',
    cancel: 'Отменить текущую проверку', idle: 'Готово', working: 'Выполняется…',
    started: 'Проверка начата', cancelled: 'Проверка отменена',
    downloaded: 'Запрошено скачивание примера JSON. Проверьте, что файл сохранился.',
    selected: 'Файл выбран', scanned: 'Чтение файла завершено',
    connected: 'Авторизация завершена', inspected: 'Тестовая доска проверена через REST API',
    reported: 'Запрошено скачивание отчёта диагностики',
    failed: 'Не удалось завершить проверку',
    callback: 'Завершаем авторизацию Trello…', callbackDone: 'Результат авторизации передан Power-Up. Это окно можно закрыть.',
    callbackFailed: 'Не удалось завершить авторизацию. Вернитесь к Power-Up и повторите попытку.',
    sdkUnavailable: 'SDK Trello недоступен.',
  },
};

export function chooseLocale(value) {
  return String(value ?? '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function localizePage(locale) {
  const strings = translations[locale] ?? translations.en;
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = strings[element.dataset.i18n] ?? element.dataset.i18n;
  }
}
