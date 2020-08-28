# social_app_firebase-functions
Backend (GCP functions) for the social app project, which is created according to the [freeCodeCamp](https://www.youtube.com/watch?v=m_u6P5k0vP0) tutorial.
This project is refactored to async/await.

## Features:
* Firebase firestore as database
* Firebase storage 
* Firebase functions
* Express.js
* [Busboy](https://github.com/mscdex/busboy#readme) for handling images updates

## Quick start
1. Clone this repo
2. Create `.firebaserc`file in your root directory and add
3. `cd functions` and install dependencies from package.json
4. Create `.env` in functions directory and add setup variables for your project

`.firebaserc` file
```
{
  "projects": {
    "default": "your project name"
  }
}
```

`.env` variables
```
API_KEY=xxxxx
AUTH_DOMAIN=xxxxx
DATABASE_URL=xxxxx
PROJECT_ID=xxxxx
STORAGE_BUCKET=xxxxx
MESSAGING_SENDER_ID=xxxxx
APP_ID=xxxxx
```
