require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await mongoose.connection.collection('users').updateMany(
    {},
    { $set: { credits: 100 } }
  );
  console.log('Credits reset to 100!');
  process.exit();
});