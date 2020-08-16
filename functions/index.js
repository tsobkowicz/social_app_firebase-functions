const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');

admin.initializeApp();
const app = express();

app.get('/screams', async (req, res) => {
  try {
    const data = await admin
      .firestore()
      .collection('screams')
      .orderBy('createdAt', 'desc')
      .get();

    let screams = [];
    data.forEach((doc) => {
      screams.push({
        screamId: doc.id,
        ...doc.data(),
      });
      return res.json(screams);
    });
  } catch (err) {
    console.error(err);
  }
});

app.post('/scream', async (req, res) => {
  const { body, userHandle } = req.body;
  const newScream = {
    body,
    userHandle,
    createdAt: new Date().toISOString(),
  };
  try {
    const doc = await admin.firestore().collection('screams').add(newScream);

    res.json({ message: `document ${doc.id} created successfully` });
  } catch (err) {
    res.status(500).json({ error: 'something went wrong' });
    console.log(err);
  }
});

// app.get('/screams', (req, res) => {
//   admin
//     .firestore()
//     .collection('screams')
//     .orderBy('createdAt', 'desc')
//     .get()
//     .then((data) => {
//       let screams = [];
//       data.forEach((doc) => {
//         screams.push({
//           screamId: doc.id,
//           ...doc.data(),
//           // body: doc.data().body,
//           // userHandle: doc.data().userHandle,
//           // createdAt: doc.data().createdAt,
//         });
//       });
//       return res.json(screams);
//     })
//     .catch((err) => console.error(err));
// });

// app.post('/scream', (req, res) => {
//   const { body, userHandle } = req.body;
//   const newScream = {
//     body,
//     userHandle,
//     createdAt: new Date().toISOString(),
//   };
//   admin
//     .firestore()
//     .collection('screams')
//     .add(newScream)
//     // eslint-disable-next-line promise/always-return
//     .then((doc) => {
//       res.json({ message: `document ${doc.id} created successfully` });
//     })
//     .catch((err) => {
//       res.status(500).json({ error: 'something went wrong' });
//       console.log(err);
//     });
// });

exports.api = functions.region('europe-west1').https.onRequest(app);
