# Going live (Vercel + MongoDB Atlas)

Without `MONGODB_URI` the app runs as the browser-only demo. With it, the app runs in **live mode**:

- real sign-in: staff use mobile number + password, karigars use mobile number + PIN
- every change is saved to MongoDB; photos are stored there too
- the server checks each save: karigars can only update their own work orders, and only the owner (or whoever the Access tab allows) can change settings
- if two people save at the same moment, nothing is lost and order numbers never repeat
- if the internet drops, changes wait ("No connection — N changes waiting") and save when it comes back

## 1. MongoDB Atlas
1. Create a cluster, then **Database Access → Add user** (password authentication).
2. **Network Access → Add IP address → `0.0.0.0/0`**. Vercel has no fixed IP addresses.
3. **Connect → Drivers** gives the connection string.

## 2. Vercel → Project → Settings → Environment Variables (Production)
| Name | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string with the database user's password |
| `MONGODB_DB` | `arts_fashion` |
| `AUTH_SECRET` | random, 32+ characters (`openssl rand -hex 32`) |
| `BMS_SETUP_KEY` | any one-time key you choose |

| `CLOUDINARY_URL` | *optional*, see below |

Then **Deployments → Redeploy**.

### Photos on Cloudinary (optional, recommended)
Without Cloudinary, photos are stored in MongoDB. The free Atlas tier holds 512 MB, roughly 3,000 photos.
With Cloudinary, photos go to Cloudinary's CDN, which has more space and loads faster on phones:
1. Cloudinary Dashboard → **API Keys**. Copy the **API environment variable** (`cloudinary://KEY:SECRET@CLOUD_NAME`).
2. Add it in Vercel as `CLOUDINARY_URL`. Optionally set `CLOUDINARY_FOLDER` (default `arts-fashion`).
3. Redeploy. New photos go to Cloudinary. Photos already saved stay in MongoDB and keep working.

If Cloudinary is ever down or the key is wrong, the photo is saved in MongoDB instead, so nothing is lost.
Cloudinary photo links are long random addresses that nobody can guess. Anyone who is given a link can open it, though, without signing in.

## 3. First run
Open the site. It shows **First-time setup**: enter the setup key, the owner's name, mobile number and password.
Then go to **Settings → Users & logins**:
- **Add staff**, then **Set password** for each person
- add karigars on the **Karigars** page, then **Set PIN** for each karigar

Forgotten password: the owner sets a new one, which also signs that person out on every device.
Five wrong attempts lock that login for 15 minutes.

## 4. Every week
**Settings → Company & backup → Download backup** saves a JSON copy of all data. Keep it somewhere safe.
The free Atlas tier (M0) has no automatic backups.

## Limits to know
- Each browser loads the whole database when it opens. That is fine for thousands of orders. Photos load only when shown.
- Photos are not included in the backup file. They stay in MongoDB or Cloudinary.
- Vercel's free Hobby plan is for non-commercial use. A business should use Vercel Pro.
- Restoring from a backup file is not built into the app yet. It can be done with MongoDB tools if ever needed.
