import type { Messages } from '../types';
import { exportRu } from './export-ru';
import { privacyRu } from './privacy-ru';
import { formatsRu } from './formats-ru';
import { restoreRu } from './restore-ru';

/** Russian UI messages, checked against the English keys */
export const ru = {
  ...exportRu,
  ...privacyRu,
  ...formatsRu,
  ...restoreRu,
  title: 'trello-exporter-importer',
  badge: 'Диагностика',
  sampleText: 'Проверка локального файла / Test ✓',
  boardButton: 'trello-exporter-importer',
  modalTitle: 'trello-exporter-importer',
  connectorReady: 'Коннектор подключен',
  connectorUnavailable: 'Коннектор недоступен',
  intro: 'Диагностика авторизации Trello и работы с локальными файлами',
  language: 'Язык',
  scope: 'Выбранная тестовая доска',
  missingScope: 'В URL коннектора должна быть указана выбранная тестовая доска',
  filesTitle: 'Проверка локальных файлов',
  download: 'Скачать пример JSON',
  choose: 'Выбрать синтетический тестовый файл',
  scan: 'Прочитать выбранный файл частями',
  fileNote: 'Выбранный файл остается на устройстве и никуда не загружается',
  apiTitle: 'Проверка Trello API',
  connect: 'Авторизоваться в Trello',
  inspect: 'Прочитать сведения о тестовой доске',
  accessNote:
    'OAuth для Power-Up предоставляет чтение и запись досок в пределах рабочего пространства. Этот экран только читает выбранную доску; запись через API отключена',
  manageAccess: 'Управление и отзыв доступа в аккаунте Atlassian',
  privacy: 'Обработка данных',
  standalone:
    'Здесь доступны проверки локальных файлов. Для авторизации через API откройте экран из зарегистрированного Power-Up внутри Trello',
  report: 'Сохранить отчет диагностики',
  results: 'Результаты проверки',
  cancel: 'Отменить текущую проверку',
  idle: 'Готово',
  working: 'Выполняется…',
  started: 'Проверка начата',
  cancelled: 'Проверка отменена',
  downloaded: 'Запрошено скачивание примера JSON. Проверьте, что файл сохранился',
  selected: 'Файл выбран',
  scanned: 'Чтение файла завершено',
  connected: 'Авторизация завершена',
  inspected: 'Тестовая доска проверена через REST API',
  reported: 'Запрошено скачивание отчета диагностики',
  failed: 'Не удалось завершить проверку',
  callback: 'Завершаем авторизацию Trello…',
  callbackDone: 'Результат авторизации передан Power-Up. Это окно можно закрыть',
  callbackFailed: 'Не удалось завершить авторизацию. Вернитесь к Power-Up и повторите попытку',
  sdkUnavailable: 'SDK Trello недоступен',
} satisfies Messages;
