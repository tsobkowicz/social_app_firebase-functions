const firebase = require('firebase');
const BusBoy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { admin, db } = require('../util/admin');
const config = require('../util/config');
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require('../util/validators');

firebase.initializeApp(config);

// SIGN UP
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

    const noImg = 'no-img.png';

    const doc = await db.doc(`/users/${newUser.handle}`).get();
    if (doc.exists) {
      return res.status(400).json({ handle: 'This handle is already taken' });
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
      imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
      userId,
    };
    await db.doc(`/users/${newUser.handle}`).set(userCredentials);
    return res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') {
      return res.status(400).json({ email: 'Email is already in use' });
    } else {
      return res
        .status(500)
        .json({ general: 'Something went wrong, please try again' });
    }
  }
};

// LOGIN
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

    // 'auth/wrong-password'
    // 'auth/user-not-found'
    return res
      .status(403)
      .json({ general: 'Wrong credentials, please try again' });
  }
};

// ADD USER DETAILS
exports.addUserDetails = async (req, res) => {
  const userDetails = reduceUserDetails(req.body);

  try {
    // access to req.user is available from FBAuth middleware
    await db.doc(`/users/${req.user.handle}`).update(userDetails);
    return res.json({ message: 'Details added successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};

// GET ANY USER'S DETAILS
exports.getUserDetails = async (req, res) => {
  let userData = {};
  try {
    const doc = await db.doc(`/users/${req.params.handle}`).get();
    if (doc.exists) {
      userData.user = doc.data();
    } else {
      return res.status(404).json({ error: 'User not found' });
    }

    const data = await db
      .collection('screams')
      .where('userHandle', '==', req.params.handle)
      .orderBy('createdAt', 'desc')
      .get();
    userData.screams = [];
    data.forEach((doc) => {
      userData.screams.push({
        ...doc.data(),
        screamId: doc.id,
      });
    });
    return res.json(userData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};

// GET OWN USER DETAILS
exports.getAuthenticatedUser = async (req, res) => {
  let userData = {};

  try {
    const doc = await db.doc(`users/${req.user.handle}`).get();
    if (doc.exists) userData.credentials = doc.data();

    const data = await db
      .collection('likes')
      .where('userHandle', '==', req.user.handle)
      .get();
    userData.likes = [];
    data.forEach((doc) => {
      userData.likes.push(doc.data());
    });

    const notificationsData = await db
      .collection('notifications')
      .where('recipient', '==', req.user.handle)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    userData.notification = [];
    notificationsData.forEach((doc) => {
      userData.notification.push({
        ...doc.data(),
        notificationId: doc.id,
      });
    });

    return res.json(userData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};

// UPLOAD A PROFILE IMAGE FOR USER
exports.uploadImage = (req, res) => {
  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  // eslint-disable-next-line consistent-return
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res.status(400).json({ error: 'Wrong file type submitted' });
    }
    const imageExtansion = filename.split('.')[filename.split('.').length - 1];
    // e.g.46723849343920.png
    imageFileName = `${Math.round(
      Math.random() * 10000000
    ).toString()}.${imageExtansion}`;
    // os.tmpdir = oparating system's default directory for temporary files as a string
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    // pipe is a file strams func that create the file
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on('finish', async () => {
    try {
      await admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
            },
          },
        });

      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
      await db.doc(`/users/${req.user.handle}`).update({ imageUrl });

      return res.json({ message: 'Image uploaded successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.code });
    }
  });

  busboy.end(req.rawBody);
};

// Mark notification that user has seen as read
exports.markNotificationsRead = async (req, res) => {
  try {
    let batch = db.batch();
    req.body.forEach((notificationId) => {
      const notification = db.doc(`/notifications/${notificationId}`);
      batch.update(notification, { read: true });
    });
    await batch.commit();
    return res.json({ message: 'Notifications marked read' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};
