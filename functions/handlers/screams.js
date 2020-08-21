const { db } = require('../util/admin');

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
