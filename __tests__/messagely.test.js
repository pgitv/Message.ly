process.env.NODE_ENV = 'test';

// npm packages
const request = require('supertest');

// app imports
const app = require('../app');
const db = require('../db');
const bcrypt = require('bcrypt');
// const jwt = require("jsonwebtoken");

let auth = {};
let _token = '';
let db_join_at, db_login_at;
let to_string_db_join_at;
let test_id;

// Setup
beforeEach(async function() {
  const hashedPassword = await bcrypt.hash('secret', 1);
  const input_data = await db.query(
    `INSERT INTO users (username,  password, first_name, last_name, phone, join_at)
          VALUES ('test', $1, 'FirstName', 'LastName', 1234567890, current_timestamp) RETURNING *`,
    [hashedPassword]
  );

  const response = await request(app)
    .post('/auth/login')
    .send({
      username: 'test',
      password: 'secret'
    });
  // we'll need the token for future requests
  auth.token = response.body.token;

  // need the current timestamp set to the join at time
  to_string_db_join_at = input_data.rows[0].join_at;
  db_join_at = toString(to_string_db_join_at);
  // db_login_at = input_data.rows[0].last_login_at;
  // console.log(
  //   `Inside setup function DATA FROM SQL ----- `,
  //   input_data.rows[0].join_at
  // );
  // console.log(
  //   `Inside setup function testing login at----- `,
  //   response.body.last_login_at
  // );

  // we'll need the user_id for future requests
  auth.curr_user_id = 'test';
});
// end

/** GET /users/ - returns `{ message: "You made it!" }`
 * Requirements: ensureLoginRequired
 */

describe('GET /users success', async function() {
  test('returns all user details', async function() {
    const response = await request(app)
      .get(`/users`)
      .send({ _token: auth.token });
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      users: [
        {
          username: 'test',
          first_name: 'FirstName',
          last_name: 'LastName',
          phone: '1234567890'
        }
      ]
    });
  });
});
// end PASSED

describe('GET /users failure', async function() {
  test('returns 401 when logged out', async function() {
    //Clear the auth
    // auth.token = '';
    const response = await request(app).get(`/users`); // no token being sent!

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: 'Unauthorized',
      status: 401
    });
  });

  test('returns 401 with invalid token', async function() {
    const response = await request(app)
      .get(`/users`)
      .send({ _token: 'garbage' }); // invalid token!

    expect(response.statusCode).toBe(401);

    expect(response.body).toEqual({
      message: 'Unauthorized',
      status: 401
    });
  });
});
// end PASSED

/** GET /users/:username - returns `{ message: "You made it!" }`
 * Requirements: ensureCorrectUser
 */

describe('GET /users/:username, valid token', async function() {
  test("returns specific user's details when logged in as the correct user", async function() {
    const response = await request(app)
      .get(`/users/test`)
      .send({ _token: auth.token });
    expect(response.statusCode).toBe(200);
    // console.log('RESPONSE IN /users/username ------- ', response.body);
    db_login_at = response.body.user.last_login_at;
    db_join_at = response.body.user.join_at;
    expect(response.body.user).toEqual({
      username: 'test',
      first_name: 'FirstName',
      last_name: 'LastName',
      phone: '1234567890',
      join_at: db_join_at,
      last_login_at: db_login_at
    });
  });

  test('returns 401 with mismatch in URL', async function() {
    const response = await request(app)
      .get(`/users/test2`)
      .send({ _token: auth.token }); // mismatch!
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: 'Unauthorized',
      status: 401
    });
  });
});
// end

describe('GET /users/:uname, invalid token', async function() {
  test('returns 401 when logged out', async function() {
    const response = await request(app).get(`/users/test`); // no token!
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: 'Unauthorized',
      status: 401
    });
  });

  test('returns 401 with invalid token', async function() {
    const response = await request(app)
      .get(`/users/test`)
      .send({ _token: 'garbage' }); // invalid token!
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: 'Unauthorized',
      status: 401
    });
  });
});
// end

describe(`POST route for /messages`, async function() {
  test(`It should post a message by logged in user`, async function() {
    // Add second test user
    const hashedPassword2 = await bcrypt.hash('secret', 1);
    const input_data2 = await db.query(
      `INSERT INTO users (username,  password, first_name, last_name, phone, join_at)
            VALUES ('test2', $1, 'FirstName2', 'LastName2', 1234567890, current_timestamp) RETURNING *`,
      [hashedPassword2]
    );

    // Run the post test
    const response = await request(app)
      .post(`/messages`)
      .send({
        _token: auth.token,
        from_username: 'test',
        to_username: 'test2',
        body: 'Haha!! That was a great joke Test!!'
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      message: {
        from_username: 'test',
        to_username: 'test2',
        body: 'Haha!! That was a great joke Test!!'
      }
    });
  });
});

describe(`GET route for /users/:username/to`, async function() {
  test(`It should get messages sent to this user`, async function() {
    // Add second test user
    const hashedPassword2 = await bcrypt.hash('secret', 1);
    const input_data2 = await db.query(
      `INSERT INTO users (username,  password, first_name, last_name, phone, join_at)
            VALUES ('test2', $1, 'FirstName2', 'LastName2', 1234567890, current_timestamp) RETURNING *`,
      [hashedPassword2]
    );
    // have second user send message to first user
    await request(app)
      .post(`/messages`)
      .send({
        _token: auth.token,
        from_username: 'test2',
        to_username: 'test',
        body: 'Testing to get msgs sent to user2'
      });

    // Get messages sent to first user
    const response = await request(app)
      .get(`/users/test/to`)
      .send({ _token: auth.token });
    expect(response.statusCode).toBe(200);
    console.log(response.body);
    expect(response.body).toMatchObject({
      messages: [
        {
          body: 'Testing to get msgs sent to user2',
          from_user: {
            username: 'test',
            first_name: 'FirstName',
            last_name: 'LastName',
            phone: '1234567890'
          }
        }
      ]
    });
  });
});

describe(`GET route for /users/:username/from`, async function() {
  test(`It should get messages sent to this user`, async function() {
    // Add second test user
    const hashedPassword2 = await bcrypt.hash('secret', 1);
    const input_data2 = await db.query(
      `INSERT INTO users (username,  password, first_name, last_name, phone, join_at)
            VALUES ('test2', $1, 'FirstName2', 'LastName2', 1234567890, current_timestamp) RETURNING *`,
      [hashedPassword2]
    );
    // have first user send message to second user
    await request(app)
      .post(`/messages`)
      .send({
        _token: auth.token,
        from_username: 'test',
        to_username: 'test2',
        body: 'Test message'
      });

    // Get messages sent from first user
    const response = await request(app)
      .get(`/users/test/from`)
      .send({ _token: auth.token });
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      messages: [
        {
          body: 'Test message',
          to_user: {
            username: 'test2',
            first_name: 'FirstName2',
            last_name: 'LastName2',
            phone: '1234567890'
          }
        }
      ]
    });
  });
});

describe(`GET message by the id from /messages/id`, async function() {
  test(`It should return the message details`, async function() {
    //Add second user, // Add message // Get message by id
    // Add second test user
    const hashedPassword3 = await bcrypt.hash('secret', 1);
    const input_data3 = await db.query(
      `INSERT INTO users (username,  password, first_name, last_name, phone, join_at)
        VALUES ('test3', $1, 'FirstName3', 'LastName3', 1234567890, current_timestamp) RETURNING *`,
      [hashedPassword3]
    );

    // The first user send message to second user
    const response_test = await request(app)
      .post(`/messages`)
      .send({
        _token: auth.token,
        from_username: 'test',
        to_username: 'test3',
        body: 'Test message'
      });
    test_id = response_test.body.message.id;
  });

  const response = await request(app)
    .get(`/messages/${test_id}`)
    .send({ _token: auth.token });
  expect(response.statusCode).toBe(200);
  // expect(response_test.body).toMatchObject({
  //   message: {
  //     from_username: 'test',
  //     to_username: 'test2',
  //     body: 'Test message'
  //   }
  // });
});

//Teardown;
afterEach(async function() {
  // delete any data created by test
  await db.query('DELETE FROM messages');
  await db.query('DELETE FROM users');
  auth.token = '';
});

afterAll(async function() {
  // close db connection
  await db.end();
});
