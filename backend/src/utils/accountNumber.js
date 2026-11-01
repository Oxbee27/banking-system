const { randomInt } = require("crypto");

const generateAccountNumber = () => {
  return `10${randomInt(100000000, 1000000000)}`;
};

module.exports = generateAccountNumber;
