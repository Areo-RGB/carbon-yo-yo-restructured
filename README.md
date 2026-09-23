# Carbon Yo-Yo — Android WebView + Svelte

This project is structured as one Android app with a separate Svelte/Vite web source project. The Android app packages the compiled web app in its APK and loads it through `WebViewAssetLoader`.

## Project layout

```text
carbon-yo-yo/
├── app/                              # Android application module
│   └── src/main/
│       ├── java/com/example/         # Native Android wrapper
│       ├── res/
│       ├── AndroidManifest.xml
│       └── assets/webapp/            # GENERATED web build packaged in APK
├── webapp/                           # Svelte/Vite source project
│   ├── src/
│   ├── public/
│   ├── tests/
│   ├── package.json
│   └── vite.config.ts
├── gradle/
├── build.gradle.kts
└── settings.gradle.kts
```

## Build the embedded web app

The source lives in `webapp/`; Android should contain only the generated production build.

```bash
cd webapp
npm install
npm run android:build
```

`npm run android:build` does two things:

1. Builds Svelte/Vite into `webapp/dist/`.
2. Replaces `app/src/main/assets/webapp/` with that production build.

Then open the project root in Android Studio and run the `app` configuration.

## Android WebView

`MainActivity.kt` loads:

```text
https://appassets.androidplatform.net/assets/webapp/index.html
```

The URL is served from APK assets using AndroidX `WebViewAssetLoader`. File/content access remains disabled. Protocol audio is bundled in the APK, so the app does not need network access for playback.

## Web development

```bash
cd webapp
npm install
npm run dev
```

For checks:

```bash
npm test
npm run check
npm run build
```

## Notes

- Vite is configured with `base: './'`, so generated JS/CSS paths work when the app is hosted under the Android asset path.
- Public audio/avatar URLs are relative, so the same web build works both in a normal web deployment and inside the Android WebView.
- `app/src/main/assets/webapp/index.html` initially contains a small placeholder. Running `npm run android:build` replaces it with the real compiled app.
# carbon-yo-yo-restructured
