/* eslint-disable arrow-body-style */
/* eslint-disable no-unused-expressions */
const request = require('supertest');
const httpStatus = require('http-status');
const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcryptjs');
const { some, omitBy, isNil } = require('lodash');
const app = require('../../../index');
const User = require('../../models/user.model');
const JWT_EXPIRATION = require('../../../config/vars').jwtExpirationInterval;

/**
 * root level hooks
 */

async function format(user) {
  const formatted = user;

  // delete password
  delete formatted.password;

  // get users from database
  const dbUser = (await User.findOne({ email: user.email })).transform();

  // remove null and undefined properties
  return omitBy(dbUser, isNil);
}

describe('Users API', async () => {
  let adminAccessToken;
  let userAccessToken;
  let dbUsers;
  let user;
  let admin;

  const password = '123456';
  const passwordHashed = await bcrypt.hash(password, 1);

  beforeEach(async () => {
    dbUsers = {
      tonyStark: {
        email: 'liubl@live.com',
        password: passwordHashed,
        name: 'liubl',
        nickname: '刘大侠',
        role: 'admin',
        nik: 'i0UnWzp3Id',
      },
      steveRodger: {
        email: 'test@qq.com',
        password: passwordHashed,
        name: 'test',
        nickname: 'NB的测试',
        nik: 'k6G1SdhSXg',
      },
    };

    user = {
      email: 'test@qq.com',
      password,
      name: 'test',
      nickname: 'NB的测试',
      nik: 'k6G1SdhSXg',
    };

    admin = {
      email: 'liubl@live.com',
      password: passwordHashed,
      name: 'liubl',
      nickname: '刘大侠',
      role: 'admin',
      nik: 'i0UnWzp3Id',
    };

    await User.deleteMany({});
    await User.insertMany([dbUsers.tonyStark, dbUsers.steveRodger]);
    dbUsers.tonyStark.password = password;
    dbUsers.steveRodger.password = password;
    adminAccessToken = (await User.findAndGenerateToken(dbUsers.tonyStark)).accessToken;
    userAccessToken = (await User.findAndGenerateToken(dbUsers.steveRodger)).accessToken;
  });

  describe('POST /v1/users', () => {
    it('should create a new user when request is ok', () => {
      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(admin)
        .expect(httpStatus.CREATED)
        .then((res) => {
          delete admin.password;
          expect(res.body).to.include(admin);
        });
    });

    it('should create a new user and set default role to "user"', () => {
      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.CREATED)
        .then((res) => {
          expect(res.body.role).to.be.equal('user');
        });
    });

    it('should report error when email already exists', () => {
      user.email = dbUsers.tonyStark.email;

      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.CONFLICT)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" already exists');
        });
    });

    it('should report error when email is not provided', () => {
      delete user.email;

      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
        });
    });

    it('should report error when password length is less than 6', () => {
      user.password = '12345';

      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('password');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"password" length must be at least 6 characters long');
        });
    });

    it('should report when logged user is not an admin', () => {
      return request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(user)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('GET /v1/users', () => {
    it('should get all users', () => {
      return request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK)
        .then(async (res) => {
          const tony = format(dbUsers.tonyStark);
          const steve = format(dbUsers.steveRodger);

          const includesTonyStark = some(res.body, tony);
          const includesSteveRodger = some(res.body, steve);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);
          res.body[1].createdAt = new Date(res.body[1].createdAt);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(2);
          expect(includesTonyStark).to.be.true;
          expect(includesSteveRodger).to.be.true;
        });
    });

    it('should get all users with pagination', () => {
      return request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ page: 2, perPage: 1 })
        .expect(httpStatus.OK)
        .then((res) => {
          delete dbUsers.steveRodger.password;
          const steve = format(dbUsers.steveRodger);
          const includesSteveRodger = some(res.body, steve);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(1);
          expect(includesSteveRodger).to.be.true;
        });
    });

    it('should filter users', () => {
      return request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ email: dbUsers.steveRodger.email })
        .expect(httpStatus.OK)
        .then((res) => {
          delete dbUsers.steveRodger.password;
          const steve = format(dbUsers.steveRodger);
          const includesSteveRodger = some(res.body, steve);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(1);
          expect(includesSteveRodger).to.be.true;
        });
    });

    it('should report if logged user is not an admin', () => {
      return request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('GET /v1/users/:userId', () => {
    it('should get user', async () => {
      const id = (await User.findOne({}))._id;
      delete dbUsers.tonyStark.password;

      return request(app)
        .get(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.include(dbUsers.tonyStark);
        });
    });

    it('should report "User does not exist" when user does not exists', () => {
      return request(app)
        .get('/v1/users/56c787ccc67fc16ccc1a5e92')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
        });
    });

    it('should report "User does not exist" when id is not a valid ObjectId', () => {
      return request(app)
        .get('/v1/users/jancukers123')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
        });
    });

    it('should report error when logged user is not the same as the request one', async () => {
      const id = (await User.findOne({ email: dbUsers.tonyStark.email }))._id;

      return request(app)
        .get(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('PUT /v1/users/:userId', () => {
    it('should replace user', async () => {
      delete dbUsers.tonyStark.password;
      const id = (await User.findOne(dbUsers.tonyStark))._id;

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.OK)
        .then((res) => {
          delete user.password;
          expect(res.body).to.include(user);
          expect(res.body.role).to.be.equal('user');
        });
    });

    it('should report error when email is not provided', async () => {
      const id = (await User.findOne({}))._id;
      delete user.email;

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
        });
    });

    it('should report error user when password length is less than 6', async () => {
      const id = (await User.findOne({}))._id;
      user.password = '12345';

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('password');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"password" length must be at least 6 characters long');
        });
    });

    it('should report error "User does not exist" when user does not exists', () => {
      return request(app)
        .put('/v1/users/zuhriyansauqi')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await User.findOne({ email: dbUsers.tonyStark.email }))._id;

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });

    it('should not replace the role of the user (not admin)', async () => {
      const id = (await User.findOne({ email: dbUsers.steveRodger.email }))._id;
      const role = 'admin';

      return request(app)
        .put(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(admin)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.role).to.not.be.equal(role);
        });
    });
  });

  describe('PATCH /v1/users/:userId', () => {
    it('should update user', async () => {
      delete dbUsers.tonyStark.password;
      const id = (await User.findOne(dbUsers.tonyStark))._id;
      const { name } = user;

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name })
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.name).to.be.equal(name);
          expect(res.body.email).to.be.equal(dbUsers.tonyStark.email);
        });
    });

    it('should not update user when no parameters were given', async () => {
      delete dbUsers.tonyStark.password;
      const id = (await User.findOne(dbUsers.tonyStark))._id;

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.include(dbUsers.tonyStark);
        });
    });

    it('should report error "User does not exist" when user does not exists', () => {
      return request(app)
        .patch('/v1/users/zuhriyansauqi')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await User.findOne({ email: dbUsers.tonyStark.email }))._id;

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });

    it('should not update the role of the user (not admin)', async () => {
      const id = (await User.findOne({ email: dbUsers.steveRodger.email }))._id;
      const role = 'admin';

      return request(app)
        .patch(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ role })
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.role).to.not.be.equal(role);
        });
    });
  });

  describe('DELETE /v1/users', () => {
    it('should delete user', async () => {
      const id = (await User.findOne({}))._id;

      return request(app)
        .delete(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NO_CONTENT)
        .then(() => request(app).get('/v1/users'))
        .then(async () => {
          const users = await User.find({});
          expect(users).to.have.lengthOf(1);
        });
    });

    it('should report error "User does not exist" when user does not exists', () => {
      return request(app)
        .delete('/v1/users/zuhriyansauqi')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('User does not exist');
        });
    });

    it('should report error when logged user is not the same as the requested one', async () => {
      const id = (await User.findOne({ email: dbUsers.tonyStark.email }))._id;

      return request(app)
        .delete(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal('Forbidden');
        });
    });
  });

  describe('GET /v1/users/profile', () => {
    it('should get the logged user\'s info', () => {
      delete dbUsers.steveRodger.password;

      return request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.include(dbUsers.steveRodger);
        });
    });

    it('should report error without stacktrace when accessToken is expired', async () => {
      // fake time
      const clock = sinon.useFakeTimers();
      const expiredAccessToken = (await User.findAndGenerateToken(dbUsers.tonyStark)).accessToken;

      // move clock forward by minutes set in config + 1 minute
      clock.tick((JWT_EXPIRATION * 60000) + 60000);

      return request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${expiredAccessToken}`)
        .expect(httpStatus.UNAUTHORIZED)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.UNAUTHORIZED);
          expect(res.body.message).to.be.equal('jwt expired');
          expect(res.body).to.not.have.a.property('stack');
        });
    });
  });
});