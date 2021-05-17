const { ApolloServer, gql } = require('apollo-server');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

dotenv.config();

const typeDefs = gql`
  type Query {
    myTaskLists: [TaskList!]!
  }

  type Mutation {
    signUp(input: SignUpInput): AuthUser!
    signIn(input: SignInInput): AuthUser!
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
    myTaskLists: () => [],
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
        token: 'token',
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
        token: 'token',
      };
    },
  },
  User: {
    // _id, when it comes from the DB
    // id, when it comes from somewhere else
    // the first parameter is the root, which we are destructuring it here
    id: ({ _id, id }) => _id || id,
  },
};

const { DB_URI, DB_NAME } = process.env;

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
  const server = new ApolloServer({ typeDefs, resolvers, context });

  // The `listen` method launches a web server.
  server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
};

start();
