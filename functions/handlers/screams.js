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
      userImage: req.user.imageUrl,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0,
    };
    const doc = await db.collection('screams').add(newScream);
    const resScream = newScream;
    resScream.screamId = doc.id;

    return res.json(resScream);
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

// DELETE SCREAM
exports.deleteScream = async (req, res) => {
  const document = db.doc(`/screams/${req.params.screamId}`);

  try {
    const doc = await document.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Scream not found' });
    }
    if (doc.data().userHandle !== req.user.handle) {
      return res.status(403).json({ error: 'Unauthorized' });
    } else {
      await document.delete();
    }
    return res.json({ message: 'Scream deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};

// ADD COMMENT TO THE SCRAM
exports.commentOnScream = async (req, res) => {
  try {
    // validate body of the comment
    if (req.body.body.trim() === '')
      return res.status(400).json({ comment: 'Must not be empty' });

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
    await doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    await db.collection('comments').add(newComment);

    return res.json(newComment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

//  LIKE SCREAM
exports.likeScream = async (req, res) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);
  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  try {
    let screamData;

    const doc = await screamDocument.get();
    if (doc.exists) {
      screamData = doc.data();
      screamData.screamId = doc.id;
    } else {
      return res.status(404).json({ error: 'Scream not found' });
    }

    const data = await likeDocument.get();
    // If arr is empty, add new doc
    if (data.empty) {
      await db.collection('likes').add({
        screamId: req.params.screamId,
        userHandle: req.user.handle,
      });
      screamData.likeCount++;
      await screamDocument.update({ likeCount: screamData.likeCount });
      return res.json(screamData);
    } else {
      return res.status(400).json({ error: 'Scream already liked' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};

// UNLIKE SCREAM
exports.unlikeScream = async (req, res) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);
  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  try {
    let screamData;

    const doc = await screamDocument.get();
    if (doc.exists) {
      screamData = doc.data();
      screamData.screamId = doc.id;
    } else {
      return res.status(404).json({ error: 'Scream not found' });
    }

    const data = await likeDocument.get();
    // If arr is empty, add new doc
    if (data.empty) {
      return res.status(400).json({ error: 'Scream not liked' });
    } else {
      await db.doc(`/likes/${data.docs[0].id}`).delete();
      screamData.likeCount--;
      await screamDocument.update({ likeCount: screamData.likeCount });
      return res.json(screamData);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.code });
  }
};
