import { RestoreWarning } from '../../restore/codes';
import type { restoreEn } from './restore-en';
export const restoreRu = {
  restoreDestination: 'Текущая доска назначения',
  restoreAnalyze: 'Сравнить заново',
  restoreMergeTitle: 'План слияния',
  restoreCreates: 'Добавить',
  restoreUpdates: 'Изменить',
  restoreUnchanged: 'Уже совпадает',
  restoreUnresolved: 'Неразрешенные конфликты',
  restoreMergeScope:
    'Содержимое только на текущей доске и существующий порядок сохраняются, недостающие элементы добавляются в порядке снапшота. Для разных значений нужен явный выбор. Измененные комментарии, вложения и варианты полей при выборе снапшота добавляются отдельными копиями',
  restoreKeepAll: 'Оставить все текущие значения',
  restoreUseAll: 'Взять все значения снапшота',
  restoreSelectResolution: 'Выберите решение',
  restoreMatch: 'Подтвердите соответствие объекта',
  restoreCreateSeparate: 'Добавить отдельным объектом',
  restoreSkip: 'Пропустить этот объект снапшота и его содержимое',
  restoreKeepCurrent: 'Оставить текущее',
  restoreUseSnapshot: 'Взять из снапшота',
  restoreUseCopy: 'Добавить копию из снапшота',
  restoreCurrentValue: 'Текущая доска',
  restoreSnapshotValue: 'Снапшот',
  restoreStale:
    'Доска изменилась после проверки. Сравните заново и проверьте обновленный план перед записью',
  restoreIncomplete:
    'Не удалось полностью прочитать текущую доску или ее содержимое изменилось при сравнении. Выполните сравнение заново',
  mergeResourceBoards: 'Доска',
  mergeResourceLists: 'Список',
  mergeResourceCards: 'Карточка',
  mergeResourceLabels: 'Метка',
  mergeResourceFields: 'Пользовательское поле',
  mergeResourceOptions: 'Вариант поля',
  mergeResourceChecklists: 'Чек-лист',
  mergeResourceItems: 'Пункт чек-листа',
  mergeResourceComments: 'Комментарий',
  mergeResourceAttachments: 'Вложение',
  mergeResourceValues: 'Значение поля',
  mergeFieldName: 'Название',
  mergeFieldDescription: 'Описание',
  mergeFieldParent: 'Список',
  mergeFieldLabels: 'Метки',
  mergeFieldStart: 'Начало',
  mergeFieldDue: 'Срок',
  mergeFieldComplete: 'Срок выполнен',
  mergeFieldChecked: 'Выполнено',
  mergeFieldColor: 'Цвет',
  mergeFieldType: 'Тип',
  mergeFieldText: 'Текст',
  mergeFieldValue: 'Значение',
  mergeFieldContent: 'Содержимое',
  restoreEmpty: 'Пусто',
  restoreTitle: 'Восстановите свою доску',
  restoreIntro: 'Загрузите снапшот JSON или ZIP на доску, которая открыта сейчас',
  restoreFile: 'Файл экспорта · JSON или ZIP',
  restoreChoose: 'Выберите файл для просмотра плана восстановления',
  restoreLoading: 'Проверяем файл и место восстановления…',
  restoreReady: 'Проверьте план слияния и разрешите конфликты',
  restoreRunning: 'Восстанавливаем содержимое доски…',
  restoreInvalid:
    'Файл поврежден, не поддерживается, превышает лимиты или не содержит полных данных доски. Выберите экспорт проекта JSON/ZIP, а не диагностический отчет',
  restoreFailed: 'Восстановление остановлено. Проверьте отчет перед повторной попыткой',
  restoreUnavailable:
    'Откройте улучшение на нужной доске Trello и подключитесь для сравнения с ее текущим содержимым',
  restoreCancelled: 'Восстановление отменено',
  restoreJournalUnavailable:
    'Локальный журнал восстановления недоступен или поврежден. Для запуска восстановления нужен доступ к хранилищу',
  restoreWorkspace: 'Рабочее пространство',
  restoreLimitations: 'Особенности восстановления',
  restorePermission:
    'Для импорта нужны права чтения и записи досок этого рабочего пространства. На текущей доске применяются только изменения, которые Вы проверили',
  restoreConnect: 'Подключить восстановление',
  restoreConfirm: 'Я проверил конфликты и согласен применить эти изменения к текущей доске',
  restoreAction: 'Применить к этой доске',
  restoreResume: 'Продолжить последнюю операцию',
  restorePrevious:
    'В этом браузере есть незавершенное слияние. Для продолжения выберите тот же файл и снова проверьте текущую доску',
  restoreReport: 'Скачать отчет восстановления',
  restoreRetained:
    'Уже примененные изменения остаются при остановке. Отчет содержит ссылку на текущую доску и состояние операции без токенов',
  restoreComplete: 'Доска восстановлена',
  restorePartial: 'Доска восстановлена с ограничениями',
  restoreUnknown:
    'Результат записи неизвестен. Не повторяйте ее автоматически, проверьте доску и отчет',
  restoreIdentities:
    'Существующие объекты сохраняют идентификаторы. Добавленные данные получают новые ID, комментарии добавляются как текст с указанием автора. Участники, права и исходные ссылки сохраняются',
  restoreCommentHeader: 'Импортированный комментарий из экспорта',
  [RestoreWarning.SourcePartial]: 'В исходном экспорте есть пропуски или предупреждения',
  [RestoreWarning.Members]:
    'Участники карточек остаются исходными сведениями и не назначаются автоматически',
  [RestoreWarning.Covers]: 'Настройки обложек остаются исходными сведениями',
  [RestoreWarning.AdvancedItems]: 'Исполнители пунктов чек-листов не назначаются автоматически',
  [RestoreWarning.MissingFiles]:
    'Байты некоторых вложений отсутствуют, доступные исходные ссылки восстанавливаются как ссылки',
  [RestoreWarning.CommentSummary]:
    'Исходные комментарии превращаются в текст с указанием автора и даты, опубликованный восстанавливающим пользователем',
  [RestoreWarning.Unsupported]:
    'Часть необязательного содержимого недоступна в целевом рабочем пространстве',
} satisfies { [Key in keyof typeof restoreEn]: string };
