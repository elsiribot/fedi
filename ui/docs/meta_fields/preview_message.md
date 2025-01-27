# `preview_message`

A preview message displayed to new users before they join the federation.

Use this field to provide a customized preview message that will be shown to new users before they join the federation.

## Structure

Plain text

```
"preview_message": "Welcome to the Fedi federation!"
```

**Note: ** preview_message is not an official supported metadata field, but it's required for public federations.

See the comments in `common/utils/FederationUtils.ts`:

```
// federation meta must have all of these fields to be displayed as public
// Note these are not techincally supported meta fields... just the quickest
// hack to be able to display public federations using the meta.json
```
