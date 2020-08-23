let db = {
  users: [
    {
      userId: 'fruhfieu4r9834rrno4r',
      email: 'user@test.com',
      handle: 'user',
      createdAt: '2020-08-15T13:47:53.266Z',
      imageUrl: 'image/fskufhkdufhkhdf/fusdhfidu',
      bio: 'Hello, my name is user, nice to meet you',
      website: 'https://user.com',
      location: 'Warsaw, PL',
    }
  ],
  screams: [
    {
      userHandle: 'user',
      body: 'this is a scream body',
      createdAt: '2020-08-15T13:47:53.266Z',
      likeCount: 5,
      commentCount: 2
    }
  ],
  comments: [
    {
      userHandle: 'user',
      screamId: 'hfiurufhiaefuef',
      body: 'nice one mate!',
      createdAt: '2020-08-15T13:47:53.266Z',
      userImage: 'image/fskufhkdufhkhdf/fusdhfidu',
    }
  ],
  notifications: [
    {
      recipient: 'user',
      sender: 'tom',
      read: 'true | false',
      screamId: 'hfiewgfiwegflielgf',
      type: 'like |  comment',
      createdAt: '2020-08-15T13:47:53.266Z',
    }
  ],
}