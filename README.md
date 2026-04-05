# Kuats Community

Static website for Kuats Community with:

- animated landing page
- register and login modals
- seeded leader account
- leader-only publishing tools for forum posts and downloadable files
- browser-local persistence for users, posts, resources, and session

## Leader account

- Email: `parpikuat@gmail.com`
- Password: `Tb1BzHZCCK`

## Where accounts are stored

This version stores data in the browser's `localStorage`, not on a server.

- Accounts, posts, and resources: `kuats-community-db`
- Current logged-in session: `kuats-community-session`

You can inspect them in the browser developer tools:

1. Open the website.
2. Press `F12`.
3. Open `Application` or `Storage`.
4. Open `Local Storage`.
5. Select your site.

## Important limitation

Because this is a static GitHub Pages compatible site, the auth system is only a demo and is not secure for real production users.

Passwords are not saved in plain text, but this project uses browser-side `PBKDF2-SHA-256` hashing through Web Crypto rather than server-side bcrypt. For real user accounts, use a backend or auth provider.

## What was hardened

- The leader password is no longer stored in plain text in the frontend code.
- The UI no longer shows any password hash fragments.
- Passwords are still stored hashed, not in plain text.

## What cannot be fixed on GitHub Pages

- Visitors can still inspect and alter frontend JavaScript in their own browser.
- Role checks are still client-side, so a determined attacker can bypass them locally.
- Browser-local data is still accessible to someone using the same device/browser profile.
- Static hosting cannot safely protect real secrets, real admin access, or real shared user accounts.

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `styles.css`, `script.js`, and `README.md`.
3. Push to the `main` branch.
4. In GitHub, open `Settings`.
5. Open `Pages`.
6. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
7. Select branch `main` and folder `/root`.
8. Save.
9. Wait for GitHub Pages to publish your site.

Your site URL will look like:

`https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/`

## Real production upgrade path

If you want next, the proper upgrade is:

1. Move accounts and uploads to a backend.
2. Use real bcrypt on the server.
3. Store files in cloud storage.
4. Add admin-only authorization checks on the server.
