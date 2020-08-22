const { db } = require('../util/admin');

// GET ALL SCREAMS
exports.getAllScreams = async (req, res) => {
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
};

// ADD ONE SCREAM
exports.postOneScream = async (req, res) => {
  try {
    const { body, handle } = req.body;
    if (body.trim() === '') {
      return res.status(400).json({ body: 'Body must not be empty' });
    }
    const newScream = {
      body,
      userHandle: req.user.handle,
      createdAt: new Date().toISOString(),
    };
    const doc = await db.collection('screams').add(newScream);

    return res.json({ message: `document ${doc.id} created successfully` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'something went wrong' });
  }
};

// FETCH ONE SCREAM WITH COMMENTS
exports.getScream = async (req, res) => {
  try {
    let screamData = {};
    const doc = await db.doc(`/screams/${req.params.screamId}`).get();
    if (!doc.exists) {
      return res.status(400).json({ error: 'Scream not found' });
    }
    screamData = doc.data();
    screamData.screamId = doc.id;

    const data = await db
      .collection('comments')
      .orderBy('createdAt', 'desc')
      .where('screamId', '==', req.params.screamId)
      .get();
    screamData.comments = [];
    data.forEach((doc) => {
      screamData.comments.push(doc.data());
    });
    return res.json(screamData);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ eroor: err.code });
  }
};

// ADD COMMENT TO THE SCRAM
exports.commentOnScream = async (req, res) => {
  try {
    // validate body of the comment
    if (req.body.body.trim() === '')
      return res.status(400).json({ message: 'Must not be empty' });

    const newComment = {
      body: req.body.body,
      createdAt: new Date().toISOString(),
      screamId: req.params.screamId,
      userHandle: req.user.handle,
      userImage: req.user.imageUrl,
    };

    const doc = await db.doc(`/screams/${req.params.screamId}`).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Scream not found' });
    }
    await db.collection('comments').add(newComment);

    return res.json(newComment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};
