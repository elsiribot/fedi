# Bug Report API

## Overview

The bug report flow consists of 2 APIs:

1. `POST /api/bug-report/generate-upload-url`
2. `POST /api/bug-report/submit`

Submitting a bug report does the following:

1. The app generates a tar.gz of log files, device info, and related media (screenshots, video)
2. The app generates a UUID for the bug report and hits `/generate-upload-url` to get a pre-signed S3 upload URL
3. The app uploads the tar.gz file to S3 which can be accessed at `[bucket]/[uuid].tar.gz`
4. The app submits a bug report using the same UUID to `/submit` with relevant metadata
5. The API appends a row to a Google Sheet with the report

## Setup

To use these endpoints, you need to provide the following environment variables:

-   `AWS_ACCESS_KEY_ID`
-   `AWS_SECRET_ACCESS_KEY`
-   `AWS_REGION`
-   `AWS_BUG_REPORT_BUCKET_NAME`
-   `GOOGLE_SHEETS_CLIENT_ID`
-   `GOOGLE_SHEETS_CLIENT_EMAIL`
-   `GOOGLE_SHEETS_PRIVATE_KEY`
-   `GOOGLE_SHEETS_SHEET_ID`

The easiest way to do this is to copy `ui/web/.env.development` to `ui/web/.env.local` and fill in the values.

### AWS Setup

1. [Create a new S3 bucket](https://s3.console.aws.amazon.com/s3/bucket/create?region=us-east-1) with default permissions
    - Note the bucket name and region, fill out `AWS_REGION` and `AWS_BUG_REPORT_BUCKET_NAME` accordingly
2. [Create a new IAM Policy](https://us-east-1.console.aws.amazon.com/iam/home?region=us-east-1#/policies/create) that provides write access to the bucket
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "VisualEditor0",
                "Effect": "Allow",
                "Action": "s3:PutObject",
                "Resource": "arn:aws:s3:::bucket-name-here/*"
            }
        ]
    }
    ```
3. [Create a new IAM user](https://us-east-1.console.aws.amazon.com/iam/home?region=us-east-1#/users/create) with that IAM Policy attached to it
4. Create an access key for the IAM user
    - Select "Application running outside AWS"
    - Copy the access key and secret access key to `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` respectively

### Google Sheets Setup

1. Create a new Google Cloud project or use an existing one
2. Enable the [Google Sheets API](https://console.cloud.google.com/marketplace/product/google/sheets.googleapis.com?q=search&referrer=search&project=fedi-feedback)
3. Create a new [Service Account](https://console.cloud.google.com/iam-admin/serviceaccounts)
4. Create and download a new JSON key for the service account
    - Copy over `private_key`, `client_email`, and `client_id` to `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEETS_CLIENT_ID` and `GOOGLE_SHEETS_CLIENT_EMAIL` respectively
5. Create a new Google Sheet from your account
    - Copy the ID from the URL, `/docs.google.com/spreadsheets/d/[id-here]/edit`, and set `GOOGLE_SHEETS_SHEET_ID` with it
6. On the "Share" menu of the google sheet, give the Service Account's email "Editor" access
