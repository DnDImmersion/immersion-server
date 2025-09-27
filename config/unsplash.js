const { createApi } = require('unsplash-js');

const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY,
});

module.exports = unsplash;