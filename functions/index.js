const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send('Hello from Firebase!');
});

exports.getScreams = functions.https.onRequest((req, res) => {
  admin
    .firestore()
    .collection('screams')
    .get()
    .then((data) => {
      let screams = [];
      data.forEach((doc) => {
        // data function returns the data that's inside the document
        screams.push(doc.data());
      });
      return res.json(screams);
    })
    .catch((err) => console.error(err));
});

exports.createScream = functions.https.onRequest((req, res) => {
  if (req.method !== 'POST') {
    return res.status(400).json({ error: 'method not allowed' });
  }
  const { body, userHandle } = req.body;
  const newScream = {
    body,
    userHandle,
    createdAt: admin.firestore.Timestamp.fromDate(new Date()),
  };
  admin
    .firestore()
    .collection('screams')
    .add(newScream)
    // eslint-disable-next-line promise/always-return
    .then((doc) => {
      res.json({ message: `document ${doc.id} created successfully` });
    })
    .catch((err) => {
      res.status(500).json({ error: 'something went wrong' });
      console.log(err);
    });
});
