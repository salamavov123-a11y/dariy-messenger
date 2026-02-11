# Dariy Messenger (.exe)

Это desktop-версия приложения на Electron.

## Запуск локально

```bash
npm install
npm start
```

## Сборка Windows `.exe` локально

```bash
npm install
npm run build:win
```

После локальной сборки появится:

- `dist/DariyMessenger-win32-x64/DariyMessenger.exe`

## Скачать готовый `.exe` из GitHub Actions

Добавлен workflow: `.github/workflows/build-win-exe.yml`.

### Вариант 1: собрать вручную

1. Открой вкладку **Actions** в GitHub.
2. Выбери workflow **Build Windows EXE**.
3. Нажми **Run workflow**.
4. После завершения открой job и скачай artifact `DariyMessenger-win32-x64`.
5. Распакуй zip — внутри будет `DariyMessenger.exe`.

### Вариант 2: релиз по тегу

1. Создай и отправь тег вида `v1.0.0`:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. Workflow автоматически соберет `.exe` и приложит zip к GitHub Release.
