const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const config = {
  logging: false,
};

const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt')

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const Note = conn.define("note", {
  text: STRING
});




const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

User.byToken = async (token) => {
  try {
    const user = await jwt.verify(token, process.env.JWT);
    if (user) {
      return await User.findByPk(user.userId, {include: [Note]});
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user.id }, process.env.JWT);
    return token;
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

User.beforeCreate( async (user) => {
  user.password = await bcrypt.hash(user.password, 10)
  return user
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const notes = [
    {text: "I'm baby meh whatever intelligentsia health goth"},
    {text: "Tumblr skateboard thundercats, cronut ethical affogato "},
    {text: "Pabst everyday carry lumbersexual, "}
  ]

  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  )

  await lucy.setNotes([note1, note2])
  await moe.setNotes(note3)

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

User.hasMany(Note);
Note.belongsTo(User);

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  },
};
