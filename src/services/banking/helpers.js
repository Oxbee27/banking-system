const { users } = require("../../database/user");

const getUserById = (userId) => {
    return users.find(
        user => user.id === userId
    );
};

module.exports = {
    getUserById
};