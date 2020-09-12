require('dotenv').config();
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const { db } = require('./util/admin');
const FBAuth = require('./util/fbAuth');
const {
  getAllScreams,
  postOneScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream,
} = require('./handlers/screams');
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require('./handlers/users');

// ROUTES

// SCREAMS ROUTES
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId', FBAuth, deleteScream);
app.post('/scream/:screamId/comment', FBAuth, commentOnScream);
app.get('/scream/:screamId/like', FBAuth, likeScream);
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);

// USERS ROUTES
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

// AUTH ROUTES
app.post('/signup', signup);
app.post('/login', login);

exports.api = functions.region('europe-west1').https.onRequest(app);

// NOTIFICATION TRIGERS
exports.createNotificationOnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onCreate(async (snapshot) => {
    try {
      const doc = await db.doc(`/screams/${snapshot.data().screamId}`).get();
      if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
        await db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().userHandle, // doc is scream document
          sender: snapshot.data().userHandle, // snapshot is like document
          type: 'like',
          read: false,
          screamId: doc.id,
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

exports.deleteNotificationOnUnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onDelete(async (snapshot) => {
    try {
      await db.doc(`/notifications/${snapshot.id}`).delete();
    } catch (err) {
      console.error(err);
    }
  });

exports.createNotificationOnComment = functions
  .region('europe-west1')
  .firestore.document('comments/{id}')
  .onCreate(async (snapshot) => {
    try {
      const doc = await db.doc(`/screams/${snapshot.data().screamId}`).get();
      if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
        await db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().userHandle, // doc is scream document
          sender: snapshot.data().userHandle, // snapshot is like document
          type: 'commet',
          read: false,
          screamId: doc.id,
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

exports.onUserImageChange = functions
  .region('europe-west1')
  .firestore.document('users/{userId}')
  // eslint-disable-next-line consistent-return
  .onUpdate(async (change) => {
    try {
      if (change.before.data().imageUrl !== change.after.data().imageUrl) {
        const batch = db.batch();
        const data = await db
          .collection('screams')
          .where('userHandle', '==', change.before.data().handle)
          .get();
        data.forEach((doc) => {
          const scream = db.doc(`/screams/${doc.id}`);
          batch.update(scream, { userImage: change.after.data().imageUrl });
        });
        await batch.commit();
      } else return true;
    } catch (err) {
      console.error(err);
    }
  });

exports.onScreamDelete = functions
  .region('europe-west1')
  .firestore.document('screams/{screamId}')
  .onDelete(async (snapshot, context) => {
    try {
      const screamId = context.params.screamId;
      const batch = db.batch();

      const commentsData = await db
        .collection('comments')
        .where('screamId', '==', screamId)
        .get();
      commentsData.forEach((doc) => {
        batch.delete(db.doc(`/comments/${doc.id}`));
      });

      const likesData = await db
        .collection('likes')
        .where('screamId', '==', screamId)
        .get();
      likesData.forEach((doc) => {
        batch.delete(db.doc(`/likes/${doc.id}`));
      });

      const notificationsData = await db
        .collection('likes')
        .where('screamId', '==', screamId)
        .get();
      notificationsData.forEach((doc) => {
        batch.delete(db.doc(`/notifications/${doc.id}`));
      });

      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  });
