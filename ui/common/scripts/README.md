# Autotranslate

Automatically sorts and translates keys in languages based on the `en/common.json` file.

1. Get a Google Cloud account
2. Create a project
3. Enable the [Cloud Translation API](https://console.cloud.google.com/apis/api/translate.googleapis.com)
4. Go to the [credentials screen](https://console.cloud.google.com/apis/credentials) and create a new API Key credential
5. Run `GOOGLE_TRANSLATE_API_KEY=[key] yarn autotranslate`
    - You can add a single language as a parameter if you only want to run against one, e.g. `yarn autotranslate es`
