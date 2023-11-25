# `fedi:max_balance_msats`

When set, users will be prevented from generating payment requests that, if paid, would result in their current balance being greater than the specified amount.

## Structure

Base 10 encoded (stringified) integer

```json
"fedi:max_balance_msats": "100000" // 100 sat max
```
