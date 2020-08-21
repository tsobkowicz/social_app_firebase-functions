const firebase = require('firebase');

const { db } = require('../util/admin');
const config = require('../util/config');
const { validateSignupData, validateLoginData } = require('../util/validators');

firebase.initializeApp(config);

exports.signup = async (req, res) => {
  try {
    const { email, password, confirmPassword, handle } = req.body;
    const newUser = {
      email,
      password,
      confirmPassword,
      handle,
    };

    // validate newUser object
    const { valid, errors } = validateSignupData(newUser);
    if (!valid) return res.status(400).json(errors);

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
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = {
      email,
      password,
    };

    // validate user object
    const { valid, errors } = validateLoginData(user);
    if (!valid) return res.status(400).json(errors);

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
};
