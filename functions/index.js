require('dotenv').config();
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const firebase = require('firebase');

const app = express();
admin.initializeApp();

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

// routes

app.get('/screams', async (req, res) => {
  try {
    const data = await db
      .collection('screams')
      .orderBy('createdAt', 'desc')
      .get();

    let screams = [];
    data.forEach((doc) => {
      screams.push({
        screamId: doc.id,
        ...doc.data(),
      });
    });
    return res.json(screams);
  } catch (err) {
    return console.error(err);
  }
});

app.post('/scream', async (req, res) => {
  try {
    const { body, userHandle } = req.body;
    if (body.trim() === '') {
      res.status(400).json({ body: 'Body must not be empty' });
    }
    const newScream = {
      body,
      userHandle,
      createdAt: new Date().toISOString(),
    };
    const doc = await db.collection('screams').add(newScream);

    return res.json({ message: `document ${doc.id} created successfully` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'something went wrong' });
  }
});

// signup route
app.post('/signup', async (req, res) => {
  try {
    const { email, password, conifirmPassword, handle } = req.body;
    const newUser = {
      email,
      password,
      conifirmPassword,
      handle,
    };

    let token, userId;
    const doc = await db.doc(`/users/${newUser.handle}`).get();

    if (doc.exists) {
      return res.status(400).json({ handle: 'this handle is already taken' });
    }
    const data = await firebase
      .auth()
      .createUserWithEmailAndPassword(newUser.email, newUser.password);
    userId = data.user.uid;
    const idToken = await data.user.getIdToken();
    token = idToken;
    const userCredentials = {
      handle: newUser.handle,
      email: newUser.email,
      createdAt: new Date().toISOString(),
      userId,
    };
    await db.doc(`/users/${newUser.handle}`).set(userCredentials);
    return res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') {
      return res.status(400).json({ email: 'email is already in use' });
    } else {
      return res.status(500).json({ error: err.code });
    }
  }
});

// app.post('/signup', (req, res) => {
//   const { email, password, conifirmPassword, handle } = req.body;
//   const newUser = {
//     email,
//     password,
//     conifirmPassword,
//     handle,
//   };

//   let token, userId;
//   db.doc(`/users/${newUser.handle}`)
//     .get()
//     .then((doc) => {
//       if (doc.exists) {
//         return res.status(400).json({ handle: 'this handle is already taken' });
//       } else {
//         return firebase
//           .auth()
//           .createUserWithEmailAndPassword(newUser.email, newUser.password);
//       }
//     })
//     .then((data) => {
//       userId = data.user.uid;
//       return data.user.getIdToken();
//     })
//     .then((t) => {
//       token = t;
//       const userCredentials = {
//         handle: newUser.handle,
//         email: newUser.email,
//         createdAt: new Date().toISOString(),
//         userId,
//       };
//       return db.doc(`/users/${newUser.handle}`).set(userCredentials);
//     })
//     .then(() => {
//       return res.status(201).json({ token });
//     })
//     .catch((err) => {
//       console.error(err);
//       if (err.code === 'auth/email-already-in-use') {
//         return res.status(400).json({ email: 'email is already in use' });
//       } else {
//         return res.status(500).json({ error: err.code });
//       }
//     });
// });

exports.api = functions.region('europe-west1').https.onRequest(app);
