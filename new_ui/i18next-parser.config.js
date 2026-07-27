export default {
  // Какие файлы сканировать
  contextSeparator: '_',
  createOldCatalogs: false, // Не создавать резервные копии .old файлов
  defaultValue: '', // Оставлять строку перевода пустой (как в Django)

  // Если хочешь, чтобы дефолтный текст из t('key', 'Дефолт') падал в перевод, раскомментируй строку ниже:
  // defaultValue: (lng, ns, key, fallbackValue) => fallbackValue || '',

  indentation: 2,
  keepRemoved: true, // Сохранять старые ключи в JSON, если они исчезли из кода (чтобы не потерять ручной перевод)
  keySeparator: '.',

  // Куда складывать результат (структура папок)
  lexers: {
    ts: ['JsxLexer'],
    tsx: ['JsxLexer'],
    js: ['JsxLexer'],
    jsx: ['JsxLexer'],
    default: ['JsxLexer'],
  },

  locales: ['ru', 'en', 'ua'], // Твои языки
  output: 'public/locales/$LOCALE/$NAMESPACE.json', // Путь к JSON-файлам относительно корня
  defaultNamespace: 'common',
  namespaceSeparator: false,
  keepRemoved: false,
  sort: true,
  createOldCatalogs: false,
  input: [
    'src/**/*.{ts,tsx,js,jsx}', // Сканировать только твою папку src
    '!node_modules/**', // ЯВНО ИСКЛЮЧИТЬ node_modules
    '!public/**', // На всякий случай исключаем public, чтобы он не парсил сам себя
    '!.git/**',
  ], // Где искать ключи
  lineEnding: 'lf',
}
