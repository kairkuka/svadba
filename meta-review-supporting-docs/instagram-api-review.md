# SVADBA.kz Instagram API Review Notes

## Permission Requested

`instagram_business_basic`

SVADBA.kz uses this permission only so a vendor can connect their own Instagram professional account, read basic profile metadata, list their own media, choose specific media items, and import selected photos/videos into their public SVADBA.kz vendor profile.

We do not request Instagram passwords. We do not import media automatically without vendor selection. We do not sell Instagram data.

## Reviewer Test Account

SVADBA.kz app account:

```text
Email: test-auth-1785128770383@svadba.kz
Password: 123456
Role: Vendor
```

The reviewer should connect their own Instagram professional test account during OAuth. Do not use an Instagram password supplied by SVADBA.kz.

## How To Test

1. Open the web app:
   `https://d2ne1y5a2elsg5.cloudfront.net/`
2. Log in with the SVADBA.kz test app account.
3. Switch to Vendor mode if needed.
4. Open the top-right menu.
5. Open `Instagram`.
6. Tap `Подключить Instagram`.
7. Complete Instagram OAuth with a professional account.
8. The callback page will show `Instagram подключен`.
9. Tap `Выбрать контент`.
10. In SVADBA.kz, tap `Обновить медиа`.
11. Confirm that Instagram profile metadata and media items appear.
12. Select media cards.
13. Tap `Перенести в медиа профиля`.
14. Open the vendor profile/media section and confirm imported items are visible.

## Meta / Instagram URLs

```text
OAuth Redirect URI:
https://d2ne1y5a2elsg5.cloudfront.net/api/instagram/callback

Deauthorize Callback URL:
https://d2ne1y5a2elsg5.cloudfront.net/api/instagram/deauthorize

Data Deletion Callback URL:
https://d2ne1y5a2elsg5.cloudfront.net/api/meta/data-deletion

Webhook Callback URL:
https://d2ne1y5a2elsg5.cloudfront.net/api/instagram/webhook
```

Webhook verify token is configured on the production server and should match the value entered in the Meta developer dashboard.

## Diagnostics

Use this endpoint to confirm public configuration without exposing secrets:

```text
https://d2ne1y5a2elsg5.cloudfront.net/api/instagram/diagnostics
```

It returns whether the Instagram client ID, secret, redirect URL, graph version, and callback URLs are configured.

## Data Handling

Imported Instagram media is stored in the vendor profile only after the vendor selects media and confirms import. The vendor can disconnect Instagram in the Instagram settings screen. Deauthorization and data deletion callbacks remove the Instagram connection data from SVADBA.kz.
