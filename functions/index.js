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

// helper functions for validating singup data
const isEmpty = (string) => {
  if (string.trim() === '') return true;
  else return false;
};

const isEmail = (email) => {
  // eslint-disable-next-line no-useless-escape
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(emailRegEx)) return true;
  else return false;
};

// signup route
app.post('/signup', async (req, res) => {
  try {
    const { email, password, confirmPassword, handle } = req.body;
    const newUser = {
      email,
      password,
      confirmPassword,
      handle,
    };

    // validate newUser object
    let errors = {};
    if (isEmpty(newUser.email)) {
      errors.email = 'Must not be empty';
    } else if (!isEmail(newUser.email)) {
      errors.email = 'Must be a valid email address';
    }
    if (isEmpty(newUser.password)) errors.password = 'Must not be empty';
    if (newUser.password !== newUser.confirmPassword)
      errors.confirmPassword = 'Passwords must match';
    if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty';
    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    const doc = await db.doc(`/users/${newUser.handle}`).get();
    if (doc.exists) {
      return res.status(400).json({ handle: 'this handle is already taken' });
    }
    const data = await firebase
      .auth()
      .createUserWithEmailAndPassword(newUser.email, newUser.password);
    const userId = data.user.uid;
    const token = await data.user.getIdToken();
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

// login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = {
      email,
      password,
    };

    // validate user object
    let errors = {};
    if (isEmpty(user.email)) errors.email = 'Must not be empty';
    if (isEmpty(user.password)) errors.password = 'Must not be empty';
    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    const data = await firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password);
    const token = await data.user.getIdToken();
    return res.json({ token });
  } catch (err) {
    console.error(err);
    if (
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/user-not-found'
    ) {
      return res
        .status(403)
        .json({ general: 'Wrong credentials, please try again' });
    } else {
      return res.status(500).json({ error: err.code });
    }
  }
});

exports.api = functions.region('europe-west1').https.onRequest(app);
