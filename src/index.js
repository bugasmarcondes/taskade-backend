const { ApolloServer, gql } = require('apollo-server');
const dotenv = require('dotenv');
const { MongoClient, ObjectID } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const { DB_URI, DB_NAME, JWT_SECRET } = process.env;

const getToken = (user) =>
  jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30 days' });

const getUserFromToken = async (token, db) => {
  if (!token) return null;
  const tokenData = jwt.verify(token, JWT_SECRET);
  if (!tokenData?.id) {
    return null;
  }
  return await db.collection('Users').findOne({ _id: ObjectID(tokenData.id) });
};

const typeDefs = gql`
  type Query {
    myTaskLists: [TaskList!]!
  }

  type Mutation {
    signUp(input: SignUpInput!): AuthUser!
    signIn(input: SignInInput!): AuthUser!

    createTaskList(title: String!): TaskList!
  }

  input SignUpInput {
    email: String!
    password: String!
    name: String!
    avatar: String
  }

  input SignInInput {
    email: String!
    password: String!
  }

  type AuthUser {
    user: User!
    token: String!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
  }

  type TaskList {
    id: ID!
    createdAt: String!
    title: String!
    progress: Float!
    users: [User!]!
    todos: [ToDo!]!
  }

  type ToDo {
    id: ID!
    content: String!
    isCompleted: Boolean!
    taskList: TaskList!
  }
`;

const resolvers = {
  Query: {
    // parent, args, context, info
    myTaskLists: async (parent, args, { db, user }) => {
      if (!user) {
        throw new Error('Invalid credentials');
      }
      return await db
        .collection('TaskList')
        .find({ userIds: user._id })
        .toArray();
    },
  },
  Mutation: {
    signUp: async (_, { input }, { db }) => {
      const hashedPassword = bcrypt.hashSync(input.password);
      const newUser = {
        ...input,
        password: hashedPassword,
      };
      const result = await db.collection('Users').insert(newUser);
      const user = result.ops[0];
      return {
        user,
        token: getToken(user),
      };
    },
    signIn: async (_, { input }, { db }) => {
      const user = await db.collection('Users').findOne({ email: input.email });
      if (!user) {
        throw new Error('Invalid credentials');
      }
      const isPasswordCorrect = bcrypt.compareSync(
        input.password,
        user.password
      );
      if (!isPasswordCorrect) {
        throw new Error('Invalid credentials');
      }
      return {
        user,
        token: getToken(user),
      };
    },
    createTaskList: async (_, { title }, { db, user }) => {
      if (!user) throw new Error('Authentication error. Please sign in');
      const newTaskList = {
        title,
        createdAt: new Date().toISOString(),
        userIds: [user._id],
      };
      const result = await db.collection('TaskList').insert(newTaskList);
      return result.ops[0];
    },
  },
  User: {
    // _id, when it comes from the DB
    // id, when it comes from somewhere else
    // the first parameter is the root, which we are destructuring it here
    id: ({ _id, id }) => _id || id,
  },
  TaskList: {
    id: ({ _id, id }) => _id || id,
    progress: () => 0,
    users: async ({ userIds }, _, { db }) => {
      return await Promise.all(
        userIds.map((userId) => {
          return db.collection('Users').findOne({ _id: userId });
        })
      );
    },
  },
};

const start = async () => {
  const client = new MongoClient(DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  const db = client.db(DB_NAME);
  const context = {
    db,
  };

  // The ApolloServer constructor requires some parameters:
  // schema definition
  // set of resolvers
  // context that will be passed on every Query and Mutations
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const user = await getUserFromToken(req.headers.authorization, db);
      return { db, user };
    },
  });

  // The `listen` method launches a web server.
  server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
};

start();
