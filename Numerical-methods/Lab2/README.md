# Numerical Methods Lab 2

```bash
npm start
```

Запуск GUI:

```bash
npm run gui
```

После запуска `http://127.0.0.1:4173`
Интерфейс использует React через ESM CDN `esm.sh`, поэтому для первого открытия нужен доступ в интернет.
В GUI можно загрузить параметры из файла: поддерживаются JSON из `examples/` и текстовый формат `key=value`.

Пример текстового файла для уравнения:

```txt
taskType=equation
equationId=sin_x
method=newton
a=-0.01
b=0.01
epsilon=0.001
xMin=-6.28
xMax=6.28
```

Готовые примеры:

```bash
npm run demo:equation
npm run demo:system
npm run report
```

После `npm run report` будет создан файл `variant19-report.md` с готовыми вычислениями для варианта 19
