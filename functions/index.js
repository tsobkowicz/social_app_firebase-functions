require('dotenv').config();
const functions = require('firebase-functions');
const express = require('express');

const app = express();

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
      if (doc.exists) {
        await db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().userHandle, // doc is scream document
          sender: snapshot.data().userHandle, // snapshot is like document
          type: 'like',
          read: false,
          screamId: doc.id,
        });
      }
      return;
    } catch (err) {
      console.log(err);
      return;
    }
  });

exports.deleteNotificationOnUnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onDelete(async (snapshot) => {
    try {
      await db.doc(`/notifications/${snapshot.id}`).delete();
      return;
    } catch (err) {
      console.log(err);
      return;
    }
  });

exports.createNotificationOnComment = functions
  .region('europe-west1')
  .firestore.document('comments/{id}')
  .onCreate(async (snapshot) => {
    try {
      const doc = await db.doc(`/screams/${snapshot.data().screamId}`).get();
      if (doc.exists) {
        await db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().userHandle, // doc is scream document
          sender: snapshot.data().userHandle, // snapshot is like document
          type: 'commet',
          read: false,
          screamId: doc.id,
        });
      }
      return;
    } catch (err) {
      console.log(err);
      return;
    }
  });
